/**
 * Codex Chat - Direct API integration with ChatGPT Plus/Pro Codex endpoint
 * Uses the Responses API format instead of Chat/Completions
 */

import { fetch as tauriFetch } from "@tauri-apps/plugin-http";
import { getValidAccessToken, getStoredAuth } from "@/lib/auth/codex";
import { ROBLOX_SYSTEM_PROMPT } from "./providers";

const CODEX_API_ENDPOINT = "https://chatgpt.com/backend-api/codex/responses";

export interface CodexMessage {
  role: "user" | "assistant";
  content: string;
}

export interface CodexChatCallbacks {
  onToken?: (token: string) => void;
  onFinish?: (text: string) => void;
  onError?: (error: Error) => void;
}

/**
 * Convert chat messages to Codex Responses API input format
 */
function convertToCodexInput(messages: CodexMessage[]) {
  const input: Array<{ role: string; content: unknown }> = [];

  for (const msg of messages) {
    if (msg.role === "user") {
      input.push({
        role: "user",
        content: [{ type: "input_text", text: msg.content }],
      });
    } else if (msg.role === "assistant") {
      input.push({
        role: "assistant",
        content: [{ type: "output_text", text: msg.content }],
      });
    }
  }

  return input;
}

/**
 * Stream chat with Codex API
 */
export async function codexChat(
  model: string,
  messages: CodexMessage[],
  callbacks?: CodexChatCallbacks
): Promise<string> {
  console.log("[CodexChat] Starting with model:", model);

  const accessToken = await getValidAccessToken();
  if (!accessToken) {
    throw new Error("Not authenticated with ChatGPT Plus/Pro");
  }

  const auth = getStoredAuth();

  // Build request body in Responses API format
  const body = {
    model,
    instructions: ROBLOX_SYSTEM_PROMPT,
    input: convertToCodexInput(messages),
    stream: true,
    store: false,  // Required by Codex API
  };

  console.log("[CodexChat] Request body:", JSON.stringify(body, null, 2));

  // Build headers
  const headers: Record<string, string> = {
    Authorization: `Bearer ${accessToken}`,
    "Content-Type": "application/json",
  };

  if (auth?.accountId) {
    headers["ChatGPT-Account-Id"] = auth.accountId;
  }

  try {
    const response = await tauriFetch(CODEX_API_ENDPOINT, {
      method: "POST",
      headers,
      body: JSON.stringify(body),
    });

    console.log("[CodexChat] Response status:", response.status);

    if (!response.ok) {
      const errorText = await response.text();
      console.error("[CodexChat] Error response:", errorText);
      throw new Error(`Codex API error: ${response.status} - ${errorText}`);
    }

    // Handle streaming response
    const reader = response.body?.getReader();
    if (!reader) {
      throw new Error("No response body");
    }

    const decoder = new TextDecoder();
    let fullText = "";
    let buffer = "";

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;

      buffer += decoder.decode(value, { stream: true });

      // Process SSE events
      const lines = buffer.split("\n");
      buffer = lines.pop() || ""; // Keep incomplete line in buffer

      for (const line of lines) {
        if (line.startsWith("data: ")) {
          const data = line.slice(6);
          if (data === "[DONE]") continue;

          try {
            const parsed = JSON.parse(data);

            // Extract text content from the response
            if (parsed.type === "response.output_text.delta") {
              const text = parsed.delta || "";
              fullText += text;
              callbacks?.onToken?.(text);
            } else if (parsed.type === "response.output_item.done") {
              // Extract text from completed output item
              const content = parsed.item?.content;
              if (content && Array.isArray(content)) {
                for (const part of content) {
                  if (part.type === "output_text" && part.text) {
                    // Only add if not already in fullText
                    if (!fullText.includes(part.text)) {
                      fullText += part.text;
                      callbacks?.onToken?.(part.text);
                    }
                  }
                }
              }
            }
          } catch {
            // Skip unparseable lines
          }
        }
      }
    }

    console.log("[CodexChat] Complete, text length:", fullText.length);
    callbacks?.onFinish?.(fullText);
    return fullText;
  } catch (error) {
    console.error("[CodexChat] Error:", error);
    const err = error instanceof Error ? error : new Error(String(error));
    callbacks?.onError?.(err);
    throw err;
  }
}
