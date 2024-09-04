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
    messagesForRequest: helpers.convertMessagesAnthropic(
      requestData.messagesForRequest
    ),
  };

  // Initialize the client with the API key
  const client = new Anthropic({ apiKey });
  let fullContent: string = "";
  try {
    // Start streaming response from the API
    const stream = await client.messages.create({
      model: requestData.model, // e.g., "claude-3-5-sonnet-20240620"
      max_tokens: requestData.max_tokens, // e.g., 1024
      messages: requestDataAnthropic.messagesForRequest, // The conversation or prompts
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
            content = content.replace("\n", `\n${eolspace}`);
            console.log("Content with eolspace:\n", content);
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

  // Get the leading whitespace for the current line
  let eolSpace = helpers.getLeadingWhitespace();
  let fullResponse = "";
  let buffer = ""; // Buffer for accumulating chunks
  let accumulatedContent = ""; // Buffer to accumulate content before insertion
  let insertInterval = 50; // Number of chunks to accumulate before inserting
  let fullContent = ""; // Buffer to accumulate full content
  let eolFlag = false; // End-Of-Line flag to track if the previous chunk ended with a newline

  // Initialize the client with the API key
  const client = new OpenAI({
    apiKey: apiKey,
  });

  let openAIRquestData = {
    model: requestData.model,
    max_tokens: requestData.max_tokens,
    messagesForRequest:
      requestData.messagesForRequest as ChatCompletionMessageParam[],
  };

  const stream = await client.beta.chat.completions
    .stream({
      messages: openAIRquestData.messagesForRequest,
      model: openAIRquestData.model,
      max_tokens: openAIRquestData.max_tokens,
      stream: true,
    })
    .on("content", async (chunk) => {
      buffer += chunk.toString(); // Add the chunk to the buffer

      try {
        let content = chunk;
        if (eolFlag && content) {
          // Add missing spaces to the start of the next chunk, only after the flag was set
          content = content
            .split("\n")
            .map((line: string, index: number) => {
              // Only indent if it's the first line after the flag was set
              if (index === 0) {
                return eolSpace + line;
              }
              return line;
            })
            .join("\n");
          eolFlag = false; // Reset the flag after adding spaces
        }

        // Check if the current content ends with a newline to set the EOL flag
        if (content && content.endsWith("\n")) {
          eolFlag = true; // Set the flag if the content ends with a newline
        }

        if (content) {
          accumulatedContent += content;

          if (accumulatedContent.length > insertInterval) {
            fullContent += accumulatedContent;
            // Insert the accumulated content
            await editor.edit((editBuilder) => {
              editBuilder.insert(editor.selection.active, accumulatedContent);
            });
            accumulatedContent = ""; // Reset accumulated content
          }
        }
      } catch (error) {
        return false; // Handle JSON parse errors
      }
    })
    .on("error", (error: Error) => {
      console.error(error);
      return false;
    });

  return true;
}
