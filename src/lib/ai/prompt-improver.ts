/**
 * Prompt Improver - Enhances user prompts to be more effective for Stud
 *
 * Takes a basic prompt and restructures it to be clearer, more specific,
 * and better suited for Stud's tool-based workflow.
 */

import { fetch as tauriFetch } from "@tauri-apps/plugin-http";
import { getValidAccessToken, getStoredAuth } from "@/lib/auth/codex";
import { useSettingsStore } from "@/stores/settings";
import { useAuthStore } from "@/stores/auth";

const IMPROVE_PROMPT_SYSTEM = `You are a prompt improvement assistant for Stud, an AI agent for Roblox Studio.

Your job is to take a user's rough prompt and improve it to be more effective for Stud's capabilities.

Stud has these tools:
- Create, delete, clone, move instances
- Read/write/edit scripts (Luau)
- Set properties on instances
- Search Roblox Toolbox for free models
- Insert free assets from Toolbox
- Execute Luau code in Studio
- Ask user questions when needed

When improving prompts, you should:
1. Make requirements explicit and specific
2. Break complex tasks into clear phases if needed
3. Suggest using Toolbox for assets when appropriate
4. Clarify what scripts/systems are needed
5. Mention any UI elements that should be created
6. Keep it concise but comprehensive

IMPORTANT:
- Return ONLY the improved prompt, no explanation or preamble
- Keep the user's intent intact
- Don't add requirements the user didn't ask for
- Make it actionable for an AI with Roblox Studio tools

Examples:

Input: "make a car"
Output: "Create a basic car in Workspace:
1. Search the Toolbox for a free car model and let me pick one
2. Insert the selected car into Workspace
3. If needed, add a VehicleSeat for driving
4. Make sure the car has a PrimaryPart set for proper physics"

Input: "add a shop"
Output: "Create a shop system with GUI and purchasing:
1. Create a ScreenGui with a shop interface (Frame, item buttons, currency display)
2. Add a ProximityPrompt on a shop part to open the GUI
3. Create a currency system using IntValue in the player's leaderstats
4. Add scripts to handle purchasing (deduct currency, give item)
5. Search Toolbox for shop-related decorations if needed"

Input: "fix the lag"
Output: "Analyze and optimize game performance:
1. List all scripts in the game and identify any with expensive loops
2. Check for unanchored parts that might be causing physics calculations
3. Look for memory leaks (connections not being disconnected)
4. Suggest specific optimizations based on what you find"`;

interface ImproveResult {
  improved: string;
  error?: string;
}

const CODEX_API_ENDPOINT = "https://chatgpt.com/backend-api/codex/responses";

/**
 * Improve a prompt using the Codex API (ChatGPT Plus/Pro)
 * Uses the same endpoint and format as the main chat
 */
async function improveWithCodex(prompt: string): Promise<ImproveResult> {
  const accessToken = await getValidAccessToken();
  if (!accessToken) {
    return { improved: prompt, error: "Not authenticated with ChatGPT" };
  }

  const auth = getStoredAuth();

  // Use the same model as the main chat - get from settings store
  const { selectedModel, selectedProvider } = useSettingsStore.getState();
  // Only use the selected model if it's a Codex provider, otherwise fall back to chatgpt-4o-latest
  const model = selectedProvider === "codex" ? selectedModel : "chatgpt-4o-latest";

  // Use the same format as codex-chat.ts
  const body = {
    model,
    instructions: IMPROVE_PROMPT_SYSTEM,
    input: [
      {
        role: "user",
        content: [{ type: "input_text", text: prompt }],
      },
    ],
    tools: [], // No tools needed for improvement
    stream: true,
    store: false,
  };

  const headers: Record<string, string> = {
    Authorization: `Bearer ${accessToken}`,
    "Content-Type": "application/json",
  };

  if (auth?.accountId) {
    headers["ChatGPT-Account-Id"] = auth.accountId;
  }

  try {
    console.log("[PromptImprover] Making Codex request...");

    const response = await tauriFetch(CODEX_API_ENDPOINT, {
      method: "POST",
      headers,
      body: JSON.stringify(body),
    });

    if (!response.ok) {
      const text = await response.text();
      console.error("[PromptImprover] Codex error:", response.status, text);
      return { improved: prompt, error: "Codex API error" };
    }

    // Parse streaming response (same as codex-chat.ts)
    const reader = response.body?.getReader();
    if (!reader) {
      return { improved: prompt, error: "No response body" };
    }

    const decoder = new TextDecoder();
    let text = "";
    let buffer = "";

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;

      buffer += decoder.decode(value, { stream: true });
      const lines = buffer.split("\n");
      buffer = lines.pop() || "";

      for (const line of lines) {
        if (!line.startsWith("data: ")) continue;

        const data = line.slice(6);
        if (data === "[DONE]") continue;

        try {
          const parsed = JSON.parse(data);

          // Text delta
          if (parsed.type === "response.output_text.delta") {
            text += parsed.delta || "";
          }

          // Completed text
          if (parsed.type === "response.output_item.done" && parsed.item?.content) {
            const content = parsed.item.content;
            if (Array.isArray(content)) {
              for (const part of content) {
                if (part.type === "output_text" && part.text && !text.includes(part.text)) {
                  text += part.text;
                }
              }
            }
          }
        } catch {
          // Skip unparseable lines
        }
      }
    }

    console.log("[PromptImprover] Got response:", text.length, "chars");
    return { improved: text.trim() || prompt };
  } catch (err) {
    console.error("[PromptImprover] Codex exception:", err);
    return { improved: prompt, error: "Failed to connect to ChatGPT" };
  }
}

