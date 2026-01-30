/**
 * ConnectionStatus - Shows real-time connection status to Roblox Studio
 */

import { useState, useEffect } from "react";
import { cn } from "@/lib/utils";
import { isStudioConnected, isBridgeRunning } from "@/lib/roblox/client";
import { Loader } from "@/components/ui/loader";
import { CheckCircle2, XCircle, AlertCircle, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";

type ConnectionState = "connected" | "disconnected" | "bridge-only" | "checking";

interface ConnectionStatusProps {
  className?: string;
  showLabel?: boolean;
  showRefresh?: boolean;
}

export function ConnectionStatus({
  className,
  showLabel = true,
  showRefresh = false,
}: ConnectionStatusProps) {
  const [state, setState] = useState<ConnectionState>("checking");
  const [checking, setChecking] = useState(false);

  const checkConnection = async () => {
    setChecking(true);
    try {
      const bridgeUp = await isBridgeRunning();
      if (!bridgeUp) {
        setState("disconnected");
        return;
      }

      const studioUp = await isStudioConnected();
      setState(studioUp ? "connected" : "bridge-only");
    } catch {
      setState("disconnected");
    } finally {
      setChecking(false);
    }
  };

  useEffect(() => {
    checkConnection();
    const interval = setInterval(checkConnection, 5000);
    return () => clearInterval(interval);
  }, []);

  const config = {
    connected: {
      icon: <CheckCircle2 className="w-3.5 h-3.5" />,
      label: "Connected",
      color: "text-green-600",
      bg: "bg-green-500/10",
      pulse: "bg-green-500",
    },
    "bridge-only": {
      icon: <AlertCircle className="w-3.5 h-3.5" />,
      label: "Waiting for Studio",
      color: "text-amber-600",
      bg: "bg-amber-500/10",
      pulse: "bg-amber-500",
    },
    disconnected: {
      icon: <XCircle className="w-3.5 h-3.5" />,
      label: "Disconnected",
      color: "text-red-600",
      bg: "bg-red-500/10",
      pulse: "bg-red-500",
    },
    checking: {
      icon: <Loader variant="circular" size="sm" />,
      label: "Checking...",
      color: "text-muted-foreground",
      bg: "bg-muted",
      pulse: "bg-muted-foreground",
    },
  };

  const current = config[state];

  return (
    <div
      className={cn(
        "flex items-center gap-2",
        className
      )}
    >
      <div
        className={cn(
          "flex items-center gap-1.5 px-2 py-1 rounded-full text-xs font-medium transition-all",
          current.bg,
          current.color
        )}
      >
        {/* Animated pulse dot */}
        <span className="relative flex h-2 w-2">
          {state === "connected" && (
            <span
              className={cn(
                "animate-ping absolute inline-flex h-full w-full rounded-full opacity-75",
                current.pulse
              )}
            />
          )}
          <span
            className={cn(
              "relative inline-flex rounded-full h-2 w-2",
              current.pulse
            )}
          />
        </span>

        {showLabel && <span>{current.label}</span>}
      </div>

      {showRefresh && (
        <Button
          variant="ghost"
          size="icon"
          className="h-6 w-6"
          onClick={checkConnection}
          disabled={checking}
        >
          <RefreshCw className={cn("w-3.5 h-3.5", checking && "animate-spin")} />
        </Button>
      )}
    </div>
  );
}

// Compact version for header
export function ConnectionDot({ className }: { className?: string }) {
  const [connected, setConnected] = useState(false);

  useEffect(() => {
    const check = async () => {
      const result = await isStudioConnected();
      setConnected(result);
    };

    check();
    const interval = setInterval(check, 5000);
    return () => clearInterval(interval);
  }, []);

  return (
    <span
      className={cn(
        "relative flex h-2.5 w-2.5",
        className
      )}
      title={connected ? "Connected to Roblox Studio" : "Not connected"}
    >
      {connected && (
        <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75" />
      )}
      <span
        className={cn(
          "relative inline-flex rounded-full h-2.5 w-2.5",
          connected ? "bg-green-500" : "bg-red-500"
        )}
      />
    </span>
  );
}
