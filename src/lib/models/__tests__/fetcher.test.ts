import { describe, it, expect, beforeEach } from "vitest";
import { http, HttpResponse } from "msw";
import { server } from "@/test/setup";
import {
  fetchAllModels,
  getModelsFromCache,
  saveModelsToCache,
  clearModelsCache,
  isCacheValid,
  extractCodexModels,
} from "../fetcher";
import { FALLBACK_CODEX_MODELS, type ProvidersData } from "../types";

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
      "o1": {
        id: "o1",
        name: "o1",
        reasoning: true,
        attachment: false,
        temperature: false,
        tool_call: true,
        limit: { context: 200000, output: 100000 },
      },
      "gpt-3.5-turbo": {
        id: "gpt-3.5-turbo",
        name: "GPT-3.5 Turbo",
        reasoning: false,
        attachment: false,
        temperature: true,
        tool_call: true,
        limit: { context: 16385, output: 4096 },
      },
    },
  },
  anthropic: {
    id: "anthropic",
    name: "Anthropic",
    models: {
      "claude-3-5-sonnet": {
        id: "claude-3-5-sonnet",
        name: "Claude 3.5 Sonnet",
        reasoning: false,
        attachment: true,
        temperature: true,
        tool_call: true,
        limit: { context: 200000, output: 8192 },
      },
    },
  },
};

describe("Models Fetcher", () => {
  describe("fetchAllModels", () => {
    it("should fetch models from models.dev", async () => {
      server.use(
        http.get("https://models.dev/api.json", () => {
          return HttpResponse.json(mockProvidersData);
        })
      );

      const result = await fetchAllModels();

      expect(result).toEqual(mockProvidersData);
      expect(result.openai).toBeDefined();
      expect(result.openai.models["gpt-4o"]).toBeDefined();
    });

    it("should throw on network error", async () => {
      server.use(
        http.get("https://models.dev/api.json", () => {
          return HttpResponse.error();
        })
      );

      await expect(fetchAllModels()).rejects.toThrow();
    });

    it("should throw on non-OK response", async () => {
      server.use(
        http.get("https://models.dev/api.json", () => {
          return new HttpResponse(null, { status: 500 });
        })
      );

      await expect(fetchAllModels()).rejects.toThrow(/Failed to fetch models/);
    });
  });

  describe("cache functions", () => {
    beforeEach(() => {
      clearModelsCache();
    });

    it("should return null when cache is empty", () => {
      const result = getModelsFromCache();
      expect(result).toBeNull();
    });

    it("should save and retrieve from cache", () => {
      saveModelsToCache(mockProvidersData);

      const cached = getModelsFromCache();
      expect(cached).not.toBeNull();
      expect(cached!.data).toEqual(mockProvidersData);
      expect(cached!.timestamp).toBeDefined();
    });

    it("should validate fresh cache", () => {
      saveModelsToCache(mockProvidersData);

      const cached = getModelsFromCache();
      expect(isCacheValid(cached)).toBe(true);
    });

    it("should invalidate old cache", () => {
      // Manually create old cache
      const oldCache = {
        data: mockProvidersData,
        timestamp: Date.now() - 2 * 60 * 60 * 1000, // 2 hours ago
        version: 1,
      };
      localStorage.setItem("stud_models_cache", JSON.stringify(oldCache));

      const cached = getModelsFromCache();
      expect(isCacheValid(cached)).toBe(false);
    });

    it("should clear cache", () => {
      saveModelsToCache(mockProvidersData);
      expect(getModelsFromCache()).not.toBeNull();

      clearModelsCache();
      expect(getModelsFromCache()).toBeNull();
    });
  });

  describe("extractCodexModels", () => {
    it("should extract only Codex-allowed models from OpenAI", () => {
      const models = extractCodexModels(mockProvidersData);

      // Should include gpt-4o, gpt-4o-mini, o1 but not gpt-3.5-turbo
      const ids = models.map((m) => m.id);
      expect(ids).toContain("gpt-4o");
      expect(ids).toContain("gpt-4o-mini");
      expect(ids).toContain("o1");
      expect(ids).not.toContain("gpt-3.5-turbo");
    });

    it("should sort reasoning models after regular models", () => {
      const models = extractCodexModels(mockProvidersData);

      const o1Index = models.findIndex((m) => m.id === "o1");
      const gpt4oIndex = models.findIndex((m) => m.id === "gpt-4o");

      // o1 (reasoning) should come after gpt-4o (non-reasoning)
      expect(o1Index).toBeGreaterThan(gpt4oIndex);
    });

    it("should mark reasoning models correctly", () => {
      const models = extractCodexModels(mockProvidersData);

      const o1 = models.find((m) => m.id === "o1");
      const gpt4o = models.find((m) => m.id === "gpt-4o");

      expect(o1?.reasoning).toBe(true);
      expect(gpt4o?.reasoning).toBe(false);
    });

    it("should return fallback models when OpenAI is missing", () => {
      const emptyProviders: ProvidersData = {};

      const models = extractCodexModels(emptyProviders);

      expect(models).toEqual(FALLBACK_CODEX_MODELS);
    });

    it("should return fallback models when OpenAI has no models", () => {
      const providers: ProvidersData = {
        openai: {
          id: "openai",
          name: "OpenAI",
          models: {},
        },
      };

      const models = extractCodexModels(providers);

      expect(models).toEqual(FALLBACK_CODEX_MODELS);
    });
  });
});
