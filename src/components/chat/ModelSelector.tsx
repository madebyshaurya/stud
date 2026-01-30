import { useState, useEffect, useMemo } from "react";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Loader } from "@/components/ui/loader";
import { ProviderIcon } from "@/components/icons/ProviderIcon";
import { useSettingsStore, ProviderType } from "@/stores/settings";
import { useAuthStore } from "@/stores/auth";
import { useModelsStore } from "@/stores/models";
import { cn } from "@/lib/utils";
import { Check, ChevronDown, Search, Zap, Brain, Sparkles } from "lucide-react";

// Static models for API key providers (OpenAI/Anthropic direct API access)
const staticModels: { id: string; name: string; short: string; provider: ProviderType; description?: string }[] = [
  { id: "gpt-4o", name: "GPT-4o", short: "4o", provider: "openai", description: "Most capable" },
  { id: "gpt-4o-mini", name: "GPT-4o Mini", short: "4o mini", provider: "openai", description: "Fast & cheap" },
  { id: "claude-sonnet-4-20250514", name: "Claude Sonnet 4", short: "Sonnet 4", provider: "anthropic", description: "Best for code" },
  { id: "claude-3-5-haiku-20241022", name: "Claude Haiku", short: "Haiku", provider: "anthropic", description: "Fast" },
];

interface ModelSelectorProps {
  className?: string;
  disabled?: boolean;
}

export function ModelSelector({ className, disabled }: ModelSelectorProps) {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState("");
  const { selectedModel, selectedProvider, setSelectedModel, hasApiKey } = useSettingsStore();
  const { isOAuthAuthenticated } = useAuthStore();
  const { codexModels, isLoading, fetchModels } = useModelsStore();

  const isAuthenticated = isOAuthAuthenticated();

  // Fetch models when authenticated
  useEffect(() => {
    if (isAuthenticated) {
      fetchModels();
    }
  }, [isAuthenticated, fetchModels]);

  // Get short display name for the button
  const getShortName = () => {
    // Check codex models
    const codexModel = codexModels.find((m) => m.id === selectedModel);
    if (codexModel) {
      // Shorten common names
      if (codexModel.id.includes("codex")) return "Codex";
      if (codexModel.id.includes("o3")) return "o3";
      if (codexModel.id.includes("o1")) return "o1";
      if (codexModel.id.includes("4o-mini")) return "4o mini";
      if (codexModel.id.includes("4o")) return "4o";
      if (codexModel.id.includes("4.1")) return "4.1";
      return codexModel.name.split(" ").slice(-1)[0]; // Last word
    }

    // Check static models
    const staticModel = staticModels.find((m) => m.id === selectedModel);
    if (staticModel) return staticModel.short;

    return selectedModel.split("-").slice(-1)[0];
  };

  // All available models combined
  const allModels = useMemo(() => {
    const models: Array<{
      id: string;
      name: string;
      provider: ProviderType;
      description?: string;
      isNew?: boolean;
      reasoning?: boolean;
      disabled?: boolean;
    }> = [];

    // Add Codex models if authenticated
    if (isAuthenticated) {
      codexModels.forEach((m) => {
        models.push({
          id: m.id,
          name: m.name,
          provider: "codex",
          description: m.description,
          isNew: m.isNew,
          reasoning: m.reasoning,
        });
      });
    }

    // Add static models
    staticModels.forEach((m) => {
      const isDisabled = !hasApiKey(m.provider as "openai" | "anthropic");
      models.push({
        id: m.id,
        name: m.name,
        provider: m.provider,
        description: m.description,
        disabled: isDisabled,
      });
    });

    return models;
  }, [codexModels, isAuthenticated, hasApiKey]);

  // Filter models by search
  const filteredModels = useMemo(() => {
    if (!search.trim()) return allModels;
    const q = search.toLowerCase();
    return allModels.filter(
      (m) =>
        m.name.toLowerCase().includes(q) ||
        m.id.toLowerCase().includes(q) ||
        m.description?.toLowerCase().includes(q)
    );
  }, [allModels, search]);

  // Group by type for display
  const groupedModels = useMemo(() => {
    const codex = filteredModels.filter((m) => m.provider === "codex" && !m.reasoning);
    const reasoning = filteredModels.filter((m) => m.reasoning);
    const api = filteredModels.filter((m) => m.provider !== "codex");
    return { codex, reasoning, api };
  }, [filteredModels]);

  const handleSelect = (modelId: string, provider: ProviderType) => {
    setSelectedModel(modelId, provider);
    setOpen(false);
    setSearch("");
  };

  const getProviderIcon = () => {
    if (selectedProvider === "codex" || selectedProvider === "openai") return "openai";
    return selectedProvider;
  };

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild disabled={disabled}>
        <Button
          variant="ghost"
          size="sm"
          className={cn(
            "gap-1.5 px-2 h-7 text-xs text-muted-foreground hover:text-foreground",
            "rounded-md border border-transparent hover:border-border",
            className
          )}
        >
          <ProviderIcon id={getProviderIcon()} size="xs" />
          <span className="font-medium max-w-[60px] truncate">{getShortName()}</span>
          <ChevronDown className="w-3 h-3 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent
        align="end"
        className="w-64 p-0 rounded-xl shadow-lg"
        onOpenAutoFocus={(e) => e.preventDefault()}
      >
        {/* Search */}
        <div className="p-2 border-b">
          <div className="relative">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground" />
            <Input
              placeholder="Search models..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="h-8 pl-8 text-sm rounded-lg"
              autoFocus
            />
          </div>
        </div>

        {/* Model List */}
        <div className="max-h-[280px] overflow-y-auto p-1">
          {isLoading && (
            <div className="flex items-center justify-center py-4">
              <Loader variant="circular" size="sm" />
            </div>
          )}

          {!isLoading && filteredModels.length === 0 && (
            <div className="text-center py-4 text-sm text-muted-foreground">
              No models found
            </div>
          )}

          {/* Codex/ChatGPT Models */}
          {groupedModels.codex.length > 0 && (
            <ModelGroup label="ChatGPT" icon={<Sparkles className="w-3 h-3" />}>
              {groupedModels.codex.map((model) => (
                <ModelRow
                  key={model.id}
                  model={model}
                  isSelected={selectedModel === model.id}
                  onClick={() => handleSelect(model.id, "codex")}
                />
              ))}
            </ModelGroup>
          )}

          {/* Reasoning Models */}
          {groupedModels.reasoning.length > 0 && (
            <ModelGroup label="Reasoning" icon={<Brain className="w-3 h-3" />}>
              {groupedModels.reasoning.map((model) => (
                <ModelRow
                  key={model.id}
                  model={model}
                  isSelected={selectedModel === model.id}
                  onClick={() => handleSelect(model.id, "codex")}
                />
              ))}
            </ModelGroup>
          )}

          {/* API Models */}
          {groupedModels.api.length > 0 && (
            <ModelGroup label="API Keys" icon={<Zap className="w-3 h-3" />}>
              {groupedModels.api.map((model) => (
                <ModelRow
                  key={model.id}
                  model={model}
                  isSelected={selectedModel === model.id && selectedProvider === model.provider}
                  onClick={() => handleSelect(model.id, model.provider)}
                  disabled={model.disabled}
                />
              ))}
            </ModelGroup>
          )}
        </div>
      </PopoverContent>
    </Popover>
  );
}

