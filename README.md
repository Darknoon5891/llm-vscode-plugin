# llm-vscode-plugin README

Simple Multi-LLM Workspace Integration into VSCode.
<br>
What's Cursor?

## Features

Change LLM provider and make API Calls as required.
The Extension will send the code currently in focus or the entire document if required.
Write comments explaining what you want or your current situation and the LLM will write code or comments directly into the open document.

## Commands

This extension provides the following commands:

- extension.selectOpenAICode: Selects OpenAI as the AI provider for code generation.
- extension.selectAnthropicCode: Selects Anthropic as the AI provider for code generation.
- extension.selectAnthropicHelp: Selects OpenAI as the AI provider for help notes.
- extension.selectOpenAIHelp: Selects Anthropic as the AI provider for help and notes.
- extension.sendToAPI: Sends the code in the active editor to the currently selected AI provider.

See package.json for keyboard shortcuts and you can just change them as you wish.

## Supported Models:

<b>OpenAI:</b>

- GPT-4o
- GPT-4.5
- o1
- o3-mini

<b>Anthropic:</b>

- Claude 3.5 Sonnet
- Claude 3.5 Sonnet v2
- Claude 3.7 Sonnet

Additional models may work however have not been tested.
