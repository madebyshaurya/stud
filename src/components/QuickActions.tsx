/**
 * QuickActions - Common quick action buttons for the chat
 */

import { Button } from "@/components/ui/button";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import {
  Trash2,
  Download,
  Sparkles,
  Play,
  Code,
  Box,
  FolderTree,
} from "lucide-react";
import { cn } from "@/lib/utils";

interface QuickAction {
  id: string;
  icon: React.ReactNode;
  label: string;
  prompt: string;
  variant?: "default" | "outline" | "ghost";
}

const QUICK_ACTIONS: QuickAction[] = [
  {
    id: "explore",
    icon: <FolderTree className="w-4 h-4" />,
    label: "Explore game",
    prompt: "Show me what's in the Workspace and the overall game structure",
  },
  {
    id: "scripts",
    icon: <Code className="w-4 h-4" />,
    label: "List scripts",
    prompt: "List all scripts in the game and what they do",
  },
  {
    id: "add-part",
    icon: <Box className="w-4 h-4" />,
    label: "Add part",
    prompt: "Create a new Part in the Workspace",
  },
  {
    id: "playtest",
    icon: <Play className="w-4 h-4" />,
    label: "Check errors",
    prompt: "Check for any script errors or common issues in the game",
  },
  {
    id: "optimize",
    icon: <Sparkles className="w-4 h-4" />,
    label: "Suggestions",
    prompt: "What improvements or features would you suggest for this game?",
  },
];

interface QuickActionsProps {
  onAction: (prompt: string) => void;
  disabled?: boolean;
  className?: string;
}

export function QuickActions({ onAction, disabled, className }: QuickActionsProps) {
  return (
    <TooltipProvider>
      <div className={cn("flex flex-wrap gap-2", className)}>
        {QUICK_ACTIONS.map((action) => (
          <Tooltip key={action.id}>
            <TooltipTrigger asChild>
              <Button
                variant="outline"
                size="sm"
                className="gap-1.5 h-8"
                onClick={() => onAction(action.prompt)}
                disabled={disabled}
              >
                {action.icon}
                <span className="hidden sm:inline">{action.label}</span>
              </Button>
            </TooltipTrigger>
            <TooltipContent side="bottom">
              <p className="text-xs">{action.prompt}</p>
            </TooltipContent>
          </Tooltip>
        ))}
      </div>
    </TooltipProvider>
  );
}

// Chat header actions
interface ChatActionsProps {
  onClear: () => void;
  onExport?: () => void;
  disabled?: boolean;
  className?: string;
}

export function ChatActions({ onClear, onExport, disabled, className }: ChatActionsProps) {
  return (
    <TooltipProvider>
      <div className={cn("flex items-center gap-1", className)}>
        {onExport && (
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8"
                onClick={onExport}
                disabled={disabled}
              >
                <Download className="w-4 h-4" />
              </Button>
            </TooltipTrigger>
            <TooltipContent>Export chat</TooltipContent>
          </Tooltip>
        )}

        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8 text-destructive hover:text-destructive"
              onClick={onClear}
              disabled={disabled}
            >
              <Trash2 className="w-4 h-4" />
            </Button>
          </TooltipTrigger>
          <TooltipContent>Clear chat</TooltipContent>
        </Tooltip>
      </div>
    </TooltipProvider>
  );
}
