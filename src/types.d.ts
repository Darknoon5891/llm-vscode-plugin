// =========================================================
// types.ts (or types.d.ts if it's just declarations)
// =========================================================
/**
 * MODULE-SCOPED TYPES FILE
 *
 * Purpose:
 * - Contains types, interfaces, etc. that are part of your module system
 * - Must be explicitly imported where used
 * - If .ts: Can contain implementation code and will generate JavaScript
 * - If .d.ts: Contains only declarations, no implementation, no JavaScript output
 *
 * Usage:
 * - Use export for types you want to make available
 * - Import using: import { TypeName } from "./types";
 * - Do NOT declare global variables here (use globals.d.ts instead)
 */

import { MessageParam } from "@anthropic-ai/sdk/resources/index.mjs";
import {
  ChatCompletionMessage,
  ChatCompletionMessageParam,
} from "openai/resources/index.mjs";

declare const DEBUG: boolean;

export interface RequestMessageParam {
  role: string; // e.g., "user", "system", "assistant"
  content: string; // The actual content of the message
}

export interface RequestData {
  model: string; // The model to use, e.g., "gpt-3.5-turbo"
  max_tokens: number; // The maximum number of tokens in the response
  messagesForRequest: RequestMessageParam[]; // An array of Message objects
  workspace_code: string; // The code in the workspace
}

export interface OpenAIRequestData {
  model: string; // The model to use, e.g., "gpt-3.5-turbo"
  max_tokens: number; // The maximum number of tokens in the response
  messagesForRequest: ChatCompletionMessageParam[]; // An array of Message objects
}

export interface AnthropicRequestData {
  model: string; // The model to use, e.g., "gpt-3.5-turbo"
  max_tokens: number; // The maximum number of tokens in the response
  messages_for_request: MessageParam[]; // An array of Message objects
  system_prompt: string; // The system prompt
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
