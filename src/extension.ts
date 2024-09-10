import * as vscode from "vscode";
import * as helpers from "./helpers";
import { processPrompt as processPrompt } from "./codeParsing";
import {
  makeStreamingRequestAnthropic,
  makeStreamingRequestOpenAI,
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

// To build the extension: vsce package

// TODO:
// Add Gemini cause its going to be cracked soon surely
// IMPROVEMENT - The current prompt being used should be improved see new.prompt

export function activate(context: vscode.ExtensionContext) {
  console.log("LLM Plugin Extension Activated");

  // Access the configuration
  const config = vscode.workspace.getConfiguration("modelConfig");

  // Read config properties
  const openAiModelType = config.get<string>("openaimodel");
  const openAiMaxTokens = config.get<string>("openaimaxtokens");
  const anthropicModelType = config.get<string>("anthropicmodel");
  const anthropicMaxTokens = config.get<string>("anthropicmaxtokens");

  // Predefined engineered prompts for the models
  const openAiModelHelpPrompt =
    "You are a helpful assistant. What I have sent is my code and notes so far. Advise me how to continue to develop my program. You are very curt, yet helpful. Never ever output backticks like this ```. Do not generate code.";

  const anthropicHelpPrompt =
    "You are a helpful assistant. What I have sent is my code and notes so far. Advise me how to continue to develop my program. You are very curt, yet helpful. Never ever output backticks like this ```. Do not generate code.";

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

Do not talk at all. Only output valid code. Do not provide any backticks that surround the code. Never ever output backticks like this \`\`\` .`;

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

Here is the code and instructions::
{{MARKER}}

DO NOT regenerate the entire provided codebase only the code requested in the instruction. Do not talk at all. Only output valid code. Do not provide any backticks that surround the code. Never ever output backticks like this \`\`\` .`;

  const modelConfig: { [key: string]: any } = {
    OpenAICode: {
      provider: "OpenAI",
      model: openAiModelType,
      max_tokens: openAiMaxTokens,
      user_prompt: openAiModelUserPromptContainer,
      system_prompt: llmModelSystemPrompt,
    },
    OpenAIHelp: {
      provider: "OpenAI",
      model: openAiModelType,
      max_tokens: openAiMaxTokens,
      system_prompt: llmModelSystemPrompt,
      helpful_prompt: openAiModelHelpPrompt,
    },
    AnthropicCode: {
      provider: "Anthropic",
      model: anthropicModelType,
      max_tokens: anthropicMaxTokens,
      user_prompt: anthropicModelUserPromptContainer,
      system_prompt: llmModelSystemPrompt,
    },
    AnthropicHelp: {
      provider: "Anthropic",
      model: anthropicModelType,
      max_tokens: anthropicMaxTokens,
      helpful_prompt: anthropicHelpPrompt,
    },
  };
  const helpfulPromptEndComment =
    "You must prefix each line with the comment marker for the language which is currently";

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

        // Create messages based on the selected model's configuration (system or helpful prompt)
        if (selectedModelAPI.includes("Help")) {
          modelConfigData.messages = [
            {
              role: "system",
              content: `${
                modelConfigData.helpful_prompt
              } ${helpfulPromptEndComment} ${focusedFileType}${"."}`,
            },
            { role: "user", content: processedUserPromptCode },
          ];
        } else {
          modelConfigData.messages = [
            { role: "system", content: modelConfigData.system_prompt },
            { role: "user", content: modelConfigData.user_prompt },
          ];
        }
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
          case "OpenAIHelp":
            promiseApiResponse = makeStreamingRequestOpenAI(
              (await selectedApiKey) || "",
              requestData
            );
            break;
          case "AnthropicCode":
          case "AnthropicHelp":
            promiseApiResponse = makeStreamingRequestAnthropic(
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
