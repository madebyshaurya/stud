import { cn } from "@/lib/utils";

interface AvatarIconProps {
  className?: string;
}

// Bot avatar - Stud logo mark styled for chat
export function BotAvatar({ className }: AvatarIconProps) {
  return (
    <div className={cn(
      "flex items-center justify-center rounded-lg bg-primary text-primary-foreground",
      "w-8 h-8",
      className
    )}>
      <svg
        viewBox="0 0 48 48"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        className="w-5 h-5"
      >
        {/* Stud logo mark - tilted square */}
        <path
          d="M41.26 12.67L14.71 5.56a1.67 1.67 0 0 0-2.04 1.18L5.56 33.29a1.67 1.67 0 0 0 1.18 2.04l26.55 7.11a1.67 1.67 0 0 0 2.04-1.18l7.11-26.55a1.67 1.67 0 0 0-1.18-2.04Z"
          fill="currentColor"
        />
        {/* Inner square hole */}
        <path
          d="M29.32 20.51l-8.18-2.19a.51.51 0 0 0-.63.36l-2.19 8.18a.51.51 0 0 0 .36.63l8.18 2.19a.51.51 0 0 0 .63-.36l2.19-8.18a.51.51 0 0 0-.36-.63Z"
          fill="rgba(0,0,0,0.3)"
        />
      </svg>
    </div>
  );
}

// User avatar - Simple user icon
export function UserAvatar({ className }: AvatarIconProps) {
  return (
    <div className={cn(
      "flex items-center justify-center rounded-lg bg-muted text-muted-foreground",
      "w-8 h-8",
      className
    )}>
      <svg
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
        className="w-4 h-4"
      >
        <path d="M19 21v-2a4 4 0 0 0-4-4H9a4 4 0 0 0-4 4v2" />
        <circle cx="12" cy="7" r="4" />
      </svg>
    </div>
  );
}

// Sparkles icon for AI features
export function SparklesIcon({ className }: AvatarIconProps) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={cn("w-4 h-4", className)}
    >
      <path d="m12 3-1.912 5.813a2 2 0 0 1-1.275 1.275L3 12l5.813 1.912a2 2 0 0 1 1.275 1.275L12 21l1.912-5.813a2 2 0 0 1 1.275-1.275L21 12l-5.813-1.912a2 2 0 0 1-1.275-1.275L12 3Z" />
      <path d="M5 3v4" />
      <path d="M19 17v4" />
      <path d="M3 5h4" />
      <path d="M17 19h4" />
    </svg>
  );
}

// Brain icon for reasoning models
export function BrainIcon({ className }: AvatarIconProps) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={cn("w-4 h-4", className)}
    >
      <path d="M9.5 2A2.5 2.5 0 0 1 12 4.5v15a2.5 2.5 0 0 1-4.96.44 2.5 2.5 0 0 1-2.96-3.08 3 3 0 0 1-.34-5.58 2.5 2.5 0 0 1 1.32-4.24 2.5 2.5 0 0 1 1.98-3A2.5 2.5 0 0 1 9.5 2Z" />
      <path d="M14.5 2A2.5 2.5 0 0 0 12 4.5v15a2.5 2.5 0 0 0 4.96.44 2.5 2.5 0 0 0 2.96-3.08 3 3 0 0 0 .34-5.58 2.5 2.5 0 0 0-1.32-4.24 2.5 2.5 0 0 0-1.98-3A2.5 2.5 0 0 0 14.5 2Z" />
    </svg>
  );
}

// Zap/lightning icon for new features
export function ZapIcon({ className }: AvatarIconProps) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="currentColor"
      className={cn("w-3 h-3", className)}
    >
      <polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2" />
    </svg>
  );
}

// Code icon
export function CodeIcon({ className }: AvatarIconProps) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={cn("w-4 h-4", className)}
    >
      <polyline points="16 18 22 12 16 6" />
      <polyline points="8 6 2 12 8 18" />
    </svg>
  );
}

// Send icon
export function SendIcon({ className }: AvatarIconProps) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={cn("w-4 h-4", className)}
    >
      <path d="m22 2-7 20-4-9-9-4Z" />
      <path d="M22 2 11 13" />
    </svg>
  );
}

// Stop icon
export function StopIcon({ className }: AvatarIconProps) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="currentColor"
      className={cn("w-4 h-4", className)}
    >
      <rect x="6" y="6" width="12" height="12" rx="1" />
    </svg>
  );
}
