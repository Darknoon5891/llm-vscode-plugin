import { ExtensionContext, commands, window, workspace } from "vscode";
import { config } from "dotenv";
import { ApiProvider, OpenAIHelp, AnthropicHelp } from "./apiProviders";
import { RequestData, Message } from "./types";
const modelConfig = require("../config.json");

// Instructions to add a new AI provider:
// add config and function in apiProviders.ts to add a new llm provider.
// add shortcut key and register command if required.
// add .env api key if required.

// Load environment variables from .env file
config({ path: __dirname + "/../.env" });

export function activate(context: ExtensionContext) {
  console.log("LLM Plugin Extension Activated");

  // Define the API provider to use
  let selectedModelAPI = "NONE";

  // Register command to select OpenAI as the provider
  let selectOpenAI = commands.registerCommand("extension.selectOpenAI", () => {
    selectedModelAPI = "OpenAIHelp";
    window.showInformationMessage("OpenAI selected as AI provider");
    console.log("OpenAI selected as AI provider");
  });

  // Register command to select Anthropic as the provider
  let selectAnthropic = commands.registerCommand(
    "extension.selectAnthropic",
    () => {
      selectedModelAPI = "AnthropicHelp";
      window.showInformationMessage("Anthropic selected as AI provider");
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

        // Create messages based on the selected model's configuration
        const messages: Message[] = [
          { role: "system", content: modelConfigData.system_prompt },
          { role: "user", content: fileContent },
        ];

        // Create the requestData object based on the selected model's configuration
        const requestData: RequestData = {
          model: modelConfigData.model,
          max_tokens: modelConfigData.max_tokens,
          messages: messages,
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
          case "OpenAIHelp":
            apiProvider = new OpenAIHelp(process.env.OPENAI_API_KEY || "");
            break;
          case "AnthropicHelp":
            apiProvider = new AnthropicHelp(
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
