import { create } from "zustand";
import { invoke } from "@tauri-apps/api/core";

export interface PluginStatus {
  installed: boolean;
  path: string;
  is_current_version: boolean;
  plugins_folder: string;
}

export interface InstallResult {
  success: boolean;
  path: string;
  message: string;
}

interface PluginState {
  status: PluginStatus | null;
  isChecking: boolean;
  isInstalling: boolean;
  error: string | null;
  
  // Actions
  checkPlugin: () => Promise<void>;
  installPlugin: () => Promise<InstallResult>;
  getPluginsPath: () => Promise<string>;
}

export const usePluginStore = create<PluginState>()((set, get) => ({
  status: null,
  isChecking: false,
  isInstalling: false,
  error: null,

  checkPlugin: async () => {
    set({ isChecking: true, error: null });
    try {
      const status = await invoke<PluginStatus>("check_plugin_installed");
      set({ status, isChecking: false });
    } catch (error) {
      set({ 
        error: error instanceof Error ? error.message : String(error),
        isChecking: false 
      });
    }
  },

  installPlugin: async () => {
    set({ isInstalling: true, error: null });
    try {
      const result = await invoke<InstallResult>("install_plugin");
      // Re-check status after install
      await get().checkPlugin();
      set({ isInstalling: false });
      return result;
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : String(error);
      set({ error: errorMsg, isInstalling: false });
      throw new Error(errorMsg);
    }
  },

  getPluginsPath: async () => {
    try {
      return await invoke<string>("get_plugins_path");
    } catch (error) {
      throw new Error(error instanceof Error ? error.message : String(error));
    }
  },
}));
