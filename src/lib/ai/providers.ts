import { createOpenAI } from "@ai-sdk/openai";
import { createAnthropic } from "@ai-sdk/anthropic";
import { streamText, stepCountIs } from "ai";
import { useSettingsStore } from "@/stores/settings";
import { useAuthStore } from "@/stores/auth";
import { robloxTools } from "@/lib/roblox";
import { isAuthenticated as isCodexAuthenticated } from "@/lib/auth/codex";
import { codexChat } from "./codex-chat";

export type ProviderType = "openai" | "anthropic" | "codex";

export function getProvider(type: ProviderType, apiKey: string) {
  switch (type) {
    case "openai":
      return createOpenAI({ apiKey });
    case "anthropic":
      return createAnthropic({ apiKey });
    case "codex":
      // Codex uses its own chat function, this is a fallback
      return createOpenAI({ apiKey });
    default:
      throw new Error(`Unknown provider: ${type}`);
  }
}

export function getModelId(_provider: ProviderType, modelId: string) {
  // The model ID is already in the correct format
  return modelId;
}

// System prompt for Roblox development
export const ROBLOX_SYSTEM_PROMPT = `You are Stud, an AI assistant specialized in Roblox game development. You have direct access to Roblox Studio through a set of tools that allow you to:

- Read and modify scripts (Script, LocalScript, ModuleScript)
- Explore the game hierarchy and instance properties
- Create, delete, clone, and move instances
- Set properties on instances
- Execute Luau code directly in Studio
- Search for instances by name or class

When connected to Studio, use your tools to help developers:
1. Write and debug Luau scripts (Roblox's Lua variant)
2. Design game mechanics and systems
3. Modify the game structure directly
4. Follow best practices for performance and security

Key Luau differences from standard Lua:
- Use \`task.wait()\` instead of \`wait()\`
- Use \`task.spawn()\` instead of \`spawn()\`
- Type annotations are supported: \`local x: number = 5\`
- \`continue\` keyword works in loops
- String interpolation: \`\\\`Hello {name}!\\\`\`

Common services you'll work with:
- Players, Workspace, ReplicatedStorage, ServerStorage
- ServerScriptService, StarterGui, StarterPack
- TweenService, UserInputService, RunService

When using tools:
- Always use full instance paths (e.g., game.Workspace.Part1)
- Read scripts before editing them
- Be careful with delete operations - they cannot be undone

Always provide clean, well-commented code following Roblox conventions.`;

export interface ToolCallEvent {
  id: string;
  name: string;
  input: Record<string, unknown>;
}

export interface ToolResultEvent {
  id: string;
  output: unknown;
}

export interface ChatCallbacks {
  onToken?: (token: string) => void;
  onToolCall?: (toolCall: ToolCallEvent) => void;
  onToolResult?: (toolResult: ToolResultEvent) => void;
  onFinish?: (text: string) => void;
  onError?: (error: Error) => void;
}

export interface ChatOptions extends ChatCallbacks {
  model: string;
  provider: ProviderType;
  apiKey: string;
  messages: Array<{ role: "user" | "assistant"; content: string }>;
}

