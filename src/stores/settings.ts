import { create } from "zustand";
import { persist } from "zustand/middleware";

export interface ApiKeys {
  openai?: string;
  anthropic?: string;
}

export type ProviderType = "openai" | "anthropic" | "codex";

export interface SettingsState {
  apiKeys: ApiKeys;
  selectedModel: string;
  selectedProvider: ProviderType;

  // Actions
  setApiKey: (provider: keyof ApiKeys, key: string) => void;
  setSelectedModel: (model: string, provider: ProviderType) => void;
  hasApiKey: (provider: keyof ApiKeys) => boolean;
  getApiKey: (provider: keyof ApiKeys) => string | undefined;
}

export const useSettingsStore = create<SettingsState>()(
  persist(
    (set, get) => ({
      apiKeys: {},
      selectedModel: "gpt-4o",
      selectedProvider: "codex" as ProviderType,

      setApiKey: (provider, key) =>
        set((state) => ({
          apiKeys: { ...state.apiKeys, [provider]: key },
        })),

      setSelectedModel: (model, provider) =>
        set({
          selectedModel: model,
          selectedProvider: provider,
        }),

      hasApiKey: (provider) => {
        const key = get().apiKeys[provider];
        return !!key && key.length > 0;
      },

      getApiKey: (provider) => get().apiKeys[provider],
    }),
    {
      name: "stud-settings",
    }
  )
);
