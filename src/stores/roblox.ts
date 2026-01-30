import { create } from "zustand";
import { isStudioConnected, isBridgeRunning } from "@/lib/roblox";

export type ConnectionStatus = "disconnected" | "bridge_only" | "connected";

export interface RobloxState {
  status: ConnectionStatus;
  lastCheck: Date | null;
  error: string | null;
  
  // Actions
  setStatus: (status: ConnectionStatus) => void;
  checkConnection: () => Promise<void>;
  startPolling: () => () => void;
}

export const useRobloxStore = create<RobloxState>()((set, get) => ({
  status: "disconnected",
  lastCheck: null,
  error: null,

  setStatus: (status) => set({ status }),
  
  checkConnection: async () => {
    try {
      // First check if bridge is running
      const bridgeUp = await isBridgeRunning();
      if (!bridgeUp) {
        set({ status: "disconnected", lastCheck: new Date(), error: null });
        return;
      }
      
      // Then check if Studio is connected
      const studioUp = await isStudioConnected();
      set({ 
        status: studioUp ? "connected" : "bridge_only", 
        lastCheck: new Date(),
        error: null 
      });
    } catch (e) {
      set({ 
        status: "disconnected", 
        lastCheck: new Date(),
        error: e instanceof Error ? e.message : "Unknown error" 
      });
    }
  },
  
  startPolling: () => {
    // Initial check
    get().checkConnection();
    
    // Poll every 2 seconds
    const interval = setInterval(() => {
      get().checkConnection();
    }, 2000);
    
    // Return cleanup function
    return () => clearInterval(interval);
  },
}));
