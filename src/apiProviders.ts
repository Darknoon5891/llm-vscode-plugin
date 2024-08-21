// src/apiProviders.ts
import axios from "axios";
import { RequestData, Message } from "./types";

export interface ApiProvider {
  getResponse(requestData: RequestData): Promise<string>;
}

export class OpenAICode implements ApiProvider {
  private apiKey: string;

  constructor(apiKey: string) {
    this.apiKey = apiKey;
  }

  async getResponse(requestData: RequestData): Promise<string> {
    const response = await axios.post(
      "https://api.openai.com/v1/chat/completions",
      {
        model: requestData.model, // e.g., "gpt-4o"
        max_tokens: requestData.max_tokens, // e.g., 1024
        messages: requestData.messages, // e.g., [{ "role": "user", "content": "Hello, world" }]
      },
      {
        headers: {
          Authorization: `Bearer ${this.apiKey}`, // Correctly use template literals for string interpolation
          "Content-Type": "application/json",
        },
      }
    );

    return response.data.choices[0].message.content;
  }
}

export class AnthropicCode implements ApiProvider {
  private apiKey: string;

  constructor(apiKey: string) {
    this.apiKey = apiKey;
  }

  async getResponse(requestData: RequestData): Promise<string> {
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
          console.error(`Response data: ${JSON.stringify(error.response)}`);
        } else if (error.request) {
          // Request was made but no response was received
          console.error(`No response received: ${error.request}`);
        } else {
          // Something happened while setting up the request
          console.error(`Axios error setting up request: ${error.message}`);
        }
      }

      // Optionally rethrow the error if you want the calling code to handle it
      throw error;
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
