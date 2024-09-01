// src/apiProviders.ts
import * as vscode from "vscode";
import axios from "axios";
import { RequestData, Message } from "./types";
import { ErrorCallback } from "typescript";

export interface ApiProvider {
  getResponse(requestData: RequestData): Promise<boolean | undefined>;
}

export class OpenAICode implements ApiProvider {
  private apiKey: string;

  constructor(apiKey: string) {
    this.apiKey = apiKey;
  }

  async getResponse(requestData: RequestData): Promise<boolean | undefined> {
    const response = await axios.post(
      "https://api.openai.com/v1/chat/completions",
      {
        model: requestData.model, // e.g., "gpt-4o"
        max_tokens: requestData.max_tokens, // e.g., 1024
        messages: requestData.messages, // e.g., [{ "role": "user", "content": "Hello, world" }]
        stream: true,
      },
      {
        headers: {
          Authorization: `Bearer ${this.apiKey}`,
          "Content-Type": "application/json",
        },
        responseType: "stream",
      }
    );

    return new Promise((resolve, reject) => {
      let fullResponse = "";
      let buffer = ""; // Buffer for accumulating chunks

      response.data.on("data", (chunk: Buffer) => {
        buffer += chunk.toString(); // Add the chunk to the buffer

        let boundary = buffer.indexOf("\n\n"); // Look for the boundary between JSON objects

        while (boundary !== -1) {
          const jsonStr = buffer.slice(0, boundary).trim(); // Extract the JSON string

          if (jsonStr.startsWith("data:")) {
            const data = jsonStr.replace(/^data: /, "");
            if (data !== "[DONE]") {
              try {
                const parsed = JSON.parse(data);
                const content = parsed.choices[0].delta.content;
                if (content) {
                  fullResponse += content;
                }
              } catch (error) {
                return reject(error); // Handle JSON parse errors
              }
            }
          }

          buffer = buffer.slice(boundary + 2); // Remove processed data from the buffer
          boundary = buffer.indexOf("\n\n"); // Look for the next boundary
        }
      });

      response.data.on("end", () => {
        console.log(fullResponse);
        resolve(true); // Resolve the full response when the stream
      });

      response.data.on("error", (error: any) => {
        reject(error); // Handle any errors during streaming
      });
    });
  }
}

export class AnthropicCode implements ApiProvider {
  private apiKey: string;

  constructor(apiKey: string) {
    this.apiKey = apiKey;
  }

  async getResponse(requestData: RequestData): Promise<boolean | undefined> {
    try {
      requestData.messages = convertMessages(requestData.messages);

      const response = await axios.post(
        "https://api.anthropic.com/v1/messages",
        {
          model: requestData.model, // e.g., "claude-3-5-sonnet-20240620"
          max_tokens: requestData.max_tokens, // e.g., 1024
          messages: requestData.messages, // e.g., [{ "role": "user", "content": "Hello, world" }]
        },
        {
          headers: {
            "x-api-key": this.apiKey, // Your Anthropic API key
            "anthropic-version": "2023-06-01", // API version
            "Content-Type": "application/json",
          },
        }
      );

      return response.data.content[0].text;
    } catch (error) {
      if (axios.isAxiosError(error)) {
        // Axios-specific error handling
        console.error(`HTTP error: ${error.message}`);

        if (error.response) {
          // Server responded with a status code outside the 2xx range
          if (DEBUG === true) {
            console.error(`Response data: ${JSON.stringify(error.response)}`);
          }
        } else if (error.request) {
          // Request was made but no response was received
          if (DEBUG === true) {
            console.error(`No response received: ${error.request}`);
          }
        } else {
          // Something happened while setting up the request
          if (DEBUG === true) {
            console.error(`Axios error setting up request: ${error.message}`);
          }
        }
        throw error; // Re-throw the error to be handled by the caller
      }
    }
  }
}

// Helper function to convert messages to the format expected by the Anthropic API
function convertMessages(messages: Message[]): Message[] {
  let systemPrompt = "";
  const convertedMessages: Message[] = [];

  messages.forEach((message) => {
    if (message.role === "system") {
      // Accumulate system prompts
      systemPrompt += `SYSTEM_PROMPT: ${message.content}\n`;
    } else if (message.role === "user") {
      // Prepend system prompt to the user message and reset system prompt
      const combinedContent = `${systemPrompt}USER_MESSAGE: ${message.content}`;
      convertedMessages.push({ role: "user", content: combinedContent });
      systemPrompt = ""; // Reset the system prompt after it's been used
    }
  });

  return convertedMessages;
}
