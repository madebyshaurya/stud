import { create } from "zustand";
import { persist } from "zustand/middleware";

export interface ApiKeys {
  openai?: string;
  anthropic?: string;
}

export type ProviderType = "openai" | "anthropic" | "codex";

export interface AppSettings {
  // UI Settings
  animationsEnabled: boolean;
  soundEnabled: boolean;
  compactMode: boolean;
  showToolDetails: boolean;

  // Behavior Settings
  autoScrollChat: boolean;
  confirmDestructiveActions: boolean;
  saveHistory: boolean;
  maxHistoryMessages: number;
}

export interface SettingsState {
  apiKeys: ApiKeys;
  selectedModel: string;
  selectedProvider: ProviderType;
  appSettings: AppSettings;

  // Actions
  setApiKey: (provider: keyof ApiKeys, key: string) => void;
  setSelectedModel: (model: string, provider: ProviderType) => void;
  hasApiKey: (provider: keyof ApiKeys) => boolean;
  getApiKey: (provider: keyof ApiKeys) => string | undefined;
  updateAppSettings: (settings: Partial<AppSettings>) => void;
  resetAppSettings: () => void;
}

const DEFAULT_APP_SETTINGS: AppSettings = {
  animationsEnabled: true,
  soundEnabled: false,
  compactMode: false,
  showToolDetails: true,
  autoScrollChat: true,
  confirmDestructiveActions: true,
  saveHistory: true,
  maxHistoryMessages: 100,
};

export const useSettingsStore = create<SettingsState>()(
  persist(
    (set, get) => ({
      apiKeys: {},
      selectedModel: "gpt-4o",
      selectedProvider: "codex" as ProviderType,
      appSettings: DEFAULT_APP_SETTINGS,

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

      updateAppSettings: (settings) =>
        set((state) => ({
          appSettings: { ...state.appSettings, ...settings },
        })),

      resetAppSettings: () =>
        set({ appSettings: DEFAULT_APP_SETTINGS }),
    }),
    {
      name: "stud-settings",
    }
  )
);
