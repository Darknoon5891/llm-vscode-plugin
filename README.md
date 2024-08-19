# llm-vscode-plugin README

Simple Multi-LLM Workspace Integration into VSCode

## Features

Change LLM Provider and Make API Calls as required.
The Extension will send the code currently in focus or the entire document if specified.
Write comments explaining what you want or your current situation and the LLM will write code or comments directly into the open document.

## Commands

This extension provides the following commands:

- extension.selectOpenAI: Selects OpenAI as the AI provider. This command can be triggered via the Ctrl+Alt+O (Windows/Linux) or Cmd+Alt+O (macOS) shortcut.
- extension.selectAnthropic: Selects Anthropic as the AI provider. This command can be triggered via the Ctrl+Alt+N (Windows/Linux) or Cmd+Alt+N (macOS) shortcut.
- extension.sendToAPI: Sends the code in the active editor to the currently selected AI provider. This command can be triggered via the Ctrl+Alt+X (Windows/Linux) or Cmd+E (macOS) shortcut
