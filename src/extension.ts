import * as vscode from "vscode";
import * as helpers from "./helpers";
import { processPrompt as processPrompt } from "./codeParsing";
import {
  makeStreamingRequestAnthropic,
  makeStreamingRequestOpenAI,
  makeStreamingRequestxAI,
} from "./apiProviders";
import { RequestData, RequestMessageParam } from "./types";

// Global variable to enable debugging and console logging
globalThis.DEBUG = true;

// Instructions to add a new AI provider:
// add config above and function in apiProviders.ts to add a new llm provider.
// add shortcut key and register command if required.
// add api key if required.

// Instructions to add a new language support:
// add the language to commentMapping in codeParsing.ts

// Supported AI providers:
// See README.md

// TODO:
// Add Gemini cause its going to be cracked soon surely - https://github.com/google-gemini/generative-ai-j
// Add Gork - https://x.ai/api
// Find ways to improve code quality and generation

// BUILD COMMAND: vsce package

export function activate(context: vscode.ExtensionContext) {
  console.log("LLM Plugin Extension Activated");

  // Access the configuration
  const config = vscode.workspace.getConfiguration("modelConfig");

  // Read config properties
  const openAiModelType = config.get<string>("openaimodel");
  const openAiMaxTokens = config.get<string>("openaimaxtokens");
  const anthropicModelType = config.get<string>("anthropicmodel");
  const anthropicMaxTokens = config.get<string>("anthropicmaxtokens");
  const xaiModelType = config.get<string>("xaimodel");
  const xaiMaxTokens = config.get<string>("xaimaxtokens");

  // Predefined engineered prompts for the models
  const llmModelSystemPrompt =
    "You are a code generation assistant tasked with modifying or extending code based on user-provided comments within the code block. Your goal is to analyze, modify, and generate code in strict adherence to the instructions given in the comments without providing any explanation or additional context. You must maintain consistent coding style and formatting, follow best practices, and ensure your generated code is efficient, readable, and integrates seamlessly with the existing code. Output the code without backticks, explanations, or extraneous text.";

  const anthropicModelUserPromptContainer = `You are a code generation assistant. Your task is to generate code based on the provided code and instructions. The code and instructions will be given to you as comments within a code block.

Carefully read through the code and comments. The comments will contain instructions on how to modify or extend the existing code. These instructions may include:
- Adding new functions or methods
- Modifying existing functions
- Implementing specific algorithms or logic
- Adding error handling or input validation
- Adhering to specific coding standards or best practices

Follow these steps to complete the task:

1. Analyze the existing code and understand its structure and purpose.
2. Read the instructions in the comments carefully.
3. Plan your approach to implementing the requested changes or additions.
4. Generate the new or modified code according to the instructions.
5. Ensure that your generated code integrates seamlessly with the existing code.

Remember to follow best practices for the programming language used in the original code, maintain consistent style and formatting, and ensure that your generated code is efficient and readable.

Here is the code and instructions:
{{MARKER}}

NEVER regenerate the entire provided codebase only the code requested in the instruction. Do not talk at all. Only output valid code. Do not provide any backticks that surround the code. Never ever output backticks like this \`\`\` .`;

  const openAiModelUserPromptContainer = `You are a code generation assistant. Your task is to generate code based on the provided code and instructions. The code and instructions will be given to you as comments within a code block.

Carefully read through the code and comments. The comments will contain instructions on how to modify or extend the existing code. These instructions may include:
- Adding new functions or methods
- Modifying existing functions
- Implementing specific algorithms or logic
- Adding error handling or input validation
- Adhering to specific coding standards or best practices

Follow these steps to complete the task:

1. Analyze the existing code and understand its structure and purpose.
2. Read the instructions in the comments carefully.
3. Plan your approach to implementing the requested changes or additions.
4. Generate the new or modified code according to the instructions.
5. Ensure that your generated code integrates seamlessly with the existing code.

Remember to follow best practices for the programming language used in the original code, maintain consistent style and formatting, and ensure that your generated code is efficient and readable.

Here is the code and instructions:
{{MARKER}}

NEVER regenerate the entire provided codebase only the code requested in the instructions. Do not talk at all. Only output valid code. Do not provide any backticks that surround the code. NEVER EVER output backticks like this \`\`\` .`;

  const modelConfig: { [key: string]: any } = {
    OpenAICode: {
      provider: "OpenAI",
      model: openAiModelType,
      max_tokens: openAiMaxTokens,
      user_prompt: openAiModelUserPromptContainer,
      system_prompt: llmModelSystemPrompt,
    },
    AnthropicCode: {
      provider: "Anthropic",
      model: anthropicModelType,
      max_tokens: anthropicMaxTokens,
      user_prompt: anthropicModelUserPromptContainer,
      system_prompt: llmModelSystemPrompt,
    },
    xAICode: {
      provider: "xAI",
      model: xaiModelType,
      max_tokens: xaiMaxTokens,
      user_prompt: openAiModelUserPromptContainer,
      system_prompt: llmModelSystemPrompt,
    },
  };

  // Define the API provider to use
  let selectedModelAPI = "NONE";

  let promiseApiResponse: Promise<boolean>;

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

  // Register command to select xAI as the provider
  let selectxAICode = vscode.commands.registerCommand(
    "extension.selectxAICode",
    () => {
      selectedModelAPI = "xAICode";
      vscode.window.setStatusBarMessage("(Code) xAI selected as AI provider");
      if (DEBUG === true) {
        console.log("xAI selected as AI provider");
      }
    }
  );

  // PRIMARY COMMAND: Register command to send the code to the selected AI provider
  let disposable = vscode.commands.registerCommand(
    "extension.sendToAPI",

    async () => {
      if (DEBUG === true) {
        console.log("Making API Request to AI provider");
      }
      const editor = vscode.window.activeTextEditor;
      let focusedFileType = helpers.getFocusedFileType();

      if (editor) {
        let selectedApiKey: string | undefined;

        // Process the user prompt code
        let processedUserPromptCode: string | undefined = processPrompt(editor);

        // processedUserPromptCode will be used as the user prompt to the AI model assuming it is not undefined
        if (!processedUserPromptCode) {
          vscode.window.showErrorMessage(
            "Failed to process the workspace code."
          );
          return;
        }

        // Get the configuration for the selected model
        const modelConfigData = modelConfig[selectedModelAPI];

        // Check if a model has been selected
        if (!modelConfigData) {
          vscode.window.showErrorMessage(
            `No model has been selected. Please select a model.`
          );
          return;
        }
        // Create messages for the selected model:
        modelConfigData.messages = [
          { role: "system", content: modelConfigData.system_prompt },
          { role: "user", content: modelConfigData.user_prompt },
        ];

        // Create the requestData object based on the selected model's configuration
        const requestData: RequestData = {
          model: modelConfigData.model,
          max_tokens: modelConfigData.max_tokens,
          messagesForRequest: modelConfigData.messages,
          workspace_code: processedUserPromptCode,
        };

        // Debugging information
        if (DEBUG === true) {
          console.log("Debugging Info:");
          console.log("FileContent:", processedUserPromptCode);
          console.log("RequestData:", requestData);
          console.log("ModelConfigData:", modelConfigData);
          console.log("ProviderType:", selectedModelAPI);
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
            promiseApiResponse = makeStreamingRequestOpenAI(
              (await selectedApiKey) || "",
              requestData
            );
            break;
          case "AnthropicCode":
            promiseApiResponse = makeStreamingRequestAnthropic(
              (await selectedApiKey) || "",
              requestData
            );
            break;
          case "xAICode":
            promiseApiResponse = makeStreamingRequestxAI(
              (await selectedApiKey) || "",
              requestData
            );
            break;
          default:
            vscode.window.showErrorMessage("Invalid AI provider selected.");
            return;
        }

        try {
          const apiResponse = await promiseApiResponse; // Wait for the API response from the selected provider: true/false

          if (DEBUG === true && apiResponse === true) {
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
  console.log("LLM Plugin Extension Deactivated");
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
