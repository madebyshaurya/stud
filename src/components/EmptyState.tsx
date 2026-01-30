/**
 * EmptyState - Beautiful empty state for the chat when no messages exist
 */

import { useState, useEffect } from "react";
import { cn } from "@/lib/utils";
import { LogoMark } from "@/components/icons/Logo";
import { Sparkles, Code, Wand2, Search, Bot, ArrowDown } from "lucide-react";

const CAPABILITIES = [
  {
    icon: <Code className="w-4 h-4" />,
    text: "Write Luau scripts",
    color: "text-blue-500",
  },
  {
    icon: <Wand2 className="w-4 h-4" />,
    text: "Create & modify instances",
    color: "text-purple-500",
  },
  {
    icon: <Search className="w-4 h-4" />,
    text: "Find free models",
    color: "text-green-500",
  },
  {
    icon: <Bot className="w-4 h-4" />,
    text: "Debug & optimize",
    color: "text-orange-500",
  },
];

const TYPING_EXAMPLES = [
  "Create an NPC that follows players...",
  "Add a shop GUI with items...",
  "Make a gun that shoots projectiles...",
  "Design a currency system...",
  "Build a racing checkpoint system...",
];

interface EmptyStateProps {
  className?: string;
}

export function EmptyState({ className }: EmptyStateProps) {
  const [typingText, setTypingText] = useState("");
  const [exampleIndex, setExampleIndex] = useState(0);
  const [charIndex, setCharIndex] = useState(0);
  const [isDeleting, setIsDeleting] = useState(false);

  // Typewriter effect
  useEffect(() => {
    const currentExample = TYPING_EXAMPLES[exampleIndex];

    if (isDeleting) {
      if (charIndex > 0) {
        const timer = setTimeout(() => {
          setTypingText(currentExample.slice(0, charIndex - 1));
          setCharIndex(charIndex - 1);
        }, 30);
        return () => clearTimeout(timer);
      } else {
        setIsDeleting(false);
        setExampleIndex((exampleIndex + 1) % TYPING_EXAMPLES.length);
      }
    } else {
      if (charIndex < currentExample.length) {
        const timer = setTimeout(() => {
          setTypingText(currentExample.slice(0, charIndex + 1));
          setCharIndex(charIndex + 1);
        }, 50);
        return () => clearTimeout(timer);
      } else {
        const timer = setTimeout(() => {
          setIsDeleting(true);
        }, 2000);
        return () => clearTimeout(timer);
      }
    }
  }, [charIndex, exampleIndex, isDeleting]);

  return (
    <div
      className={cn(
        "flex flex-col items-center justify-center text-center py-12",
        className
      )}
    >
      {/* Animated logo */}
      <div className="relative mb-8">
        <div className="absolute inset-0 animate-ping opacity-20">
          <LogoMark className="w-20 h-20" />
        </div>
        <LogoMark className="w-20 h-20 relative" />
      </div>

      {/* Title */}
      <h1 className="text-3xl font-heading mb-2">What would you like to build?</h1>
      <p className="text-muted-foreground mb-8 max-w-md">
        <span className="font-logo">Stud</span> can help you create, modify, and debug your Roblox game with AI-powered assistance.
      </p>

      {/* Capabilities */}
      <div className="flex flex-wrap justify-center gap-3 mb-8">
        {CAPABILITIES.map((cap, idx) => (
          <div
            key={idx}
            className={cn(
              "flex items-center gap-2 px-3 py-1.5 rounded-full bg-muted/50 text-sm",
              "animate-fade-in opacity-0",
              cap.color
            )}
            style={{ animationDelay: `${idx * 100}ms`, animationFillMode: "forwards" }}
          >
            {cap.icon}
            <span className="text-foreground">{cap.text}</span>
          </div>
        ))}
      </div>

      {/* Typewriter suggestion */}
      <div className="relative max-w-sm w-full">
        <div className="absolute -top-6 left-1/2 -translate-x-1/2">
          <Sparkles className="w-4 h-4 text-amber-500 animate-pulse" />
        </div>
        <div className="bg-muted/30 border rounded-xl px-4 py-3 text-left">
          <p className="text-sm text-muted-foreground mb-1">Try asking:</p>
          <p className="text-base min-h-[1.5rem]">
            {typingText}
            <span className="animate-pulse">|</span>
          </p>
        </div>
      </div>

      {/* Scroll hint */}
      <div className="mt-8 flex flex-col items-center gap-2 text-muted-foreground animate-bounce">
        <span className="text-xs">Type below to get started</span>
        <ArrowDown className="w-4 h-4" />
      </div>
    </div>
  );
}
