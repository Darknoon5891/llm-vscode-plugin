// src/apiProviders.ts
import {
  AnthropicRequestData,
  OpenAIRequestData,
  RequestData,
  RequestMessageParam,
} from "./types";
import * as helpers from "./helpers";
import * as vscode from "vscode";

import Anthropic from "@anthropic-ai/sdk";

import OpenAI from "openai";
import { ChatCompletionMessageParam } from "openai/resources/index.mjs";
import { resolve } from "path";
import { getLeadingWhitespace } from "./helpers";
import { resourceUsage } from "process";
import { request } from "http";
import { Stream } from "openai/streaming.mjs";

export async function makeStreamingRequestAnthropic(
  apiKey: string,
  requestData: RequestData
): Promise<boolean> {
  const editor = vscode.window.activeTextEditor;
  if (!editor) {
    console.error("No active text editor found");
    return false;
  }

  // Get the leading whitespace for the current line
  let eolspace = helpers.getLeadingWhitespace();

  // Convert the request data to the format expected by the Anthropic API
  let requestDataAnthropic: AnthropicRequestData = {
    model: requestData.model,
    max_tokens: requestData.max_tokens,
    system_prompt: requestData.messagesForRequest[0].content as string,
    messages_for_request: helpers.convertMessagesAnthropic(
      requestData.workspace_code,
      requestData.messagesForRequest
    ),
  };

  if (DEBUG === true) {
    console.log("Request Data Anthropic:", requestDataAnthropic);
  }

  // Initialize the client with the API key
  const client = new Anthropic({ apiKey });
  let fullContent: string = "";
  try {
    // Start streaming response from the API
    const stream = await client.messages.create({
      model: requestDataAnthropic.model, // e.g., "claude-3-5-sonnet-20240620"
      system: requestDataAnthropic.system_prompt, // The system messages
      max_tokens: requestDataAnthropic.max_tokens, // e.g., 1024
      messages: requestDataAnthropic.messages_for_request, // The conversation or prompts
      stream: true, // Enable streaming
    });

    for await (const messageStreamEvent of stream) {
      if (messageStreamEvent.type === "content_block_delta") {
        const delta = messageStreamEvent.delta;
        if ("text" in delta) {
          const messageStreamEventDelta: Anthropic.Messages.TextDelta = delta;
          let content = messageStreamEventDelta.text;
          fullContent += content;

          if (content.includes("\n")) {
            // regex to match the \n and replace it with content + \n + eolspace
            // Ensure it replaces all occurrences of \n as two newlines could appear in one message
            content = content.replaceAll("\n", `\n${eolspace}`);
          }
          // Insert the accumulated content
          await editor.edit((editBuilder) => {
            editBuilder.insert(editor.selection.active, content);
          });
        }
      }

      if (messageStreamEvent.type === "message_stop") {
        if (DEBUG === true) {
          console.log("Full Response:\n", fullContent);
        }
      }
    }
  } catch (error) {
    console.error(
      `Error occurred during streaming: ${
        error instanceof Error ? error.message : "Unknown error"
      }`
    );
    throw error; // Re-throw the error for further handling if needed
  }

  return true;
}

export async function makeStreamingRequestOpenAI(
  apiKey: string,
  requestData: RequestData
): Promise<boolean> {
  const editor = vscode.window.activeTextEditor;
  if (!editor) {
    console.error("No active text editor found");
    return false;
  }

  const eolSpace = getLeadingWhitespace();
  let accumulatedContent = "";
  const insertInterval = 50; // Number of characters before inserting content
  let eolFlag = false; // End-of-line flag
  let stream: Stream<OpenAI.Chat.Completions.ChatCompletionChunk>; // Stream object

  // Initialize the OpenAI client with the provided API key
  const client = new OpenAI({
    apiKey: apiKey,
  });

  let openAIRequestData = {
    model: requestData.model,
    max_tokens: requestData.max_tokens,
    messages: helpers.convertMessagesOpenAi(
      requestData.workspace_code,
      requestData.messagesForRequest,
      requestData.model
    ),
  };

  // o1 does not currently support the system message or max_tokens or streaming
  if (requestData.model === "o1-mini" || requestData.model === "o1-preview") {
    try {
      // Call the API using the OpenAI SDK
      const response = await client.chat.completions.create({
        model: openAIRequestData.model,
        messages: openAIRequestData.messages,
        max_completion_tokens: openAIRequestData.max_tokens,
        stream: false,
      });

      let content: string = response.choices[0].message.content ?? "";
      console.log("Response:\n", content);

      // correct white space issue for o1 models
      // const leadingwhitespace = helpers.getLeadingWhitespace();
      // content = content.replace(/\n/g, `\n${leadingwhitespace}`);

      if (content) {
        await editor.edit((editBuilder) => {
          editBuilder.insert(editor.selection.active, content);
        });
      }

      console.log("OpenAI API o1 model completed successfully.");
      return true;
    } catch (error) {
      console.error("Error making request to OpenAI API o1 model:", error);
      return false;
    }
  }

  // All other OpenAI models support streaming
  else {
    try {
      // Call the streaming API using the OpenAI SDK
      stream = await client.chat.completions.create({
        model: openAIRequestData.model,
        messages: openAIRequestData.messages,
        max_tokens: openAIRequestData.max_tokens,
        stream: true,
      });

      // Read the stream response as it arrives in chunks
      for await (const chunk of stream) {
        const content = chunk.choices[0].delta?.content || ""; // Extract the content chunk

        if (eolFlag && content) {
          // Add leading whitespace after a newline
          const indentedContent = content
            .split("\n")
            .map((line: string, index: number) => {
              if (index === 0) {
                return eolSpace + line;
              }
              return line;
            })
            .join("\n");

          accumulatedContent += indentedContent;
          eolFlag = false;
        } else {
          accumulatedContent += content;
        }

        if (content.endsWith("\n")) {
          eolFlag = true; // Set flag when content ends with a newline
        }

        // Insert accumulated content after it exceeds the interval
        if (accumulatedContent.length >= insertInterval) {
          await editor.edit((editBuilder) => {
            editBuilder.insert(editor.selection.active, accumulatedContent);
          });
          accumulatedContent = ""; // Clear buffer after insertion
        }
      }

      // Insert any remaining content after the stream ends
      if (accumulatedContent) {
        await editor.edit((editBuilder) => {
          editBuilder.insert(editor.selection.active, accumulatedContent);
        });
      }

      console.log("Streaming completed successfully.");
      return true;
    } catch (error) {
      console.error("Error making request to OpenAI API:", error);
      return false;
    }
  }
}
