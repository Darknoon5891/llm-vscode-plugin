import { MessageParam } from "@anthropic-ai/sdk/resources/index.mjs";
import {
  ChatCompletionMessage,
  ChatCompletionMessageParam,
} from "openai/resources/index.mjs";

declare global {
  interface Global {
    DEBUG: boolean;
  }

  var DEBUG: Global["DEBUG"];
}

export interface RequestMessageParam {
  role: string; // e.g., "user", "system", "assistant"
  content: string; // The actual content of the message
}

export interface RequestData {
  model: string; // The model to use, e.g., "gpt-3.5-turbo"
  max_tokens: number; // The maximum number of tokens in the response
  messagesForRequest: RequestMessageParam[]; // An array of Message objects
}

export interface OpenAIRequestData {
  model: string; // The model to use, e.g., "gpt-3.5-turbo"
  max_tokens: number; // The maximum number of tokens in the response
  messagesForRequest: ChatCompletionMessageParam[]; // An array of Message objects
}

export interface AnthropicRequestData {
  model: string; // The model to use, e.g., "gpt-3.5-turbo"
  max_tokens: number; // The maximum number of tokens in the response
  messagesForRequest: MessageParam[]; // An array of Message objects
}

export interface LineRemovalInfo {
  cleanedCode: string;
  linesRemovedBefore: number;
  linesRemovedAfter: number;
}

export interface CommentBoundaries {
  start: number;
  end: number;
  type: "single-line" | "block" | null;
}

export interface CodeParsingResult {
  singleline: string | null;
  languageId: string | null;
  multiline: string[] | null;
}
