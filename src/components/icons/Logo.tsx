import { cn } from "@/lib/utils";

interface LogoProps {
  className?: string;
}

// Stud Logo - Durian-inspired icon for "Cursor for Roblox Studio"
export function LogoMark({ className }: LogoProps) {
  return (
    <svg
      data-component="logo-mark"
      className={cn("w-10 h-10", className)}
      viewBox="0 0 48 48"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
    >
      {/* Durian/stud icon - simplified tilted shape */}
      <path
        d="M41.26 12.67L14.71 5.56a1.67 1.67 0 0 0-2.04 1.18L5.56 33.29a1.67 1.67 0 0 0 1.18 2.04l26.55 7.11a1.67 1.67 0 0 0 2.04-1.18l7.11-26.55a1.67 1.67 0 0 0-1.18-2.04Z"
        fill="currentColor"
        className="text-primary"
      />
      {/* Inner square hole */}
      <path
        d="M29.32 20.51l-8.18-2.19a.51.51 0 0 0-.63.36l-2.19 8.18a.51.51 0 0 0 .36.63l8.18 2.19a.51.51 0 0 0 .63-.36l2.19-8.18a.51.51 0 0 0-.36-.63Z"
        fill="white"
      />
    </svg>
  );
}

export function LogoSplash({ className }: LogoProps) {
  return (
    <svg
      data-component="logo-splash"
      className={cn("w-24 h-24", className)}
      viewBox="0 0 100 100"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
    >
      {/* Large durian icon for splash screen */}
      <path
        d="M85.9 26.4L30.6 11.6c-1.8-.5-3.7.6-4.2 2.5L11.6 69.4c-.5 1.8.6 3.7 2.5 4.2l55.3 14.8c1.8.5 3.7-.6 4.2-2.5l14.8-55.3c.5-1.8-.6-3.7-2.5-4.2Z"
        fill="currentColor"
        className="text-primary"
      />
      <path
        d="M61.1 42.7L44 38.1c-.6-.2-1.2.2-1.3.8l-4.6 17c-.2.6.2 1.2.8 1.3l17 4.6c.6.2 1.2-.2 1.3-.8l4.6-17c.2-.6-.2-1.2-.8-1.3Z"
        fill="white"
      />
    </svg>
  );
}

export function Logo({ className }: LogoProps) {
  return (
    <div
      data-component="logo"
      className={cn("flex items-center gap-3", className)}
    >
      <LogoMark className="w-9 h-9" />
      <span className="text-2xl font-bold text-foreground tracking-tight">
        Stud
      </span>
    </div>
  );
}

export default Logo;