/**
 * Improve a prompt using OpenAI API
 */
async function improveWithOpenAI(prompt: string, apiKey: string): Promise<ImproveResult> {
  try {
    const response = await tauriFetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "gpt-5-mini",
        messages: [
          { role: "system", content: IMPROVE_PROMPT_SYSTEM },
          { role: "user", content: prompt },
        ],
        max_tokens: 500,
        temperature: 0.7,
      }),
    });

    if (!response.ok) {
      console.error("[PromptImprover] OpenAI error:", response.status);
      return { improved: prompt, error: "OpenAI API error" };
    }

    const data = await response.json() as {
      choices?: Array<{ message?: { content?: string } }>;
    };

    const improved = data.choices?.[0]?.message?.content || prompt;
    return { improved: improved.trim() };
  } catch (err) {
    console.error("[PromptImprover] OpenAI exception:", err);
    return { improved: prompt, error: "Failed to connect to OpenAI" };
  }
}

/**
 * Improve a prompt using Anthropic API
 */
async function improveWithAnthropic(prompt: string, apiKey: string): Promise<ImproveResult> {
  try {
    const response = await tauriFetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "x-api-key": apiKey,
        "Content-Type": "application/json",
        "anthropic-version": "2023-06-01",
      },
      body: JSON.stringify({
        model: "claude-3-5-haiku-20241022",
        max_tokens: 500,
        system: IMPROVE_PROMPT_SYSTEM,
        messages: [{ role: "user", content: prompt }],
      }),
    });

    if (!response.ok) {
      console.error("[PromptImprover] Anthropic error:", response.status);
      return { improved: prompt, error: "Anthropic API error" };
    }

    const data = await response.json() as {
      content?: Array<{ text?: string }>;
    };

    const improved = data.content?.[0]?.text || prompt;
    return { improved: improved.trim() };
  } catch (err) {
    console.error("[PromptImprover] Anthropic exception:", err);
    return { improved: prompt, error: "Failed to connect to Anthropic" };
  }
}

/**
 * Improve a prompt for Stud - automatically picks the best available provider
 * Priority: OpenAI API > Anthropic API > Codex (ChatGPT Plus/Pro)
 */
export async function improvePrompt(prompt: string): Promise<ImproveResult> {
  if (!prompt.trim()) {
    return { improved: prompt, error: "Empty prompt" };
  }

  const { apiKeys } = useSettingsStore.getState();
  const { isOAuthAuthenticated } = useAuthStore.getState();

  // Prefer direct API access (faster, more reliable)
  if (apiKeys.openai) {
    console.log("[PromptImprover] Using OpenAI API");
    const result = await improveWithOpenAI(prompt, apiKeys.openai);
    if (!result.error) return result;
  }

  if (apiKeys.anthropic) {
    console.log("[PromptImprover] Using Anthropic API");
    const result = await improveWithAnthropic(prompt, apiKeys.anthropic);
    if (!result.error) return result;
  }

  // Fall back to Codex if OAuth is available
  if (isOAuthAuthenticated()) {
    console.log("[PromptImprover] Using Codex (ChatGPT Plus/Pro)");
    return improveWithCodex(prompt);
  }

  return { improved: prompt, error: "No API configured" };
}

/**
 * Check if prompt improvement is available
 */
export function canImprovePrompt(): boolean {
  const { apiKeys } = useSettingsStore.getState();
  const { isOAuthAuthenticated } = useAuthStore.getState();
  return !!(apiKeys.openai || apiKeys.anthropic || isOAuthAuthenticated());
}
