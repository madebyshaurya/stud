/**
 * Prerequisite Check Store
 *
 * Checks all requirements on app startup and tracks their status.
 */

import { create } from "zustand";
import { invoke } from "@tauri-apps/api/core";
import { isBridgeRunning, isStudioConnected } from "@/lib/roblox/client";
import { useSettingsStore } from "./settings";
import { isAuthenticated } from "@/lib/auth/codex";

export interface PrereqCheck {
  id: string;
  name: string;
  description: string;
  status: "pending" | "checking" | "passed" | "failed" | "warning";
  message?: string;
  action?: {
    label: string;
    handler: string; // Action identifier
  };
}

interface PrereqStore {
  checks: PrereqCheck[];
  isChecking: boolean;
  hasChecked: boolean;
  showWizard: boolean;

  runAllChecks: () => Promise<void>;
  dismissWizard: () => void;
  getFailedChecks: () => PrereqCheck[];
  getWarningChecks: () => PrereqCheck[];
}

const initialChecks: PrereqCheck[] = [
  {
    id: "roblox-studio",
    name: "Roblox Studio",
    description: "Roblox Studio must be installed on your computer",
    status: "pending",
  },
  {
    id: "stud-plugin",
    name: "Stud Plugin",
    description: "The stud-bridge plugin must be installed in Studio",
    status: "pending",
  },
  {
    id: "api-provider",
    name: "AI Provider",
    description: "An API key or ChatGPT Plus/Pro login is required",
    status: "pending",
  },
  {
    id: "bridge-server",
    name: "Bridge Server",
    description: "The bridge server connects Stud to Roblox Studio",
    status: "pending",
  },
  {
    id: "studio-connection",
    name: "Studio Connection",
    description: "Roblox Studio should be connected via the plugin",
    status: "pending",
  },
];

export const usePrereqStore = create<PrereqStore>((set, get) => ({
  checks: initialChecks,
  isChecking: false,
  hasChecked: false,
  showWizard: false,

  runAllChecks: async () => {
    set({ isChecking: true });

    const checks = [...initialChecks];

    // Helper to update a specific check
    const updateCheck = (id: string, update: Partial<PrereqCheck>) => {
      const idx = checks.findIndex((c) => c.id === id);
      if (idx !== -1) {
        checks[idx] = { ...checks[idx], ...update };
      }
    };

    // 1. Check Roblox Studio installation
    updateCheck("roblox-studio", { status: "checking" });
    set({ checks: [...checks] });

    try {
      const studioInstalled = await invoke<boolean>("check_roblox_studio_installed");
      if (studioInstalled) {
        updateCheck("roblox-studio", { status: "passed", message: "Roblox Studio is installed" });
      } else {
        updateCheck("roblox-studio", {
          status: "failed",
          message: "Roblox Studio not found",
          action: { label: "Download Studio", handler: "download-studio" },
        });
      }
    } catch {
      // If command doesn't exist, assume installed (can't check)
      updateCheck("roblox-studio", { status: "passed", message: "Assuming installed" });
    }
    set({ checks: [...checks] });

    // 2. Check Stud plugin installation
    updateCheck("stud-plugin", { status: "checking" });
    set({ checks: [...checks] });

    try {
      const pluginStatus = await invoke<{ installed: boolean; is_current_version: boolean }>("check_plugin_installed");
      if (pluginStatus.installed && pluginStatus.is_current_version) {
        updateCheck("stud-plugin", { status: "passed", message: "Plugin is installed and up to date" });
      } else if (pluginStatus.installed) {
        updateCheck("stud-plugin", {
          status: "warning",
          message: "Plugin update available",
          action: { label: "Update Plugin", handler: "install-plugin" },
        });
      } else {
        updateCheck("stud-plugin", {
          status: "failed",
          message: "Plugin not installed",
          action: { label: "Install Plugin", handler: "install-plugin" },
        });
      }
    } catch {
      updateCheck("stud-plugin", {
        status: "warning",
        message: "Could not check plugin status",
        action: { label: "Install Plugin", handler: "install-plugin" },
      });
    }
    set({ checks: [...checks] });

    // 3. Check API provider
    updateCheck("api-provider", { status: "checking" });
    set({ checks: [...checks] });

    const { hasApiKey } = useSettingsStore.getState();
    const hasOpenAI = hasApiKey("openai");
    const hasAnthropic = hasApiKey("anthropic");
    const hasOAuth = isAuthenticated();

    if (hasOpenAI || hasAnthropic || hasOAuth) {
      const providers = [];
      if (hasOAuth) providers.push("ChatGPT Plus/Pro");
      if (hasOpenAI) providers.push("OpenAI");
      if (hasAnthropic) providers.push("Anthropic");
      updateCheck("api-provider", {
        status: "passed",
        message: `Configured: ${providers.join(", ")}`,
      });
    } else {
      updateCheck("api-provider", {
        status: "failed",
        message: "No AI provider configured",
        action: { label: "Open Settings", handler: "open-settings" },
      });
    }
    set({ checks: [...checks] });

    // 4. Check bridge server
    updateCheck("bridge-server", { status: "checking" });
    set({ checks: [...checks] });

    const bridgeUp = await isBridgeRunning();
    if (bridgeUp) {
      updateCheck("bridge-server", { status: "passed", message: "Bridge server is running" });
    } else {
      updateCheck("bridge-server", {
        status: "failed",
        message: "Bridge server not running",
        action: { label: "Restart App", handler: "restart-app" },
      });
    }
    set({ checks: [...checks] });

    // 5. Check Studio connection (only a warning, not required to use app)
    updateCheck("studio-connection", { status: "checking" });
    set({ checks: [...checks] });

    const studioUp = await isStudioConnected();
    if (studioUp) {
      updateCheck("studio-connection", { status: "passed", message: "Studio is connected" });
    } else {
      updateCheck("studio-connection", {
        status: "warning",
        message: "Studio not connected yet",
        action: { label: "Connect Studio", handler: "show-connection-help" },
      });
    }
    set({ checks: [...checks] });

    // Determine if we need to show wizard
    const failedChecks = checks.filter((c) => c.status === "failed");
    const showWizard = failedChecks.length > 0;

    set({
      checks,
      isChecking: false,
      hasChecked: true,
      showWizard,
    });
  },

  dismissWizard: () => {
    set({ showWizard: false });
  },

  getFailedChecks: () => {
    return get().checks.filter((c) => c.status === "failed");
  },

  getWarningChecks: () => {
    return get().checks.filter((c) => c.status === "warning");
  },
}));