// Group header
function ModelGroup({
  label,
  icon,
  children
}: {
  label: string;
  icon: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <div className="mb-1">
      <div className="flex items-center gap-1.5 px-2 py-1 text-[10px] font-medium text-muted-foreground uppercase tracking-wider">
        {icon}
        {label}
      </div>
      {children}
    </div>
  );
}

// Individual model row
function ModelRow({
  model,
  isSelected,
  onClick,
  disabled,
}: {
  model: {
    id: string;
    name: string;
    description?: string;
    isNew?: boolean;
    reasoning?: boolean;
  };
  isSelected: boolean;
  onClick: () => void;
  disabled?: boolean;
}) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className={cn(
        "w-full flex items-center gap-2 px-2 py-1.5 rounded-lg text-left transition-colors",
        "hover:bg-accent focus:bg-accent focus:outline-none",
        isSelected && "bg-accent",
        disabled && "opacity-40 cursor-not-allowed hover:bg-transparent"
      )}
    >
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-1.5">
          <span className={cn("text-sm font-medium truncate", disabled && "text-muted-foreground")}>
            {model.name}
          </span>
          {model.isNew && (
            <span className="flex-shrink-0 text-[9px] text-amber-600 bg-amber-50 px-1 rounded">
              New
            </span>
          )}
        </div>
        {model.description && (
          <span className="text-[11px] text-muted-foreground truncate block">
            {model.description}
          </span>
        )}
      </div>
      {isSelected && <Check className="w-3.5 h-3.5 text-primary flex-shrink-0" />}
    </button>
  );
}

export default ModelSelector;
