/**
 * Model fetching and caching logic
 * Fetches from models.dev (same source as opencode fork)
 */

import { fetch as tauriFetch } from "@tauri-apps/plugin-http";
import type { ProvidersData, DisplayModel, Model } from "./types";
import { FALLBACK_CODEX_MODELS, CODEX_ALLOWED_MODELS } from "./types";

export { FALLBACK_CODEX_MODELS };

const MODELS_URL = "https://models.dev/api.json";
const CACHE_KEY = "stud_models_cache";
const CACHE_TTL_MS = 60 * 60 * 1000; // 1 hour

interface ModelsCache {
  data: ProvidersData;
  timestamp: number;
  version: number;
}

const CACHE_VERSION = 1;

/**
 * Get cached models from localStorage
 */
export function getModelsFromCache(): ModelsCache | null {
  try {
    const cached = localStorage.getItem(CACHE_KEY);
    if (!cached) return null;

    const parsed: ModelsCache = JSON.parse(cached);

    // Check version
    if (parsed.version !== CACHE_VERSION) {
      localStorage.removeItem(CACHE_KEY);
      return null;
    }

    return parsed;
  } catch {
    return null;
  }
}

/**
 * Check if cache is still valid
 */
export function isCacheValid(cache: ModelsCache | null): boolean {
  if (!cache) return false;
  return Date.now() - cache.timestamp < CACHE_TTL_MS;
}

/**
 * Save models to localStorage cache
 */
export function saveModelsToCache(data: ProvidersData): void {
  const cache: ModelsCache = {
    data,
    timestamp: Date.now(),
    version: CACHE_VERSION,
  };
  localStorage.setItem(CACHE_KEY, JSON.stringify(cache));
}

/**
 * Clear the models cache
 */
export function clearModelsCache(): void {
  localStorage.removeItem(CACHE_KEY);
}

/**
 * Fetch all models from models.dev
 * Uses Tauri HTTP plugin to bypass CORS
 */
export async function fetchAllModels(): Promise<ProvidersData> {
  const response = await tauriFetch(MODELS_URL, {
    method: "GET",
    headers: {
      "User-Agent": "Stud/1.0",
    },
  });

  if (!response.ok) {
    throw new Error(`Failed to fetch models: ${response.status} ${response.statusText}`);
  }

  const data = await response.json();
  return data as ProvidersData;
}

/**
 * Get models with cache-first strategy
 */
export async function getModelsWithCache(): Promise<ProvidersData> {
  // Check cache first
  const cached = getModelsFromCache();
  if (isCacheValid(cached)) {
    console.log("[Models] Using cached models");
    return cached!.data;
  }

  // Fetch fresh data
  try {
    console.log("[Models] Fetching fresh models from models.dev");
    const data = await fetchAllModels();
    saveModelsToCache(data);
    return data;
  } catch (error) {
    console.error("[Models] Fetch failed:", error);

    // Use stale cache if available
    if (cached) {
      console.log("[Models] Using stale cache as fallback");
      return cached.data;
    }

    // Return empty - will use fallback models
    throw error;
  }
}

/**
 * Convert raw model to display format
 */
function modelToDisplay(id: string, model: Model, provider: string): DisplayModel {
  // Check if this is a new model (GPT-5 series, o3, o4)
  const isNew = id.includes("5.") || id.includes("o3") || id.includes("o4");

  return {
    id,
    name: model.name,
    description: model.family || undefined,
    reasoning: model.reasoning,
    attachment: model.attachment,
    provider,
    status: model.status,
    isNew,
  };
}

/**
 * Extract Codex-compatible models from OpenAI provider
 */
export function extractCodexModels(providers: ProvidersData): DisplayModel[] {
  const openai = providers.openai;
  if (!openai?.models) {
    return FALLBACK_CODEX_MODELS;
  }

  const models: DisplayModel[] = [];

  for (const [id, model] of Object.entries(openai.models)) {
    // Only include models allowed for Codex
    if (CODEX_ALLOWED_MODELS.has(id)) {
      models.push(modelToDisplay(id, model, "openai"));
    }
  }

  // Sort: non-reasoning first, then by name
  models.sort((a, b) => {
    if (a.reasoning !== b.reasoning) {
      return a.reasoning ? 1 : -1;
    }
    return a.name.localeCompare(b.name);
  });

  return models.length > 0 ? models : FALLBACK_CODEX_MODELS;
}

/**
 * Extract models for a specific provider
 */
export function extractProviderModels(
  providers: ProvidersData,
  providerId: string
): DisplayModel[] {
  const provider = providers[providerId];
  if (!provider?.models) return [];

  return Object.entries(provider.models).map(([id, model]) =>
    modelToDisplay(id, model, providerId)
  );
}
