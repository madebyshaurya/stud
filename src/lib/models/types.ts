/**
 * Model and Provider type definitions
 * Based on models.dev API schema (same as opencode fork)
 */

import { z } from "zod";

// Model schema from models.dev
export const ModelSchema = z.object({
  id: z.string(),
  name: z.string(),
  family: z.string().optional(),
  release_date: z.string().optional(),
  attachment: z.boolean().default(false),
  reasoning: z.boolean().default(false),
  temperature: z.boolean().default(true),
  tool_call: z.boolean().default(true),
  cost: z
    .object({
      input: z.number(),
      output: z.number(),
      cache_read: z.number().optional(),
      cache_write: z.number().optional(),
    })
    .optional(),
  limit: z
    .object({
      context: z.number(),
      input: z.number().optional(),
      output: z.number(),
    })
    .optional(),
  modalities: z
    .object({
      input: z.array(z.string()),
      output: z.array(z.string()),
    })
    .optional(),
  experimental: z.boolean().optional(),
  status: z.enum(["alpha", "beta", "deprecated"]).optional(),
  options: z.record(z.string(), z.unknown()).optional(),
});

export type Model = z.infer<typeof ModelSchema>;

// Provider schema from models.dev
export const ProviderSchema = z.object({
  id: z.string(),
  name: z.string(),
  api: z.string().optional(),
  env: z.array(z.string()).optional(),
  npm: z.string().optional(),
  models: z.record(z.string(), ModelSchema),
});

export type ProviderData = z.infer<typeof ProviderSchema>;

// Full response from models.dev/api.json
export type ProvidersData = Record<string, ProviderData>;

// Simplified model for UI display
export interface DisplayModel {
  id: string;
  name: string;
  description?: string;
  reasoning?: boolean;
  attachment?: boolean;
  provider: string;
  status?: "alpha" | "beta" | "deprecated";
  isNew?: boolean;
}

// Models allowed for Codex (ChatGPT Plus/Pro) - from models.dev
export const CODEX_ALLOWED_MODELS = new Set([
  // GPT-5 series (latest)
  "gpt-5",
  "gpt-5-mini",
  "gpt-5-nano",
  "gpt-5-pro",
  "gpt-5-thinking",
  "gpt-5.1",
  "gpt-5.1-chat-latest",
  "gpt-5.2",
  "gpt-5.2-chat-latest",
  // GPT-4 series
  "gpt-4o",
  "gpt-4o-mini",
  "gpt-4.1",
  "gpt-4.1-mini",
  "gpt-4.1-nano",
  "chatgpt-4o-latest",
  // Reasoning models
  "o1",
  "o1-mini",
  "o1-pro",
  "o3",
  "o3-mini",
  "o3-pro",
  "o4-mini",
]);

// Fallback models when offline - from models.dev
export const FALLBACK_CODEX_MODELS: DisplayModel[] = [
  // GPT-5 series (top priority for ChatGPT Plus/Pro users)
  { id: "gpt-5.2", name: "GPT-5.2", description: "Latest GPT-5.2", provider: "openai", isNew: true },
  { id: "gpt-5.2-chat-latest", name: "GPT-5.2 Latest", description: "Most recent GPT-5.2", provider: "openai", isNew: true },
  { id: "gpt-5.1", name: "GPT-5.1", description: "GPT-5.1 release", provider: "openai", isNew: true },
  { id: "gpt-5.1-chat-latest", name: "GPT-5.1 Latest", description: "Most recent GPT-5.1", provider: "openai", isNew: true },
  { id: "gpt-5", name: "GPT-5", description: "Base GPT-5 model", provider: "openai", isNew: true },
  { id: "gpt-5-pro", name: "GPT-5 Pro", description: "Pro version", provider: "openai", isNew: true },
  { id: "gpt-5-mini", name: "GPT-5 Mini", description: "Fast and efficient", provider: "openai", isNew: true },
  { id: "gpt-5-nano", name: "GPT-5 Nano", description: "Ultrafast", provider: "openai", isNew: true },
  { id: "gpt-5-thinking", name: "GPT-5 Thinking", description: "Extended reasoning", provider: "openai", isNew: true, reasoning: true },
  // GPT-4 series
  { id: "chatgpt-4o-latest", name: "ChatGPT-4o Latest", description: "Latest ChatGPT-4o", provider: "openai" },
  { id: "gpt-4o", name: "GPT-4o", description: "GPT-4 Omni multimodal", provider: "openai" },
  { id: "gpt-4o-mini", name: "GPT-4o Mini", description: "Fast and efficient", provider: "openai" },
  { id: "gpt-4.1", name: "GPT-4.1", description: "GPT-4.1 release", provider: "openai" },
  { id: "gpt-4.1-mini", name: "GPT-4.1 Mini", description: "Compact GPT-4.1", provider: "openai" },
  { id: "gpt-4.1-nano", name: "GPT-4.1 Nano", description: "Ultrafast GPT-4.1", provider: "openai" },
  // Reasoning models
  { id: "o3", name: "o3", description: "Latest reasoning model", reasoning: true, provider: "openai", isNew: true },
  { id: "o3-mini", name: "o3 Mini", description: "Fast reasoning", reasoning: true, provider: "openai" },
  { id: "o3-pro", name: "o3 Pro", description: "Advanced reasoning", reasoning: true, provider: "openai", isNew: true },
  { id: "o4-mini", name: "o4 Mini", description: "Next-gen reasoning", reasoning: true, provider: "openai", isNew: true },
  { id: "o1", name: "o1", description: "Original reasoning model", reasoning: true, provider: "openai" },
  { id: "o1-mini", name: "o1 Mini", description: "Fast o1 variant", reasoning: true, provider: "openai" },
  { id: "o1-pro", name: "o1 Pro", description: "Pro reasoning", reasoning: true, provider: "openai" },
];
