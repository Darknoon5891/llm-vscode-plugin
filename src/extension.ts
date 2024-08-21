import { ExtensionContext, commands, window, workspace } from "vscode";
import { config } from "dotenv";
import { ApiProvider, OpenAICode, AnthropicCode } from "./apiProviders";
import { RequestData, Message } from "./types";

const modelConfig: { [key: string]: any } = {
  OpenAICode: {
    model: "gpt-4o",
    max_tokens: 1000,
    system_prompt:
      "You should replace the code that you are sent, only following the comments. Do not talk at all. Only output valid code. Do not provide any backticks that surround the code. Never ever output backticks like this ```. Any comment that is asking you for something should be removed after you satisfy them. Other comments should left alone. Do not output backticks",
    helpful_prompt:
      "You are a helpful assistant. What I have sent are my notes so far. You are very curt, yet helpful.",
  },
  OpenAIHelp: {
    model: "gpt-4o",
    max_tokens: 1000,
    system_prompt:
      "You should replace the code that you are sent, only following the comments. Do not talk at all. Only output valid code. Do not provide any backticks that surround the code. Never ever output backticks like this ```. Any comment that is asking you for something should be removed after you satisfy them. Other comments should left alone. Do not output backticks",
    helpful_prompt:
      "You are a helpful assistant. What I have sent are my notes so far. You are very curt, yet helpful.",
  },
  AnthropicCode: {
    model: "claude-3-5-sonnet-20240620",
    max_tokens: 1000,
    system_prompt:
      "You should replace the code that you are sent, only following the comments. Do not talk at all. Only output valid code. Do not provide any backticks that surround the code. Never ever output backticks like this ```. Any comment that is asking you for something should be removed after you satisfy them. Other comments should left alone. Do not output backticks",
    helpful_prompt:
      "You are a helpful assistant. What I have sent are my notes so far. You are very curt, yet helpful.",
  },
  AnthropicHelp: {
    model: "claude-3-5-sonnet-20240620",
    max_tokens: 1000,
    system_prompt:
      "You should replace the code that you are sent, only following the comments. Do not talk at all. Only output valid code. Do not provide any backticks that surround the code. Never ever output backticks like this ```. Any comment that is asking you for something should be removed after you satisfy them. Other comments should left alone. Do not output backticks",
    helpful_prompt:
      "You are a helpful assistant. What I have sent are my notes so far. You are very curt, yet helpful. Never ever output backticks like this ```.",
  },
};

// Instructions to add a new AI provider:
// add config above and function in apiProviders.ts to add a new llm provider.
// add shortcut key and register command if required.
// add .env api key if required.

// Load environment variables from .env file
config({ path: __dirname + "/../.env" });

export function activate(context: ExtensionContext) {
  console.log("LLM Plugin Extension Activated");

  // Define the API provider to use
  let selectedModelAPI = "NONE";

  // Register command to select OpenAI as the provider
  let selectOpenAICode = commands.registerCommand(
    "extension.selectOpenAICode",
    () => {
      selectedModelAPI = "OpenAICode";
      window.setStatusBarMessage("(Code) OpenAI selected as AI provider", 3000);
      console.log("OpenAI selected as AI provider");
    }
  );
  // Register command to select OpenAI as the provider Help
  let selectOpenAIHelp = commands.registerCommand(
    "extension.selectOpenAIHelp",
    () => {
      selectedModelAPI = "OpenAIHelp";
      window.setStatusBarMessage("(Help) OpenAI selected as AI provider", 3000);
      console.log("OpenAI selected as AI provider");
    }
  );

  // Register command to select Anthropic as the provider
  let selectAnthropicCode = commands.registerCommand(
    "extension.selectAnthropicCode",
    () => {
      selectedModelAPI = "AnthropicCode";
      window.setStatusBarMessage(
        "(Code) Anthropic selected as AI provider",
        3000
      );
      console.log("Anthropic selected as AI provider");
    }
  );

  // Register command to select Anthropic Help as the provider
  let selectAnthropicHelp = commands.registerCommand(
    "extension.selectAnthropicHelp",
    () => {
      selectedModelAPI = "AnthropicHelp";
      window.setStatusBarMessage("(Help) Anthropic selected as AI provider");
      console.log("Anthropic selected as AI provider");
    }
  );

  let disposable = commands.registerCommand(
    "extension.sendToAPI",

    async () => {
      console.log("Making API Request to AI provider");
      const editor = window.activeTextEditor;

      if (editor) {
        const document = editor.document;
        const fileContent = document.getText();
        const workspaceFolder = workspace.workspaceFolders?.[0]?.uri.fsPath;

        // Get the configuration for the selected model
        const modelConfigData = modelConfig[selectedModelAPI];

        if (!modelConfigData) {
          window.showErrorMessage(
            `Configuration not found for model: ${selectedModelAPI}`
          );
          return;
        }

        // Create messages based on the selected model's configuration (system or helpful prompt)
        if (selectedModelAPI.includes("Help")) {
          modelConfigData.messages = [
            { role: "system", content: modelConfigData.helpful_prompt },
            { role: "user", content: fileContent },
          ];
        } else {
          modelConfigData.messages = [
            { role: "system", content: modelConfigData.system_prompt },
            { role: "user", content: fileContent },
          ];
        }
        // Create the requestData object based on the selected model's configuration
        const requestData: RequestData = {
          model: modelConfigData.model,
          max_tokens: modelConfigData.max_tokens,
          messages: modelConfigData.messages,
        };

        // Choose the AI provider (for example, based on a configuration)
        // TODO - Link this to a shortcut key
        let apiProvider: ApiProvider;

        console.log("Debugging Info:");
        console.log("FileContent:", fileContent);
        console.log("RequestData:", requestData);
        console.log("ModelConfigData:", modelConfigData);
        console.log("ProviderType:", selectedModelAPI);

        switch (selectedModelAPI) {
          case "OpenAICode":
          case "OpenAIHelp":
            apiProvider = new OpenAICode(process.env.OPENAI_API_KEY || "");
            break;
          case "AnthropicCode":
          case "AnthropicHelp":
            apiProvider = new AnthropicCode(
              process.env.ANTHROPIC_API_KEY || ""
            );
            break;
          default:
            window.showErrorMessage("Invalid AI provider selected.");
            return;
        }

        try {
          //const apiResponse = await apiProvider.getResponse(requestData);
          const apiResponse = await apiProvider.getResponse(requestData);

          editor.edit((editBuilder) => {
            editBuilder.insert(editor.selection.active, `\n${apiResponse}`);
          });

          console.log("Response inserted from API.");
        } catch (error) {
          window.showErrorMessage("Failed to get a response from the API.");
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
