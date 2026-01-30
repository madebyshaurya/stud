/**
 * CommandPalette - Quick action command palette (⌘K)
 */

import { useState, useEffect, useCallback } from "react";
import {
  CommandDialog,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
  CommandSeparator,
} from "@/components/ui/command";
import {
  FolderTree,
  Search,
  Trash2,
  Settings,
  FileCode,
  Box,
  MessageSquare,
  Sparkles,
  HelpCircle,
  ExternalLink,
} from "lucide-react";

interface CommandPaletteProps {
  onCommand: (command: string, payload?: unknown) => void;
  onOpenSettings?: () => void;
  onClearChat?: () => void;
}

const COMMANDS = [
  {
    group: "Actions",
    items: [
      {
        id: "new-chat",
        icon: <MessageSquare className="w-4 h-4" />,
        label: "New Chat",
        description: "Start a fresh conversation",
        shortcut: "⌘N",
      },
      {
        id: "clear-chat",
        icon: <Trash2 className="w-4 h-4" />,
        label: "Clear Chat",
        description: "Clear all messages",
        shortcut: "⌘K",
      },
      {
        id: "settings",
        icon: <Settings className="w-4 h-4" />,
        label: "Open Settings",
        description: "Configure API keys and preferences",
        shortcut: "⌘,",
      },
    ],
  },
  {
    group: "Quick Prompts",
    items: [
      {
        id: "prompt-explore",
        icon: <FolderTree className="w-4 h-4" />,
        label: "Explore Game",
        description: "Show game structure and hierarchy",
        prompt: "Show me the game structure and what's in the Workspace",
      },
      {
        id: "prompt-scripts",
        icon: <FileCode className="w-4 h-4" />,
        label: "List Scripts",
        description: "List all scripts in the game",
        prompt: "List all scripts in the game and briefly describe what each does",
      },
      {
        id: "prompt-add-part",
        icon: <Box className="w-4 h-4" />,
        label: "Add Part",
        description: "Create a new part in Workspace",
        prompt: "Create a new Part in the Workspace",
      },
      {
        id: "prompt-find-models",
        icon: <Search className="w-4 h-4" />,
        label: "Find Models",
        description: "Search the Creator Store",
        prompt: "Search the Creator Store for",
      },
      {
        id: "prompt-suggestions",
        icon: <Sparkles className="w-4 h-4" />,
        label: "Get Suggestions",
        description: "Get ideas for improvements",
        prompt: "What improvements or features would you suggest for this game?",
      },
    ],
  },
  {
    group: "Help",
    items: [
      {
        id: "help-shortcuts",
        icon: <HelpCircle className="w-4 h-4" />,
        label: "Keyboard Shortcuts",
        description: "View all keyboard shortcuts",
      },
      {
        id: "help-docs",
        icon: <ExternalLink className="w-4 h-4" />,
        label: "Documentation",
        description: "Open Stud documentation",
      },
    ],
  },
];

export function CommandPalette({
  onCommand,
  onOpenSettings,
  onClearChat,
}: CommandPaletteProps) {
  const [open, setOpen] = useState(false);

  // Global keyboard shortcut
  useEffect(() => {
    const down = (e: KeyboardEvent) => {
      if (e.key === "k" && (e.metaKey || e.ctrlKey) && e.shiftKey) {
        e.preventDefault();
        setOpen((open) => !open);
      }
    };

    document.addEventListener("keydown", down);
    return () => document.removeEventListener("keydown", down);
  }, []);

  const handleSelect = useCallback(
    (item: (typeof COMMANDS)[0]["items"][0]) => {
      setOpen(false);

      // Handle different command types
      if (item.id === "clear-chat" && onClearChat) {
        onClearChat();
      } else if (item.id === "settings" && onOpenSettings) {
        onOpenSettings();
      } else if (item.id === "new-chat" && onClearChat) {
        onClearChat();
      } else if ("prompt" in item && item.prompt) {
        onCommand("prompt", item.prompt);
      } else {
        onCommand(item.id);
      }
    },
    [onCommand, onClearChat, onOpenSettings]
  );

  return (
    <CommandDialog open={open} onOpenChange={setOpen}>
      <CommandInput placeholder="Type a command or search..." />
      <CommandList>
        <CommandEmpty>No results found.</CommandEmpty>
        {COMMANDS.map((group, groupIdx) => (
          <div key={group.group}>
            {groupIdx > 0 && <CommandSeparator />}
            <CommandGroup heading={group.group}>
              {group.items.map((item) => (
                <CommandItem
                  key={item.id}
                  onSelect={() => handleSelect(item)}
                  className="gap-3"
                >
                  {item.icon}
                  <div className="flex-1">
                    <p className="font-medium">{item.label}</p>
                    <p className="text-xs text-muted-foreground">
                      {item.description}
                    </p>
                  </div>
                  {"shortcut" in item && (
                    <kbd className="px-1.5 py-0.5 text-[10px] bg-muted rounded">
                      {item.shortcut}
                    </kbd>
                  )}
                </CommandItem>
              ))}
            </CommandGroup>
          </div>
        ))}
      </CommandList>
    </CommandDialog>
  );
}

// Hook to use command palette
export function useCommandPalette() {
  const [open, setOpen] = useState(false);

  const toggle = useCallback(() => setOpen((o) => !o), []);

  return { open, setOpen, toggle };
}
