import { create } from "zustand";
import { persist } from "zustand/middleware";
import { openUrl } from "@tauri-apps/plugin-opener";
import {
  OAuthAuth,
  getStoredAuth,
  clearAuth,
  startOAuthLogin,
  handleOAuthCallback,
  isAuthenticated,
} from "@/lib/auth/codex";
import { useModelsStore } from "./models";

export type AuthMethod = "api_key" | "oauth";

interface AuthState {
  // Current auth method
  authMethod: AuthMethod;
  
  // OAuth state
  oauthAuth: OAuthAuth | null;
  isLoggingIn: boolean;
  loginError: string | null;
  loginUrl: string | null; // URL to show as fallback
  
  // Actions
  setAuthMethod: (method: AuthMethod) => void;
  startLogin: () => Promise<void>;
  completeLogin: (code: string, state: string) => Promise<void>;
  logout: () => void;
  checkOAuthCallback: () => Promise<boolean>;
  cancelLogin: () => void;

  // Getters
  isOAuthAuthenticated: () => boolean;
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set, get) => ({
      authMethod: "api_key",
      oauthAuth: getStoredAuth(),
      isLoggingIn: false,
      loginError: null,
      loginUrl: null,

      setAuthMethod: (method) => {
        set({ authMethod: method });
      },

      startLogin: async () => {
        set({ isLoggingIn: true, loginError: null, loginUrl: null });
        try {
          const { url } = await startOAuthLogin();
          // Store the URL for fallback display
          set({ loginUrl: url });
          // Try to open in default browser using Tauri's opener
          await openUrl(url);
        } catch (error) {
          // Even if browser open fails, we have the URL to show
          set({ 
            loginError: error instanceof Error ? error.message : String(error),
          });
        }
      },

      cancelLogin: () => {
        set({ isLoggingIn: false, loginUrl: null, loginError: null });
      },

      completeLogin: async (code: string, state: string) => {
        set({ isLoggingIn: true, loginError: null });
        try {
          const auth = await handleOAuthCallback(code, state);
          set({
            oauthAuth: auth,
            isLoggingIn: false,
            authMethod: "oauth",
          });
          // Fetch models after successful login
          useModelsStore.getState().fetchModels();
        } catch (error) {
          set({ 
            loginError: error instanceof Error ? error.message : String(error),
            isLoggingIn: false 
          });
          throw error;
        }
      },

      logout: () => {
        clearAuth();
        // Clear cached models on logout
        useModelsStore.getState().clearModels();
        set({
          oauthAuth: null,
          authMethod: "api_key",
          loginError: null,
        });
      },

      checkOAuthCallback: async () => {
        // Poll the OAuth callback server for pending auth data
        try {
          const response = await fetch("http://localhost:1455/auth/poll");
          if (!response.ok) return false;
          
          const data = await response.json();
          if (!data.pending) return false;
          
          const { code, state } = data;
          
          // Clear the callback data from the server
          await fetch("http://localhost:1455/auth/clear", { method: "POST" });
          
          if (code && state) {
            await get().completeLogin(code, state);
            return true;
          }
        } catch (error) {
          // Server not running or network error - ignore
          console.debug("[OAuth] Poll failed:", error);
        }
        return false;
      },

      isOAuthAuthenticated: () => {
        const result = isAuthenticated();
        console.log("[Auth] isOAuthAuthenticated:", result);
        return result;
      },
    }),
    {
      name: "stud-auth",
      partialize: (state) => ({ 
        authMethod: state.authMethod,
      }),
    }
  )
);

// Poll for OAuth callback completion
export function useOAuthCallbackPoller() {
  const { checkOAuthCallback, isLoggingIn } = useAuthStore();
  
  // Check periodically while logging in
  if (typeof window !== "undefined" && isLoggingIn) {
    const interval = setInterval(async () => {
      const completed = await checkOAuthCallback();
      if (completed) {
        clearInterval(interval);
      }
    }, 1000);
    
    // Cleanup after 5 minutes
    setTimeout(() => clearInterval(interval), 5 * 60 * 1000);
  }
}
