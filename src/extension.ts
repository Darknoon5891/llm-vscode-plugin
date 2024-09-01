import * as vscode from "vscode";
import { moveCommentsToBottom } from "./codeParsing";
import { ApiProvider, OpenAICode, AnthropicCode } from "./apiProviders";
import { RequestData, Message } from "./types";

// Global variable to enable debugging and console logging
globalThis.DEBUG = true;

// Instructions to add a new AI provider:
// add config above and function in apiProviders.ts to add a new llm provider.
// add shortcut key and register command if required.
// add .env api key if required.

// Instructions to add a new language support:
// add the language to commentMapping in codeParsing.ts

// TODO:
// API streaming required
// Improve the code comment parsing to handle more edge cases

export function activate(context: vscode.ExtensionContext) {
  if (DEBUG === true) {
    console.log("LLM Plugin Extension Activated");
  }

  // Access the configuration
  const config = vscode.workspace.getConfiguration("agiIntegration");

  // Read specific properties
  const openAiModel = config.get<string>("openaimodel");
  const anthropicModel = config.get<string>("anthropicmodel");

  const modelConfig: { [key: string]: any } = {
    OpenAICode: {
      provider: "OpenAI",
      model: openAiModel,
      max_tokens: 4000,
      system_prompt:
        "Follow the instruction in the comments that you are sent, only following the latest comments. Do not talk at all. Only output valid code. Do not provide any backticks that surround the code. Never ever output backticks like this ```.",
      helpful_prompt:
        "You are a helpful assistant. What I have sent are my notes so far. You are very curt, yet helpful. You must prefix each line with the comment marker for the language which is currently",
    },
    OpenAIHelp: {
      provider: "OpenAI",
      model: openAiModel,
      max_tokens: 4000,
      system_prompt:
        "Follow the instruction in the comments that you are sent, only following the latest comments. Do not talk at all. Only output valid code. Do not provide any backticks that surround the code. Never ever output backticks like this ```.",
      helpful_prompt:
        "You are a helpful assistant. What I have sent are my notes so far. You are very curt, yet helpful. Never ever output backticks like this ```. Do not generate code. You must prefix each line with the comment marker for the language which is currently",
    },
    AnthropicCode: {
      provider: "Anthropic",
      model: anthropicModel,
      max_tokens: 4000,
      system_prompt:
        "Follow the instruction in the comments that you are sent, only following the latest comments. Do not talk at all. Only output valid code. Do not provide any backticks that surround the code. Never ever output backticks like this ```.",
      helpful_prompt:
        "You are a helpful assistant. What I have sent are my notes so far. You are very curt, yet helpful. You must prefix each line with the comment marker for the language which is currently",
    },
    AnthropicHelp: {
      provider: "Anthropic",
      model: anthropicModel,
      max_tokens: 4000,
      system_prompt:
        "Follow the instruction in the comments that you are sent, only following the latest comments. Do not talk at all. Only output valid code. Do not provide any backticks that surround the code. Never ever output backticks like this ```.",
      helpful_prompt:
        "You are a helpful assistant. What I have sent are my notes so far. You are very curt, yet helpful. Never ever output backticks like this ```. Do not generate code. You must prefix each line with the comment marker for the language which is currently",
    },
  };

  // Define the API provider to use
  let selectedModelAPI = "NONE";

  // Register command to select OpenAI as the provider
  let selectOpenAICode = vscode.commands.registerCommand(
    "extension.selectOpenAICode",
    () => {
      selectedModelAPI = "OpenAICode";
      vscode.window.setStatusBarMessage(
        "(Code) OpenAI selected as AI provider"
      );
      if (DEBUG === true) {
        console.log("OpenAI selected as AI provider");
      }
    }
  );
  // Register command to select OpenAI as the provider Help
  let selectOpenAIHelp = vscode.commands.registerCommand(
    "extension.selectOpenAIHelp",
    () => {
      selectedModelAPI = "OpenAIHelp";
      vscode.window.setStatusBarMessage(
        "(Help) OpenAI selected as AI provider"
      );
      if (DEBUG === true) {
        console.log("OpenAI selected as AI provider");
      }
    }
  );

  // Register command to select Anthropic as the provider
  let selectAnthropicCode = vscode.commands.registerCommand(
    "extension.selectAnthropicCode",
    () => {
      selectedModelAPI = "AnthropicCode";
      vscode.window.setStatusBarMessage(
        "(Code) Anthropic selected as AI provider"
      );
      if (DEBUG === true) {
        console.log("Anthropic selected as AI provider");
      }
    }
  );

  // Register command to select Anthropic Help as the provider
  let selectAnthropicHelp = vscode.commands.registerCommand(
    "extension.selectAnthropicHelp",
    () => {
      selectedModelAPI = "AnthropicHelp";
      vscode.window.setStatusBarMessage(
        "(Help) Anthropic selected as AI provider"
      );
      if (DEBUG === true) {
        console.log("Anthropic selected as AI provider");
      }
    }
  );

  let disposable = vscode.commands.registerCommand(
    "extension.sendToAPI",

    async () => {
      if (DEBUG === true) {
        console.log("Making API Request to AI provider");
      }
      const editor = vscode.window.activeTextEditor;

      let focusedFileType = getFocusedFileType();

      if (editor) {
        // const document = editor.document;
        // const fileContent = document.getText();
        // const workspaceFolder =
        // vscode.workspace.workspaceFolders?.[0]?.uri.fsPath;

        let selectedApiKey: string | undefined;
        let processedCode: string | undefined = moveCommentsToBottom(editor);

        if (!processedCode) {
          vscode.window.showErrorMessage(
            "Failed to process the workspace code."
          );
          return;
        }

        // Get the configuration for the selected model
        const modelConfigData = modelConfig[selectedModelAPI];

        if (!modelConfigData) {
          vscode.window.showErrorMessage(
            `No model has been selected. Please select a model.`
          );
          return;
        }

        // Create messages based on the selected model's configuration (system or helpful prompt)
        if (selectedModelAPI.includes("Help")) {
          modelConfigData.messages = [
            {
              role: "system",
              content: `${
                modelConfigData.helpful_prompt
              } ${focusedFileType} ${"."}`,
            },
            { role: "user", content: processedCode },
          ];
        } else {
          modelConfigData.messages = [
            { role: "system", content: modelConfigData.system_prompt },
            { role: "user", content: processedCode },
          ];
        }
        // Create the requestData object based on the selected model's configuration
        const requestData: RequestData = {
          model: modelConfigData.model,
          max_tokens: modelConfigData.max_tokens,
          messages: modelConfigData.messages,
        };

        // Choose the AI provider (for example, based on a configuration)
        let apiProvider: ApiProvider;

        if (DEBUG === true) {
          console.log("Debugging Info:");
        }
        if (DEBUG === true) {
          console.log("FileContent:", processedCode);
        }
        if (DEBUG === true) {
          console.log("RequestData:", requestData);
        }
        if (DEBUG === true) {
          console.log("ModelConfigData:", modelConfigData);
        }
        if (DEBUG === true) {
          console.log("ProviderType:", selectedModelAPI);
        }
        if (DEBUG === true) {
          console.log("FocusedFileType:", focusedFileType);
        }

        // Check if the API key is stored in the secret storage if not prompt the user to enter it
        if (
          (await getApiKey(context, modelConfigData.provider)) === undefined
        ) {
          await promptAndStoreApiKey(context, modelConfigData.provider);
          selectedApiKey = await getApiKey(context, modelConfigData.provider);
        } else {
          selectedApiKey = await getApiKey(context, modelConfigData.provider);
        }

        switch (selectedModelAPI) {
          case "OpenAICode":
          case "OpenAIHelp":
            apiProvider = new OpenAICode((await selectedApiKey) || "");
            break;
          case "AnthropicCode":
          case "AnthropicHelp":
            apiProvider = new AnthropicCode((await selectedApiKey) || "");
            break;
          default:
            vscode.window.showErrorMessage("Invalid AI provider selected.");
            return;
        }

        try {
          //const apiResponse = await apiProvider.getResponse(requestData);
          const apiResponse = await apiProvider.getResponse(requestData);

          editor.edit((editBuilder) => {
            editBuilder.insert(editor.selection.active, `\n${apiResponse}`);
          });

          if (DEBUG === true) {
            console.log("Response inserted from API.");
          }
        } catch (error) {
          vscode.window.showErrorMessage(
            "Failed to get a response from the API."
          );
          console.error(error);
        }
      }
    }
  );

  context.subscriptions.push(disposable);
}

