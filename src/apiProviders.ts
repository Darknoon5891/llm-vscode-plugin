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
      let accumulatedContent = ""; // Buffer to accumulate content before insertion
      const editor = vscode.window.activeTextEditor;
      let insertInterval = 50; // Number of chunks to accumulate before inserting
      let fullContent = ""; // Buffer to accumulate full content

      let eolFlag = false; // End-Of-Line flag to track if the previous chunk ended with a newline
      let eolSpace = getLeadingWhitespace(); // Buffer to accumulate spaces for EOL indentation

      if (!editor) {
        return reject("No active text editor found");
      }

      response.data.on("data", (chunk: Buffer) => {
        buffer += chunk.toString(); // Add the chunk to the buffer

        let boundary = buffer.indexOf("\n\n"); // Look for the boundary between JSON objects

        while (boundary !== -1) {
          const jsonStr = buffer.slice(0, boundary); // Extract the JSON string

          if (jsonStr.startsWith("data:")) {
            const data = jsonStr.replace(/^data: /, "");
            if (data !== "[DONE]") {
              try {
                const parsed = JSON.parse(data);
                let content = parsed.choices[0].delta.content;

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
                    editor.edit((editBuilder) => {
                      editBuilder.insert(
                        editor.selection.active,
                        accumulatedContent
                      );
                    });
                    accumulatedContent = ""; // Reset accumulated content
                  }
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
        if (accumulatedContent.length > 0) {
          // Insert any remaining accumulated content
          editor.edit((editBuilder) => {
            editBuilder.insert(editor.selection.active, accumulatedContent);
          });
        }
        console.log(fullContent);
        resolve(true); // Resolve the full response when the stream ends
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
          stream: true,
        },
        {
          headers: {
            "x-api-key": this.apiKey, // Your Anthropic API key
            "anthropic-version": "2023-06-01", // API version
            "Content-Type": "application/json",
          },
          responseType: "stream",
        }
      );

      let buffer = "";
      let accumulatedContent = "";
      let fullContent = "";
      let eolFlag = false;
      let eolSpace = getLeadingWhitespace(); // Define the spaces to add when eolFlag is true
      const insertInterval = 100; // Adjust this as needed
      const editor = vscode.window.activeTextEditor;

      if (!editor) {
        return Promise.reject("No active editor");
      }

      response.data.on("data", (chunk: Buffer) => {
        buffer += chunk.toString(); // Add the chunk to the buffer

        let boundary = buffer.indexOf("\n\n"); // Look for the boundary between events

        while (boundary !== -1) {
          const eventStr = buffer.slice(0, boundary); // Extract the event string
          buffer = buffer.slice(boundary + 2); // Remove processed event from buffer
          boundary = buffer.indexOf("\n\n"); // Look for the next boundary

          const [eventType, eventData] = eventStr.split("\n");

          if (eventType.startsWith("event:")) {
            const type = eventType.replace("event: ", "").trim();

            if (type === "content_block_delta" || type === "message_delta") {
              const data = eventData.replace("data: ", "");
              try {
                const parsed = JSON.parse(data);

                if (type === "content_block_delta") {
                  let content = parsed.delta.text;

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

                  // WE ARE CLOSE THIS IS NOT WORKING THOUGH - TAKE A LOOK AT THE CHUNKS
                  if (content && content.endsWith("\n")) {
                    eolFlag = true; // Set the flag if the content ends with a newline
                  }

                  if (content) {
                    accumulatedContent += content;

                    if (accumulatedContent.length > insertInterval) {
                      fullContent += accumulatedContent;
                      // Insert the accumulated content
                      editor.edit((editBuilder) => {
                        editBuilder.insert(
                          editor.selection.active,
                          accumulatedContent
                        );
                      });
                      accumulatedContent = ""; // Reset accumulated content
                    }
                  }
                }

                if (
                  type === "message_delta" &&
                  parsed.delta.stop_reason === "end_turn"
                ) {
                  // Handle the end of the message or other finalizing actions here if needed
                }
              } catch (error) {
                return Promise.reject(error); // Handle JSON parse errors
              }
            }
          }
        }
      });

      response.data.on("end", () => {
        if (accumulatedContent.length > 0) {
          // Insert any remaining accumulated content
          editor.edit((editBuilder) => {
            editBuilder.insert(editor.selection.active, accumulatedContent);
          });
        }
        console.log(fullContent);
        return Promise.resolve(true); // Resolve the full response when the stream ends
      });

      response.data.on("error", (error: any) => {
        return Promise.reject(error); // Handle any errors during streaming
      });

      return new Promise((resolve, reject) => {
        response.data.on("end", resolve);
        response.data.on("error", reject);
      });
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
/**
 * Gets the amount of whitespace in front of the current cursor position on the current line.
 * @returns The number of leading whitespace characters.
 */
function getLeadingWhitespace(): string {
  // Get the active text editor
  const editor = vscode.window.activeTextEditor;

  if (!editor) {
    // If there is no active editor, return undefined
    return " ".repeat(4);
  }

  // Get the current cursor position
  const cursorPosition = editor.selection.active;
  let leadingWhitespaceString: string;

  // Get the line text at the cursor position
  const lineText = editor.document.lineAt(cursorPosition.line).text;

  // Calculate the number of leading whitespace characters
  const leadingWhitespace = lineText.match(/^\s*/)?.[0].length || 0;

  leadingWhitespaceString = " ".repeat(leadingWhitespace);

  return leadingWhitespaceString;
}
