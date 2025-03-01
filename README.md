# llm-vscode-plugin README

Simple Multi-LLM Workspace Integration into VSCode.
<br>
What's Cursor?

## Features

Change LLM provider and make API Calls as required.
Write comments explaining what you want or your current situation and the LLM will write code or comments directly into the open document.

## Commands

This extension provides the following commands:

- extension.selectOpenAICode: Selects OpenAI as the AI provider for code generation.
- extension.selectAnthropicCode: Selects Anthropic as the AI provider for code generation.
- extension.selectxAICode: Selects xAI as the provider for the code generation
- extension.sendToAPI: Sends the code in the active editor to the currently selected AI provider.

See package.json for keyboard shortcuts and you can just change them as you wish.

## Supported Models:

<b>OpenAI:</b>

- GPT-4o
- o1
- o3-mini
- GPT-4.5

<b>Anthropic:</b>

- Claude 3.5 Sonnet
- Claude 3.5 Sonnet v2
- Claude 3.7 Sonnet

<b>xAI</b>

- Gork
- Gork 2

Additional models from these providers may work however have not been tested.