export function deactivate() {
  if (DEBUG === true) {
    console.log("LLM Plugin Extension Deactivated");
  }
}

export async function promptAndStoreApiKey(
  context: vscode.ExtensionContext,
  apiKeyType: string // The type of the API key, e.g., 'OpenAI', 'GitHub'
): Promise<void> {
  // Prompt the user to enter their API key
  const apiKey = await vscode.window.showInputBox({
    prompt: `Enter your ${apiKeyType} API key`,
    placeHolder: `${apiKeyType} API key`,
    ignoreFocusOut: true,
    password: true, // Hide the input as the user types for security
  });

  // If the user entered a key, store it in the secret storage with the type as the key name
  // Stores the API key in OS manged secure storage
  if (apiKey) {
    const keyName = `${apiKeyType}ApiKey`;
    await context.secrets.store(keyName, apiKey);
    vscode.window.showInformationMessage(
      `${apiKeyType} API key has been securely stored.`
    );
  } else {
    vscode.window.showWarningMessage(
      `${apiKeyType} API key was not entered and has not been stored.`
    );
  }
}

export async function getApiKey(
  context: vscode.ExtensionContext,
  apiKeyType: string // The type of the API key, e.g., 'OpenAI', 'GitHub'
): Promise<string | undefined> {
  const keyName = `${apiKeyType}ApiKey`;

  // Retrieve the API key from the secret storage
  const apiKey = await context.secrets.get(keyName);

  if (apiKey) {
    if (DEBUG === true) {
      console.log(`${apiKeyType} API key retrieved successfully.`);
    }
  } else {
    if (DEBUG === true) {
      console.log(`No ${apiKeyType} API key found.`);
    }
  }

  return apiKey;
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
