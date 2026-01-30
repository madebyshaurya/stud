/**
 * Models Store - manages fetching and caching of AI models
 * Models auto-refresh every hour from models.dev
 */

import { create } from "zustand";
import type { ProvidersData, DisplayModel } from "@/lib/models/types";
import {
  getModelsWithCache,
  extractCodexModels,
  clearModelsCache,
  FALLBACK_CODEX_MODELS,
} from "@/lib/models/fetcher";

// Auto-refresh interval: 1 hour
const AUTO_REFRESH_INTERVAL_MS = 60 * 60 * 1000;

interface ModelsState {
  // State
  providers: ProvidersData | null;
  codexModels: DisplayModel[];
  isLoading: boolean;
  lastFetched: number | null;
  error: string | null;

  // Actions
  fetchModels: () => Promise<void>;
  refreshModels: () => Promise<void>;
  clearModels: () => void;
  startAutoRefresh: () => void;
  stopAutoRefresh: () => void;
}

let autoRefreshTimer: ReturnType<typeof setInterval> | null = null;

export const useModelsStore = create<ModelsState>((set, get) => ({
  providers: null,
  codexModels: FALLBACK_CODEX_MODELS,
  isLoading: false,
  lastFetched: null,
  error: null,

  fetchModels: async () => {
    // Don't fetch if already loading
    if (get().isLoading) return;

    console.log("[Models] Starting fetch...");
    set({ isLoading: true, error: null });

    try {
      const providers = await getModelsWithCache();
      const codexModels = extractCodexModels(providers);

      set({
        providers,
        codexModels,
        lastFetched: Date.now(),
        isLoading: false,
        error: null,
      });

      console.log(`[Models] Loaded ${codexModels.length} Codex models:`, codexModels.map(m => m.id));
    } catch (error) {
      console.error("[Models] Failed to fetch:", error);
      set({
        isLoading: false,
        error: error instanceof Error ? error.message : "Failed to fetch models",
        // Keep existing models or use fallback
        codexModels: get().codexModels.length > 0 ? get().codexModels : FALLBACK_CODEX_MODELS,
      });
    }
  },

  refreshModels: async () => {
    console.log("[Models] Force refreshing...");
    // Clear cache to force fresh fetch
    clearModelsCache();
    await get().fetchModels();
  },

  clearModels: () => {
    clearModelsCache();
    set({
      providers: null,
      codexModels: FALLBACK_CODEX_MODELS,
      lastFetched: null,
      error: null,
    });
  },

  startAutoRefresh: () => {
    if (autoRefreshTimer) {
      console.log("[Models] Auto-refresh already running");
      return;
    }

    console.log("[Models] Starting auto-refresh (every hour)");
    autoRefreshTimer = setInterval(() => {
      console.log("[Models] Auto-refresh triggered");
      get().refreshModels();
    }, AUTO_REFRESH_INTERVAL_MS);
  },

  stopAutoRefresh: () => {
    if (autoRefreshTimer) {
      console.log("[Models] Stopping auto-refresh");
      clearInterval(autoRefreshTimer);
      autoRefreshTimer = null;
    }
  },
}));

// Auto-fetch models on store creation
setTimeout(() => {
  console.log("[Models] Initial fetch on load");
  useModelsStore.getState().fetchModels();
  // Start auto-refresh
  useModelsStore.getState().startAutoRefresh();
}, 100);
