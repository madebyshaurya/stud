/**
 * TypingIndicator - Animated indicator showing the AI is typing
 */

import { cn } from "@/lib/utils";
import { BotAvatar } from "@/components/icons/Avatars";

interface TypingIndicatorProps {
  className?: string;
  variant?: "dots" | "wave" | "text";
}

export function TypingIndicator({
  className,
  variant = "dots",
}: TypingIndicatorProps) {
  return (
    <div className={cn("flex items-start gap-4", className)}>
      <BotAvatar />
      <div className="flex items-center gap-3 bg-muted/50 rounded-2xl px-4 py-3">
        {variant === "dots" && <DotsAnimation />}
        {variant === "wave" && <WaveAnimation />}
        {variant === "text" && <TextAnimation />}
      </div>
    </div>
  );
}

function DotsAnimation() {
  return (
    <div className="flex items-center gap-1">
      {[0, 1, 2].map((i) => (
        <span
          key={i}
          className="w-2 h-2 bg-foreground/60 rounded-full animate-bounce"
          style={{ animationDelay: `${i * 150}ms` }}
        />
      ))}
    </div>
  );
}

function WaveAnimation() {
  return (
    <div className="flex items-center gap-0.5 h-5">
      {[0, 1, 2, 3, 4].map((i) => (
        <span
          key={i}
          className="w-1 bg-foreground/60 rounded-full"
          style={{
            height: "60%",
            animation: "wave 1s ease-in-out infinite",
            animationDelay: `${i * 100}ms`,
          }}
        />
      ))}
    </div>
  );
}

function TextAnimation() {
  return (
    <span className="text-sm text-muted-foreground">
      <span className="animate-pulse"><span className="font-logo">Stud</span> is thinking</span>
      <span className="inline-flex">
        {[0, 1, 2].map((i) => (
          <span
            key={i}
            className="animate-bounce inline-block"
            style={{ animationDelay: `${i * 200}ms` }}
          >
            .
          </span>
        ))}
      </span>
    </span>
  );
}

// Compact inline version
export function TypingDots({ className }: { className?: string }) {
  return (
    <span className={cn("inline-flex items-center gap-0.5", className)}>
      {[0, 1, 2].map((i) => (
        <span
          key={i}
          className="w-1.5 h-1.5 bg-current rounded-full animate-bounce"
          style={{ animationDelay: `${i * 150}ms` }}
        />
      ))}
    </span>
  );
}
