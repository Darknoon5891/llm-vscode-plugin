import { MessageParam } from "@anthropic-ai/sdk/resources/index.mjs";
import { RequestMessageParam } from "./types";
import * as vscode from "vscode";

// Helper function to convert messages to the format expected by the Anthropic API
export function convertMessagesAnthropic(
  messages: RequestMessageParam[]
): MessageParam[] {
  let convertedMessages: MessageParam[] = [];

  const combinedContent = insertAtMarker(
    messages[0].content,
    messages[1].content
  );
  convertedMessages = [{ role: "user", content: combinedContent }];
  return convertedMessages;
}

/**
 * Gets the amount of whitespace in front of the current cursor position on the current line.
 * @returns The number of leading whitespace characters.
 */
export function getLeadingWhitespace(): string {
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

export function getFocusedFileType(): string | undefined {
  // Get the active text editor
  const activeEditor = vscode.window.activeTextEditor;

  if (activeEditor) {
    // Get the language identifier (file type) of the focused file
    const languageId = activeEditor.document.languageId;
    return languageId;
  } else {
    // If no editor is active, return undefined
    vscode.window.showWarningMessage("No file is currently focused.");
    return undefined;
  }
}

function insertAtMarker(input: string, insertString: string): string {
  const marker = "{{MARKER}}";

  // Find the marker's position
  const markerPosition = input.indexOf(marker);

  // If the marker is found, replace it with the insertString
  if (markerPosition !== -1) {
    return input.replace(marker, insertString);
  }

  // If the marker isn't found, return the original string
  return input;
}
