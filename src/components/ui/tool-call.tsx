import * as React from "react";
import { cn } from "@/lib/utils";
import { Loader } from "./loader";
import { ChevronDown, ChevronRight, Check, X, Wrench, HelpCircle } from "lucide-react";

export interface ToolCallProps {
  name: string;
  input?: Record<string, unknown>;
  output?: unknown;
  status: "pending" | "running" | "complete" | "error" | "waiting";
  error?: string;
  className?: string;
}

// Pretty print tool name (e.g., roblox_get_script -> Get Script)
function formatToolName(name: string): string {
  return name
    .replace(/^roblox_/, "")
    .split("_")
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(" ");
}

export function ToolCall({
  name,
  input,
  output,
  status,
  error,
  className,
}: ToolCallProps) {
  const [isExpanded, setIsExpanded] = React.useState(false);

  const statusConfig = {
    pending: {
      icon: <Loader variant="circular" size="sm" />,
      label: "Waiting...",
      color: "text-muted-foreground",
      bgColor: "bg-muted/50",
    },
    running: {
      icon: <Loader variant="circular" size="sm" />,
      label: "Running...",
      color: "text-primary",
      bgColor: "bg-primary/5",
    },
    waiting: {
      icon: <HelpCircle className="w-4 h-4" />,
      label: "Waiting for response...",
      color: "text-amber-600",
      bgColor: "bg-amber-50",
    },
    complete: {
      icon: <Check className="w-4 h-4" />,
      label: "Complete",
      color: "text-green-600",
      bgColor: "bg-green-50",
    },
    error: {
      icon: <X className="w-4 h-4" />,
      label: "Error",
      color: "text-red-600",
      bgColor: "bg-red-50",
    },
  };

  const { icon, color, bgColor } = statusConfig[status];

  return (
    <div
      className={cn(
        "rounded-xl border transition-all",
        bgColor,
        className
      )}
    >
      {/* Header - always visible */}
      <button
        onClick={() => setIsExpanded(!isExpanded)}
        className="w-full flex items-center gap-3 px-4 py-3 text-left"
      >
        {/* Expand/collapse icon */}
        <span className="text-muted-foreground">
          {isExpanded ? (
            <ChevronDown className="w-4 h-4" />
          ) : (
            <ChevronRight className="w-4 h-4" />
          )}
        </span>

        {/* Tool icon */}
        <span className={cn("flex-shrink-0", color)}>
          <Wrench className="w-4 h-4" />
        </span>

        {/* Tool name */}
        <span className="font-medium text-sm flex-1">
          {formatToolName(name)}
        </span>

        {/* Status indicator */}
        <span className={cn("flex items-center gap-1.5", color)}>
          {icon}
        </span>
      </button>

      {/* Expanded content */}
      {isExpanded && (
        <div className="px-4 pb-4 pt-0 space-y-3">
          {/* Input */}
          {input && Object.keys(input).length > 0 && (
            <div className="space-y-1.5">
              <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                Input
              </p>
              <pre className="text-xs bg-background/80 rounded-lg p-3 overflow-x-auto border">
                {JSON.stringify(input, null, 2)}
              </pre>
            </div>
          )}

          {/* Output */}
          {status === "complete" && output !== undefined && (
            <div className="space-y-1.5">
              <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                Output
              </p>
              <pre className="text-xs bg-background/80 rounded-lg p-3 overflow-x-auto border max-h-48 overflow-y-auto">
                {typeof output === "string" 
                  ? output 
                  : JSON.stringify(output, null, 2)}
              </pre>
            </div>
          )}

          {/* Error */}
          {status === "error" && error && (
            <div className="space-y-1.5">
              <p className="text-xs font-medium text-red-600 uppercase tracking-wide">
                Error
              </p>
              <pre className="text-xs bg-red-50 text-red-700 rounded-lg p-3 overflow-x-auto border border-red-200">
                {error}
              </pre>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// Component to show multiple tool calls in a message
export interface ToolCallsProps {
  toolCalls: Array<{
    id: string;
    name: string;
    args: Record<string, unknown>;
    result?: unknown;
    status: "pending" | "running" | "complete" | "error" | "waiting";
    error?: string;
  }>;
  className?: string;
}

export function ToolCalls({ toolCalls, className }: ToolCallsProps) {
  if (!toolCalls || toolCalls.length === 0) return null;

  return (
    <div className={cn("space-y-2", className)}>
      {toolCalls.map((tc) => (
        <ToolCall
          key={tc.id}
          name={tc.name}
          input={tc.args}
          output={tc.result}
          status={tc.status}
          error={tc.error}
        />
      ))}
    </div>
  );
}
