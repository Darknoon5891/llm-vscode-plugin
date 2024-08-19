export interface Message {
  role: string; // e.g., "user", "system", "assistant"
  content: string; // The actual content of the message
}

export interface RequestData {
  model: string; // The model to use, e.g., "gpt-3.5-turbo"
  max_tokens: number; // The maximum number of tokens in the response
  messages: Message[]; // An array of Message objects
}
