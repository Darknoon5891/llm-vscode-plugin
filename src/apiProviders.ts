// src/apiProviders.ts
import axios from "axios";
import { RequestData, Message } from "./types";

export interface ApiProvider {
  getResponse(requestData: RequestData): Promise<string>;
}

export class OpenAIHelp implements ApiProvider {
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

export class AnthropicHelp implements ApiProvider {
  private apiKey: string;

  constructor(apiKey: string) {
    this.apiKey = apiKey;
  }

  async getResponse(requestData: RequestData): Promise<string> {
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

    return response.data.content.text;
  }
}
