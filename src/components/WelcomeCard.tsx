/**
 * WelcomeCard - Animated welcome card with feature highlights
 */

import { useState, useEffect } from "react";
import { cn } from "@/lib/utils";
import { LogoMark } from "@/components/icons/Logo";
import {
  Code,
  Wand2,
  Search,
  MessageSquare,
  Zap,
  Sparkles,
  ArrowRight,
} from "lucide-react";

const FEATURES = [
  {
    icon: <Code className="w-5 h-5" />,
    title: "Write Scripts",
    description: "Generate and edit Luau code",
  },
  {
    icon: <Wand2 className="w-5 h-5" />,
    title: "Build Worlds",
    description: "Create and modify instances",
  },
  {
    icon: <Search className="w-5 h-5" />,
    title: "Find Assets",
    description: "Search the Creator Store",
  },
  {
    icon: <MessageSquare className="w-5 h-5" />,
    title: "Get Help",
    description: "Ask questions naturally",
  },
];

interface WelcomeCardProps {
  className?: string;
  compact?: boolean;
}

export function WelcomeCard({ className, compact = false }: WelcomeCardProps) {
  const [activeFeature, setActiveFeature] = useState(0);

  // Rotate through features
  useEffect(() => {
    const interval = setInterval(() => {
      setActiveFeature((prev) => (prev + 1) % FEATURES.length);
    }, 3000);
    return () => clearInterval(interval);
  }, []);

  if (compact) {
    return (
      <div className={cn("flex items-center gap-3 text-muted-foreground", className)}>
        <Sparkles className="w-4 h-4" />
        <span className="text-sm">
          {FEATURES[activeFeature].title} • {FEATURES[activeFeature].description}
        </span>
      </div>
    );
  }

  return (
    <div
      className={cn(
        "rounded-2xl border bg-gradient-to-br from-background to-muted/30 p-6",
        "animate-fade-in",
        className
      )}
    >
      {/* Header */}
      <div className="flex items-center gap-3 mb-6">
        <div className="p-2 rounded-xl bg-primary/10">
          <LogoMark className="w-8 h-8" />
        </div>
        <div>
          <h2 className="text-lg font-heading">Welcome to <span className="font-logo">Stud</span></h2>
          <p className="text-sm text-muted-foreground">
            Your AI assistant for Roblox Studio
          </p>
        </div>
      </div>

      {/* Features Grid */}
      <div className="grid grid-cols-2 gap-3">
        {FEATURES.map((feature, idx) => (
          <div
            key={idx}
            className={cn(
              "flex items-start gap-3 p-3 rounded-xl transition-all duration-300",
              idx === activeFeature
                ? "bg-primary/10 scale-[1.02]"
                : "bg-muted/50 hover:bg-muted"
            )}
          >
            <div
              className={cn(
                "p-1.5 rounded-lg transition-colors",
                idx === activeFeature
                  ? "bg-primary text-primary-foreground"
                  : "bg-background text-muted-foreground"
              )}
            >
              {feature.icon}
            </div>
            <div>
              <h3 className="text-sm font-medium">{feature.title}</h3>
              <p className="text-xs text-muted-foreground">{feature.description}</p>
            </div>
          </div>
        ))}
      </div>

      {/* Footer hint */}
      <div className="mt-6 flex items-center gap-2 text-sm text-muted-foreground">
        <Zap className="w-4 h-4" />
        <span>Type a message below to get started</span>
        <ArrowRight className="w-4 h-4 animate-pulse" />
      </div>
    </div>
  );
}

// Tip of the day component
const TIPS = [
  "Use @ to reference specific instances in your messages",
  "Toggle 'Models' chip to search the Creator Store automatically",
  "Press ⌘K to clear the chat and start fresh",
  "The AI can read and modify any script in your game",
  "Ask to 'explore the game' to see the full hierarchy",
];

export function TipOfTheDay({ className }: { className?: string }) {
  const [tip] = useState(() => TIPS[Math.floor(Math.random() * TIPS.length)]);

  return (
    <div
      className={cn(
        "flex items-center gap-2 px-3 py-2 rounded-lg bg-amber-50 text-amber-800 text-xs",
        className
      )}
    >
      <Sparkles className="w-3.5 h-3.5 flex-shrink-0" />
      <span>{tip}</span>
    </div>
  );
}
