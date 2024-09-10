import * as ts from "typescript";
import * as vscode from "vscode";
import { CommentBoundaries, LineRemovalInfo } from "./types";
import { CONNREFUSED } from "dns";

const commentMapping: {
  [key: string]: { singleline: string | null; multiline: string[] | null };
} = {
  python: {
    singleline: "#",
    multiline: ['"""', '"""'],
  },
  javascript: {
    singleline: "//",
    multiline: ["/*", "*/"],
  },
  typescript: {
    singleline: "//",
    multiline: ["/*", "*/"],
  },
  java: {
    singleline: "//",
    multiline: ["/*", "*/"],
  },
  c: {
    singleline: "//",
    multiline: ["/*", "*/"],
  },
  cpp: {
    singleline: "//",
    multiline: ["/*", "*/"],
  },
  csharp: {
    singleline: "//",
    multiline: ["/*", "*/"],
  },
  ruby: {
    singleline: "#",
    multiline: ["=begin", "=end"],
  },
  php: {
    singleline: "//",
    multiline: ["/*", "*/"],
  },
  html: {
    singleline: null, // HTML does not have a single-line comment
    multiline: ["<!--", "-->"],
  },
  css: {
    singleline: null, // CSS does not have a single-line comment
    multiline: ["/*", "*/"],
  },
  bash: {
    singleline: "#",
    multiline: null, // Bash does not have a multiline comment syntax
  },
  r: {
    singleline: "#",
    multiline: null, // R does not have a multiline comment syntax
  },
  swift: {
    singleline: "//",
    multiline: ["/*", "*/"],
  },
  go: {
    singleline: "//",
    multiline: ["/*", "*/"],
  },
  kotlin: {
    singleline: "//",
    multiline: ["/*", "*/"],
  },
};

export function processPrompt(editor: vscode.TextEditor): string | undefined {
  if (!editor) {
    vscode.window.showErrorMessage("No active editor found.");
    return;
  }

  const document = editor.document;
  const documentText = document.getText();
  const cursorPosition = editor.selection.active;
  const languageId = editor.document.languageId;
  const stringPadding = "\r\n".repeat(3);

  const editorCommentMappings = getEditorLanguageComments(editor, languageId);

  // we remove whitespace no only for the comment detection but also to optimise the API call
  const cleanedCodeInfo = removeWhitespaceLines(
    documentText,
    cursorPosition.line
  );

  let cleanedCode = cleanedCodeInfo.cleanedCode;
  let newCursorPosition =
    cursorPosition.line - cleanedCodeInfo.linesRemovedBefore;

  // Tell LLM the line to find its instructions
  cleanedCode +=
    stringPadding +
    `Follow the instructions found on line: ${newCursorPosition.toString()} of the code.`;

  // directly insert the code into the marker here and return the prompt

  if (DEBUG === true) {
    console.log("Cleaned code:", cleanedCode);
  }
  return cleanedCode;

  // Helper function to remove whitespace lines from the code
  function removeWhitespaceLines(
    code: string,
    targetLine: number
  ): LineRemovalInfo {
    // Step 1: Split the code into lines
    const lines = code.split("\n");

    let linesRemovedBefore = 0;
    let linesRemovedAfter = 0;

    // Step 2: Initialize a new array to hold non-whitespace lines
    const nonWhitespaceLines: string[] = [];

    // Step 3: Iterate through the lines and filter out empty lines
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      if (line.trim() !== "") {
        nonWhitespaceLines.push(line);
      } else {
        if (i < targetLine) {
          linesRemovedBefore++;
        } else if (i > targetLine) {
          linesRemovedAfter++;
        }
      }
    }

    // Step 4: Reconstruct the code string from the filtered lines
    const cleanedCode = nonWhitespaceLines.join("\n");

    // Return the cleaned code along with the number of lines removed before and after the target line
    return {
      cleanedCode,
      linesRemovedBefore,
      linesRemovedAfter,
    };
  }

  function getEditorLanguageComments(
    editor: vscode.TextEditor,
    languageId: string
  ): {
    singleline: string | null;
    multiline: string[] | null;
  } {
    // Look up the comment syntax for the current language
    const commentSyntax = commentMapping[languageId];

    if (commentSyntax) {
      return commentSyntax;
    } else {
      console.log(
        `No comment syntax mapping found for language: ${languageId}`
      );
      return { singleline: "//", multiline: ["/*", "*/"] };
    }
  }

  function removeStringRange(
    input: string,
    start: number,
    end: number
  ): string {
    if (start < 0 || end > input.length || start > end) {
      throw new Error("Invalid start or end indices.");
    }

    const before = input.slice(0, start);
    const after = input.slice(end);

    return before + after;
  }
}
