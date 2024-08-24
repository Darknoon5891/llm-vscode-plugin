import * as ts from "typescript";
import * as vscode from "vscode";

// Main function to process code with AI
export function GetProcessedWorkspaceCode() {
  const editor = vscode.window.activeTextEditor;
  if (!editor) {
    vscode.window.showErrorMessage("No active editor found.");
    return;
  }

  const document = editor.document;
  const cursorPosition = editor.selection.active;
  const contextRange = calculateContextRange(cursorPosition);

  // Parse the code and find dependencies
  const sourceFile = parseCodeToAST(document);
  const dependencies = findDependenciesInContext(sourceFile, contextRange);

  // Construct and optimize the snippet
  let processedCode = constructCodeSnippet(
    document,
    dependencies,
    contextRange
  );
  // Optimise the code from the workspace
  processedCode = optimizeSnippet(processedCode);

  // Return the processed code
  return processedCode;
}

// Calculate the context range based on cursor position
function calculateContextRange(cursorPosition: vscode.Position): vscode.Range {
  const startLine = Math.max(cursorPosition.line - 5, 0);
  const endLine = cursorPosition.line + 5;
  return new vscode.Range(startLine, 0, endLine, 1000);
}

// Parse the document's code into an Abstract Syntax Tree (AST)
function parseCodeToAST(document: vscode.TextDocument): ts.SourceFile {
  const sourceCode = document.getText();
  const sourceFile = ts.createSourceFile(
    document.fileName,
    sourceCode,
    ts.ScriptTarget.Latest,
    true
  );
  return sourceFile;
}

// Find all dependencies within the context range
function findDependenciesInContext(
  sourceFile: ts.SourceFile,
  contextRange: vscode.Range
): Set<string> {
  const dependencies = new Set<string>();

  const visitor = (node: ts.Node) => {
    const start = node.getStart(sourceFile);
    const end = node.getEnd();
    const startPos = sourceFile.getLineAndCharacterOfPosition(start);
    const endPos = sourceFile.getLineAndCharacterOfPosition(end);
    const nodeRange = new vscode.Range(
      startPos.line,
      startPos.character,
      endPos.line,
      endPos.character
    );

    if (contextRange.intersection(nodeRange)) {
      if (ts.isIdentifier(node)) {
        dependencies.add(node.getText(sourceFile));
      }
    }

    ts.forEachChild(node, visitor);
  };

  ts.forEachChild(sourceFile, visitor);

  return dependencies;
}

// Construct the code snippet to send to the AI
function constructCodeSnippet(
  document: vscode.TextDocument,
  dependencies: Set<string>,
  contextRange: vscode.Range
): string {
  const sourceLines = document.getText().split("\n");
  const snippetLines: string[] = [];

  for (let i = 0; i < sourceLines.length; i++) {
    const lineText = sourceLines[i];

    // Always include lines within the context range
    if (contextRange.contains(new vscode.Position(i, 0))) {
      snippetLines.push(lineText);
    } else {
      // Include lines that define one of the dependencies
      for (const dep of dependencies) {
        if (lineText.includes(dep)) {
          snippetLines.push(lineText);
          break;
        }
      }
    }
  }

  return snippetLines.join("\n");
}

// Optimize the constructed snippet by removing redundant lines
function optimizeSnippet(snippet: string): string {
  return snippet
    .split("\n")
    .filter((line) => line.trim() !== "" && !line.trim().startsWith("//"))
    .join("\n");
}
