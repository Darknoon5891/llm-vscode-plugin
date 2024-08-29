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

  if (DEBUG === true) {
    console.log("Cleaned code:", cleanedCode);
  }
  return cleanedCode;

  function detectCommentBoundaries(
    code: string,
    currentLine: number,
    singleLineIdentifier: string | null,
    blockCommentIdentifier: string[] | null,
    languageId: string
  ): CommentBoundaries | null {
    const lines = code.split("\n");
    let characterCount = 0;

    let startLine = currentLine;
    let endLine = currentLine;

    let endFileLine = lines.length - 1;

    let commentSizeLimit = 50;

    let resultsCommentBoundaries: CommentBoundaries | null = null;

    // we should first check just for a single line comment at the cursor position and mark that as the current comment if found
    // whitespace has been removed so we can just check the current line and return it if so.
    detectSingleLineComment();

    //we should then check for multi block single line comments 2 spaces below and above the cursor (if the comment has more then 2 lines between its not counted as the same comment)
    // if a comment is found above and below use the bottom one.
    detectSingleMultiLineComment();

    //we should then check for multi block comments which are defined by the multi block comment identifier
    detectMultiLineComment();
    // if (languageId !== "python") {
    //   detectMultiLineComment();
    // }

    if (languageId === "python") {
      // REMEMBER TO ADD PYTHON HANDLER as it has can have multiple block comment identifiers
      console.warn("Python handler not implemented");
      console.warn(
        "currently block python comments denoted by ''' are not support and will lead to unexpected behaviour"
      );
    }

    // we can then return the comment if found based its order in this list or return null if no comment is found
    if (resultsCommentBoundaries) {
      // Single-line comment found
      if (DEBUG === true) {
        console.log(
          "resultsCommentBoundaries found:",
          resultsCommentBoundaries
        );
      }
      return resultsCommentBoundaries;
    }
    // No comment found
    if (DEBUG === true) {
      console.log("No comment found");
    }
    return null;

    // This function will detect single line comments 2+/2- lines above and below the cursor
    function detectSingleLineComment(): CommentBoundaries | null {
      if (singleLineIdentifier) {
        // Check 1 lines below the cursor
        if (startLine === endLine) {
          if (lines[startLine].trimStart().startsWith(singleLineIdentifier)) {
            // This function should only return one line
            resultsCommentBoundaries = {
              start: startLine,
              end: endLine,
              type: "single-line",
            };
          }
        }
      }
      // return of last resort
      return null;
    }

    // This function detects a block of single-line comments around the cursor in a given code or text file.
    // It searches for comments 2 or more lines above and below the cursor, identifying any gaps of 2 or more lines.
    // If a gap is found, the function returns the boundaries of the comment block found below the cursor.
    function detectSingleMultiLineComment(): CommentBoundaries | null {
      // Validate input: Check if the singleLineIdentifier is provided and if currentLine is within the valid range.
      if (
        !singleLineIdentifier ||
        currentLine < 0 ||
        currentLine >= endFileLine
      ) {
        return null; // Return null if the input is invalid.
      }

      // Move upwards to find the start of the comment block
      while (startLine > 0) {
        // If the previous line starts with the singleLineIdentifier, include it in the comment block.
        if (lines[startLine - 1].trimStart().startsWith(singleLineIdentifier)) {
          startLine--;
        } else {
          // If a gap of 2 or more lines is detected, stop the upward scan.
          if (
            startLine - 1 > 0 &&
            !lines[startLine - 1]
              .trimStart()
              .startsWith(singleLineIdentifier) &&
            !lines[startLine - 2].trimStart().startsWith(singleLineIdentifier)
          ) {
            break;
          }
          // If no gap is found, stop just before the first non-comment line.
          startLine--;
          break;
        }
      }

      // Move downwards to find the end of the comment block
      while (endLine < lines.length - 1) {
        // If the next line starts with the singleLineIdentifier, include it in the comment block.
        if (lines[endLine + 1].trimStart().startsWith(singleLineIdentifier)) {
          endLine++;
        } else {
          // If a gap of 2 or more lines is detected, stop the downward scan.
          if (
            endLine + 1 < lines.length - 1 &&
            !lines[endLine + 1].trimStart().startsWith(singleLineIdentifier) &&
            !lines[endLine + 2].trimStart().startsWith(singleLineIdentifier)
          ) {
            break;
          }
          // If no gap is found, stop just after the last comment line.
          break;
        }
      }

      // If a valid comment block is detected (startLine and endLine are different)
      // or if the current line is part of a single-line comment, calculate the boundaries.
      if (
        startLine !== endLine ||
        lines[currentLine].trimStart().startsWith(singleLineIdentifier)
      ) {
        // Check if the line at startLine starts with the singleLineIdentifier
        if (!lines[startLine].trimStart().startsWith(singleLineIdentifier)) {
          startLine++; // Move startLine down if it doesn't start with the identifier
        }

        // Check if the line at endLine starts with the singleLineIdentifier
        if (!lines[endLine].trimStart().startsWith(singleLineIdentifier)) {
          endLine--; // Move endLine up if it doesn't start with the identifier
        }

        // Ensure the adjusted startLine is still valid
        if (startLine > endLine) {
          return null; // If startLine surpasses endLine, no valid comment block exists
        }

        // Calculate the start and end positions (character indices) of the comment block.
        startLine =
          lines.slice(0, startLine).join("\n").length + (startLine > 0 ? 1 : 0);
        endLine = lines.slice(0, endLine + 1).join("\n").length;

        // Store the start and end positions in a CommentBoundaries object.
        resultsCommentBoundaries = {
          start: startLine,
          end: endLine,
          type: "single-line",
        };

        // Log the detected comment block boundaries and return the result.
        console.log(
          "detectSingleMultiLineComment found:",
          resultsCommentBoundaries
        );
        return resultsCommentBoundaries;
      }

      // If no comment block is found, return null.
      return null;
    }

    function detectMultiLineComment(): CommentBoundaries | null {
      // Validate input: Check if the blockCommentIdentifier is provided and if currentLine is within the valid range.
      if (
        !blockCommentIdentifier ||
        currentLine < 0 ||
        currentLine >= lines.length
      ) {
        return null; // Return null if the input is invalid.
      }

      let startLine = currentLine;
      let endLine = currentLine;
      let foundStartIdentifier = false;
      let foundEndIdentifier = false;

      // Move upwards to find the start of the comment block
      while (startLine >= 0 && currentLine - startLine <= commentSizeLimit) {
        if (
          lines[startLine].trimStart().startsWith(blockCommentIdentifier[0])
        ) {
          foundStartIdentifier = true;
          break; // Found the start of the block comment
        }
        startLine--;
      }

      // Move downwards to find the end of the comment block
      while (
        endLine < lines.length &&
        endLine - currentLine <= commentSizeLimit
      ) {
        if (lines[endLine].trimEnd().endsWith(blockCommentIdentifier[1])) {
          foundEndIdentifier = true;
          break; // Found the end of the block comment
        }
        endLine++;
      }

      // If both the start and end identifiers are found within the commentSizeLimit
      if (foundStartIdentifier && foundEndIdentifier) {
        // Calculate the start and end positions (character indices) of the comment block.
        startLine =
          lines.slice(0, startLine).join("\n").length + (startLine > 0 ? 1 : 0);
        endLine = lines.slice(0, endLine + 1).join("\n").length;

        resultsCommentBoundaries = {
          start: startLine,
          end: endLine,
          type: "block",
        };
      }

      // If no valid comment block is found within the size limit, return null.
      return null;
    }

    // Special case for python comments as it supports multiple block comment identifiers
    // if (blockCommentIdentifier && languageId === "python") {
    //   // If the language is python we need to process the block comments differently as the start and end identifiers could be different
    //   for (const identifier of blockCommentIdentifier) {
    //     const before = code.slice(0, currentLine);
    //     const after = code.slice(currentLine);

    //     const blockStart = before.lastIndexOf(identifier);
    //     const blockEnd = after.indexOf(identifier);

    //     // If a block comment is found and the cursor is inside the block comment, return the comment boundaries
    //     if (blockStart !== -1 && blockEnd !== -1 && blockStart < currentLine) {
    //       const start = blockStart;
    //       const end = currentLine + blockEnd + identifier.length;
    //       if (DEBUG === true) { console.log("Block comment found:", start, end); }
    //       resultsCommentBoundaries = {
    //         start,
    //         end,
    //         type: "block",
    //       } as CommentBoundaries;
    //     } else {
    //       if (DEBUG === true) { console.log("Block comment not found"); }
    //     }
    //   }
    // } else if (blockCommentIdentifier) {
    //   // If the language is not python we can process the block comments making the assumption that the start and end identifiers are the same
    //   let blockCommentIdentifierTEMP: string;
    //   let blockCommentIdentifierStart = blockCommentIdentifier[0];
    //   let blockCommentIdentifierEnd = blockCommentIdentifier[1];
    //   // Step 2: Check for block comments
    //   const before = code.slice(0, currentLine);
    //   const after = code.slice(currentLine);

    //   const blockStart = before.lastIndexOf(blockCommentIdentifierStart);
    //   const blockEnd = after.indexOf(blockCommentIdentifierEnd);

    //   // If a block comment is found and the cursor is inside the block comment, return the comment boundaries
    //   if (blockStart !== -1 && blockEnd !== -1 && blockStart < currentLine) {
    //     const start = blockStart;
    //     const end = currentLine + blockEnd + blockCommentIdentifierEnd.length;
    //     if (DEBUG === true) { console.log("Block comment found:", start, end); }
    //     resultsCommentBoundaries = {
    //       start,
    //       end,
    //       type: "block",
    //     } as CommentBoundaries;
    //   } else {
    //     if (DEBUG === true) { console.log("Block comment not found"); }
    //   }
    // }
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
