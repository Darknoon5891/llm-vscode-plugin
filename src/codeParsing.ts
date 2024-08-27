import * as ts from "typescript";
import * as vscode from "vscode";
import { CommentBoundaries, LineRemovalInfo } from "./types";

const commentMapping: {
  [key: string]: { singleline: string | null; multiline: string[] | null };
} = {
  python: {
    singleline: "#",
    multiline: ["'''", '"""'],
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

export function moveCommentsToBottom(
  editor: vscode.TextEditor
): string | undefined {
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
  const newCursorPosition =
    cursorPosition.line - cleanedCodeInfo.linesRemovedBefore;

  const commentRange = detectCommentBoundaries(
    cleanedCode,
    newCursorPosition,
    editorCommentMappings.singleline,
    editorCommentMappings.multiline,
    languageId
  );

  if (!commentRange) {
    // if we don't find a comment, just return all the code
    return document.getText();
  }

  // Extract the comment text from the code
  let commentText = cleanedCode.slice(commentRange.start, commentRange.end);

  // Remove the extracted comment from the code
  cleanedCode = removeStringRange(
    cleanedCode,
    commentRange.start,
    commentRange.end
  );

  commentText = commentText
    .split("\n")
    .map((line) => line.trimStart())
    .join("\n");

  // Append the comment to the end of the code
  cleanedCode += stringPadding + commentText;

  console.log("Cleaned code:", cleanedCode);
  return cleanedCode;
}

function detectCommentBoundaries(
  code: string,
  currentLine: number,
  singleLineIdentifier: string | null,
  blockCommentIdentifier: string[] | null,
  languageId: string
): CommentBoundaries | null {
  const lines = code.split("\n");
  let characterCount = 0;

  // // Find the current line based on the position
  // for (let i = 0; i < lines.length; i++) {
  //   characterCount += lines[i].length + 1; // +1 for the newline character
  //   if (characterCount > position) {
  //     currentLine = i;
  //     break;
  //   }
  // }

  // Step 1: Determine if inside a single-line comment block
  // We have added -1 here as a dirty fix as when the whitespace is remove the current line is also included in the whitespace so while this works
  // if the cursor is on the first line of the comment block, it will not work if the cursor is on the last line of the comment block
  let startLine = currentLine - 1;
  let endLine = currentLine;

  if (singleLineIdentifier) {
    // Move upwards to find the start of the comment block
    while (startLine > 0) {
      if (lines[startLine].trimStart().startsWith(singleLineIdentifier)) {
        startLine--;
      } else {
        startLine++;
        break;
      }
    }

    // Move downwards to find the end of the comment block
    while (endLine < lines.length - 1) {
      if (lines[endLine + 1].trimStart().startsWith(singleLineIdentifier)) {
        endLine++;
      } else {
        break;
      }
    }

    // Detect if EOF is reached
    if (endLine === lines.length - 1) {
      // If the loop reaches the last line of the file, assume the cursor was already at the bottom of the comment
      // Use the current endLine as the end of the comment block
      endLine = lines.length - 1;
    }

    // If the start and end lines are different or the current line is a single-line comment, return the comment boundaries
    if (
      startLine !== endLine ||
      lines[currentLine].trimStart().startsWith(singleLineIdentifier)
    ) {
      const start =
        lines.slice(0, startLine).join("\n").length + (startLine > 0 ? 1 : 0);
      const end = lines.slice(0, endLine + 1).join("\n").length;
      return { start, end, type: "single-line" };
    }
  }

  // Special case for python comments
  if (blockCommentIdentifier && languageId === "python") {
    // If the language is python we need to process the block comments differently as the start and end identifiers could be different
    for (const identifier of blockCommentIdentifier) {
      const before = code.slice(0, currentLine);
      const after = code.slice(currentLine);

      const blockStart = before.lastIndexOf(identifier);
      const blockEnd = after.indexOf(identifier);

      // If a block comment is found and the cursor is inside the block comment, return the comment boundaries
      if (blockStart !== -1 && blockEnd !== -1 && blockStart < currentLine) {
        const start = blockStart;
        const end = currentLine + blockEnd + identifier.length;
        console.log("Block comment found:", start, end);
        return { start, end, type: "block" };
      }
    }
  } else if (blockCommentIdentifier) {
    // If the language is not python we can process the block comments making the assumption that the start and end identifiers are the same
    let blockCommentIdentifierTEMP: string;
    let blockCommentIdentifierStart = blockCommentIdentifier[0];
    let blockCommentIdentifierEnd = blockCommentIdentifier[1];
    // Step 2: Check for block comments
    const before = code.slice(0, currentLine);
    const after = code.slice(currentLine);

    const blockStart = before.lastIndexOf(blockCommentIdentifierStart);
    const blockEnd = after.indexOf(blockCommentIdentifierEnd);

    // If a block comment is found and the cursor is inside the block comment, return the comment boundaries
    if (blockStart !== -1 && blockEnd !== -1 && blockStart < currentLine) {
      const start = blockStart;
      const end = currentLine + blockEnd + blockCommentIdentifierEnd.length;
      console.log("Block comment found:", start, end);
      return { start, end, type: "block" };
    }
  }

  // No comment found
  console.log("No comment found");
  return null;
}

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
    console.log(`No comment syntax mapping found for language: ${languageId}`);
    return { singleline: "//", multiline: ["/*", "*/"] };
  }
}

function removeStringRange(input: string, start: number, end: number): string {
  if (start < 0 || end > input.length || start > end) {
    throw new Error("Invalid start or end indices.");
  }

  const before = input.slice(0, start);
  const after = input.slice(end);

  return before + after;
}
