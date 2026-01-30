import { Button } from "@/components/ui/button";
import { Search, BookOpen, Globe, Play, FileText, Box } from "lucide-react";

export type ChipAction = "search-models" | "docs" | "web" | "run-code" | "plan" | "toolbox";

interface ContextChip {
  id: ChipAction;
  label: string;
  icon: React.ReactNode;
  description: string;
}

const chips: ContextChip[] = [
  {
    id: "search-models",
    label: "Models",
    icon: <Box className="w-3.5 h-3.5" />,
    description: "Search free models from Creator Store",
  },
  {
    id: "docs",
    label: "Docs",
    icon: <BookOpen className="w-3.5 h-3.5" />,
    description: "Search Roblox documentation",
  },
  {
    id: "web",
    label: "Web",
    icon: <Globe className="w-3.5 h-3.5" />,
    description: "Search the web",
  },
  {
    id: "run-code",
    label: "Run",
    icon: <Play className="w-3.5 h-3.5" />,
    description: "Execute Luau code in Studio",
  },
  {
    id: "plan",
    label: "Plan",
    icon: <FileText className="w-3.5 h-3.5" />,
    description: "Create a plan before building",
  },
];

interface ContextChipsProps {
  onChipClick: (chipId: ChipAction) => void;
  activeChips?: ChipAction[];
  disabled?: boolean;
}

export function ContextChips({ onChipClick, activeChips = [], disabled = false }: ContextChipsProps) {
  return (
    <div className="flex items-center gap-1.5 overflow-x-auto pb-1">
      {chips.map((chip) => {
        const isActive = activeChips.includes(chip.id);
        return (
          <Button
            key={chip.id}
            variant={isActive ? "default" : "outline"}
            size="sm"
            className="h-7 text-xs gap-1.5 rounded-full shrink-0 font-normal"
            onClick={() => onChipClick(chip.id)}
            disabled={disabled}
            title={chip.description}
          >
            {chip.icon}
            {chip.label}
          </Button>
        );
      })}
    </div>
  );
}

export { chips };
export type { ContextChip };
