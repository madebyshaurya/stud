/**
 * InstancePicker - Popover for browsing and selecting Roblox instances
 *
 * Shows when user types @ in input or clicks browse button.
 * Allows browsing the game hierarchy and inserting instance paths.
 */

import { useState, useEffect, useRef } from "react";
import { cn } from "@/lib/utils";
import { InstanceTree } from "./InstanceTree";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { FolderTree, Search, X } from "lucide-react";

interface InstancePickerProps {
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
  onSelect: (path: string) => void;
  trigger?: React.ReactNode;
  className?: string;
}

export function InstancePicker({
  open: controlledOpen,
  onOpenChange,
  onSelect,
  trigger,
  className,
}: InstancePickerProps) {
  const [internalOpen, setInternalOpen] = useState(false);
  const [search, setSearch] = useState("");
  const searchRef = useRef<HTMLInputElement>(null);

  // Use controlled or internal state
  const open = controlledOpen ?? internalOpen;
  const setOpen = onOpenChange ?? setInternalOpen;

  // Focus search when opened
  useEffect(() => {
    if (open) {
      setTimeout(() => {
        searchRef.current?.focus();
      }, 100);
    } else {
      setSearch("");
    }
  }, [open]);

  const handleSelect = (path: string) => {
    onSelect(path);
    setOpen(false);
  };

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        {trigger ?? (
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8 rounded-lg"
            title="Browse instances (@)"
          >
            <FolderTree className="w-4 h-4" />
          </Button>
        )}
      </PopoverTrigger>
      <PopoverContent
        className={cn(
          "w-80 p-0 shadow-xl",
          className
        )}
        side="top"
        align="start"
        sideOffset={8}
      >
        <div className="flex flex-col h-[400px]">
          {/* Header */}
          <div className="flex items-center gap-2 px-3 py-2 border-b">
            <FolderTree className="w-4 h-4 text-muted-foreground" />
            <span className="text-sm font-medium">Select Instance</span>
            <div className="flex-1" />
            <button
              onClick={() => setOpen(false)}
              className="p-1 rounded-md hover:bg-muted transition-colors"
            >
              <X className="w-4 h-4 text-muted-foreground" />
            </button>
          </div>

          {/* Search */}
          <div className="px-3 py-2 border-b">
            <div className="relative">
              <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                ref={searchRef}
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search instances..."
                className="pl-8 h-8 text-sm"
              />
            </div>
          </div>

          {/* Tree */}
          <div className="flex-1 overflow-hidden">
            <InstanceTree
              onSelect={handleSelect}
              searchQuery={search}
              className="h-full"
            />
          </div>

          {/* Footer hint */}
          <div className="px-3 py-2 border-t bg-muted/30">
            <p className="text-xs text-muted-foreground">
              Type <kbd className="px-1 py-0.5 bg-muted rounded text-[10px] font-mono">@</kbd> in the input to open this picker
            </p>
          </div>
        </div>
      </PopoverContent>
    </Popover>
  );
}

// Hook for detecting @ mentions in input
export function useAtMention(
  inputValue: string,
  cursorPosition: number
): { showPicker: boolean; prefix: string; startIndex: number } {
  // Find the last @ before cursor that isn't followed by a space
  const textBeforeCursor = inputValue.slice(0, cursorPosition);
  const atIndex = textBeforeCursor.lastIndexOf("@");

  if (atIndex === -1) {
    return { showPicker: false, prefix: "", startIndex: -1 };
  }

  // Check if there's a space between @ and cursor
  const textAfterAt = textBeforeCursor.slice(atIndex + 1);
  if (textAfterAt.includes(" ")) {
    return { showPicker: false, prefix: "", startIndex: -1 };
  }

  // @ must be at start or after a space
  if (atIndex > 0 && inputValue[atIndex - 1] !== " " && inputValue[atIndex - 1] !== "\n") {
    return { showPicker: false, prefix: "", startIndex: -1 };
  }

  return {
    showPicker: true,
    prefix: textAfterAt,
    startIndex: atIndex,
  };
}