export async function chat(options: ChatOptions) {
  const { model, provider, apiKey, messages, onToken, onToolCall, onToolResult, onFinish, onError } = options;

  console.log("[Chat] Starting chat with:", { model, provider, messageCount: messages.length });

  try {
    // Use Codex chat for ChatGPT Plus/Pro (bypasses CORS via Tauri HTTP plugin)
    if (provider === "codex") {
      console.log("[Chat] Using Codex chat for ChatGPT Plus/Pro");
      return codexChat(model, messages, { onToken, onFinish, onError });
    }

    // For OpenAI/Anthropic, use standard AI SDK
    const providerInstance = getProvider(provider, apiKey);

    console.log("[Chat] Created provider instance, starting stream...");

    const result = streamText({
      model: providerInstance(model),
      system: ROBLOX_SYSTEM_PROMPT,
      tools: robloxTools,
      stopWhen: stepCountIs(10), // Allow up to 10 steps for multi-step tool calls
      messages: messages.map((m) => ({
        role: m.role,
        content: m.content,
      })),
    });

    let fullText = "";

    console.log("[Chat] Consuming stream...");

    // Use fullStream to capture all events including tool calls
    for await (const event of result.fullStream) {
      switch (event.type) {
        case "text-delta":
          fullText += event.text;
          onToken?.(event.text);
          break;

        case "tool-call":
          console.log("[Chat] Tool call:", event.toolName);
          onToolCall?.({
            id: event.toolCallId,
            name: event.toolName,
            input: event.input as Record<string, unknown>,
          });
          break;

        case "tool-result":
          console.log("[Chat] Tool result for:", event.toolCallId);
          onToolResult?.({
            id: event.toolCallId,
            output: event.output,
          });
          break;

        case "error":
          console.error("[Chat] Stream error:", event.error);
          break;
      }
    }

    console.log("[Chat] Stream complete, text length:", fullText.length);
    onFinish?.(fullText);
    return fullText;
  } catch (error) {
    console.error("[Chat] Error:", error);
    const err = error instanceof Error ? error : new Error(String(error));
    onError?.(err);
    throw err;
  }
}

// Hook for using chat in components
export function useChat() {
  const { selectedModel, selectedProvider, getApiKey } = useSettingsStore();
  const { authMethod, isOAuthAuthenticated } = useAuthStore();

  const sendMessage = async (
    messages: Array<{ role: "user" | "assistant"; content: string }>,
    callbacks?: ChatCallbacks
  ) => {
    // Determine provider and auth method
    let provider: ProviderType;
    let apiKey: string;
    let model: string;

    console.log("[useChat] Selected provider:", selectedProvider, "Model:", selectedModel);
    console.log("[useChat] Auth method:", authMethod, "OAuth authenticated:", isOAuthAuthenticated());

    // Check if using Codex (either via authMethod=oauth or selectedProvider=codex)
    const useCodex =
      (authMethod === "oauth" && isOAuthAuthenticated()) || selectedProvider === "codex";

    if (useCodex && isOAuthAuthenticated()) {
      // Use Codex with OAuth
      console.log("[useChat] Using Codex with OAuth");
      provider = "codex";
      apiKey = "codex-oauth"; // Dummy, actual auth handled in codexFetch
      model = selectedModel;
    } else if (useCodex && !isOAuthAuthenticated()) {
      // Codex selected but not authenticated - try OpenAI API key
      console.log("[useChat] Codex selected but not OAuth authenticated, trying OpenAI API key");
      const openaiKey = getApiKey("openai");
      if (openaiKey) {
        provider = "openai";
        apiKey = openaiKey;
        model = selectedModel;
      } else {
        throw new Error("Please sign in with ChatGPT Plus/Pro or add an OpenAI API key in settings");
      }
    } else {
      // Use API key
      provider = selectedProvider === "codex" ? "openai" : selectedProvider;
      const key = getApiKey(provider as "openai" | "anthropic");

      if (!key) {
        throw new Error(`No API key configured for ${provider}. Please add one in settings or sign in with ChatGPT Plus/Pro.`);
      }

      console.log("[useChat] Using API key for provider:", provider);
      apiKey = key;
      model = selectedModel;
    }

    return chat({
      model,
      provider,
      apiKey,
      messages,
      ...callbacks,
    });
  };

  return { sendMessage };
}

// Check if any auth is configured
export function hasAnyAuth(): boolean {
  const { apiKeys } = useSettingsStore.getState();
  const hasApiKey = !!(apiKeys.openai || apiKeys.anthropic);
  const hasOAuth = isCodexAuthenticated();
  return hasApiKey || hasOAuth;
}
