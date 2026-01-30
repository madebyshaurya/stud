import { describe, it, expect, vi, beforeEach } from "vitest";
import { http, HttpResponse } from "msw";
import { server } from "@/test/setup";
import { useModelsStore } from "../models";
import { FALLBACK_CODEX_MODELS, type ProvidersData } from "@/lib/models/types";

// Mock response from models.dev
const mockProvidersData: ProvidersData = {
  openai: {
    id: "openai",
    name: "OpenAI",
    models: {
      "gpt-4o": {
        id: "gpt-4o",
        name: "GPT-4o",
        reasoning: false,
        attachment: true,
        temperature: true,
        tool_call: true,
        limit: { context: 128000, output: 4096 },
      },
      "gpt-4o-mini": {
        id: "gpt-4o-mini",
        name: "GPT-4o Mini",
        reasoning: false,
        attachment: true,
        temperature: true,
        tool_call: true,
        limit: { context: 128000, output: 4096 },
      },
    },
  },
};

describe("Models Store", () => {
  beforeEach(() => {
    // Reset store state
    useModelsStore.setState({
      providers: null,
      codexModels: FALLBACK_CODEX_MODELS,
      isLoading: false,
      lastFetched: null,
      error: null,
    });
  });

  describe("initial state", () => {
    it("should have fallback models initially", () => {
      const state = useModelsStore.getState();

      expect(state.codexModels).toEqual(FALLBACK_CODEX_MODELS);
      expect(state.providers).toBeNull();
      expect(state.isLoading).toBe(false);
      expect(state.lastFetched).toBeNull();
      expect(state.error).toBeNull();
    });
  });

  describe("fetchModels", () => {
    it("should fetch and store models", async () => {
      server.use(
        http.get("https://models.dev/api.json", () => {
          return HttpResponse.json(mockProvidersData);
        })
      );

      await useModelsStore.getState().fetchModels();

      const state = useModelsStore.getState();
      expect(state.providers).toEqual(mockProvidersData);
      expect(state.codexModels.length).toBeGreaterThan(0);
      expect(state.isLoading).toBe(false);
      expect(state.lastFetched).not.toBeNull();
      expect(state.error).toBeNull();
    });

    it("should set loading state during fetch", async () => {
      let resolveRequest: () => void;
      const requestPromise = new Promise<void>((resolve) => {
        resolveRequest = resolve;
      });

      server.use(
        http.get("https://models.dev/api.json", async () => {
          await requestPromise;
          return HttpResponse.json(mockProvidersData);
        })
      );

      const fetchPromise = useModelsStore.getState().fetchModels();

      // Check loading state is true while fetching
      expect(useModelsStore.getState().isLoading).toBe(true);

      resolveRequest!();
      await fetchPromise;

      expect(useModelsStore.getState().isLoading).toBe(false);
    });

    it("should handle fetch errors gracefully", async () => {
      server.use(
        http.get("https://models.dev/api.json", () => {
          return HttpResponse.error();
        })
      );

      await useModelsStore.getState().fetchModels();

      const state = useModelsStore.getState();
      expect(state.error).not.toBeNull();
      expect(state.isLoading).toBe(false);
      // Should still have fallback models
      expect(state.codexModels).toEqual(FALLBACK_CODEX_MODELS);
    });

    it("should not fetch if already loading", async () => {
      const fetchSpy = vi.fn();

      server.use(
        http.get("https://models.dev/api.json", () => {
          fetchSpy();
          return HttpResponse.json(mockProvidersData);
        })
      );

      // Set loading state
      useModelsStore.setState({ isLoading: true });

      // Try to fetch - should be skipped
      await useModelsStore.getState().fetchModels();

      expect(fetchSpy).not.toHaveBeenCalled();
    });
  });

  describe("clearModels", () => {
    it("should reset to initial state", async () => {
      // First fetch some models
      server.use(
        http.get("https://models.dev/api.json", () => {
          return HttpResponse.json(mockProvidersData);
        })
      );

      await useModelsStore.getState().fetchModels();
      expect(useModelsStore.getState().providers).not.toBeNull();

      // Clear models
      useModelsStore.getState().clearModels();

      const state = useModelsStore.getState();
      expect(state.providers).toBeNull();
      expect(state.lastFetched).toBeNull();
      // codexModels should be reset to fallback (handled by store)
    });
  });

  describe("refreshModels", () => {
    it("should force a fresh fetch", async () => {
      const fetchSpy = vi.fn();

      server.use(
        http.get("https://models.dev/api.json", () => {
          fetchSpy();
          return HttpResponse.json(mockProvidersData);
        })
      );

      // First fetch (will be cached)
      await useModelsStore.getState().fetchModels();
      expect(fetchSpy).toHaveBeenCalledTimes(1);

      // Refresh should fetch again even with cache
      await useModelsStore.getState().refreshModels();
      expect(fetchSpy).toHaveBeenCalledTimes(2);
    });
  });
});
