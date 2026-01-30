/**
 * useKeyboardShortcuts - Global keyboard shortcuts for Stud
 */

import { useEffect } from "react";

interface ShortcutHandler {
  key: string;
  meta?: boolean;
  ctrl?: boolean;
  shift?: boolean;
  handler: () => void;
  preventDefault?: boolean;
}

export function useKeyboardShortcuts(shortcuts: ShortcutHandler[]) {
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      for (const shortcut of shortcuts) {
        const metaMatch = shortcut.meta ? e.metaKey : !e.metaKey;
        const ctrlMatch = shortcut.ctrl ? e.ctrlKey : !e.ctrlKey;
        const shiftMatch = shortcut.shift ? e.shiftKey : !e.shiftKey;
        const keyMatch = e.key.toLowerCase() === shortcut.key.toLowerCase();

        if (keyMatch && metaMatch && ctrlMatch && shiftMatch) {
          if (shortcut.preventDefault !== false) {
            e.preventDefault();
          }
          shortcut.handler();
          return;
        }
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [shortcuts]);
}

// Common shortcuts for the app
export function useAppShortcuts({
  onClearChat,
  onOpenSettings,
  onFocusInput,
}: {
  onClearChat?: () => void;
  onOpenSettings?: () => void;
  onFocusInput?: () => void;
}) {
  useKeyboardShortcuts([
    ...(onClearChat
      ? [{ key: "k", meta: true, handler: onClearChat }]
      : []),
    ...(onOpenSettings
      ? [{ key: ",", meta: true, handler: onOpenSettings }]
      : []),
    ...(onFocusInput
      ? [{ key: "/", handler: onFocusInput }]
      : []),
  ]);
}
