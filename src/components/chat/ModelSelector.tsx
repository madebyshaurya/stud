import { useState, useEffect } from "react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Button } from "@/components/ui/button";
import { Loader } from "@/components/ui/loader";
import { ProviderIcon } from "@/components/icons/ProviderIcon";
import { BrainIcon, ZapIcon } from "@/components/icons/Avatars";
import { Icon } from "@/components/icons/Icon";
import { useSettingsStore, ProviderType } from "@/stores/settings";
import { useAuthStore } from "@/stores/auth";
import { useModelsStore } from "@/stores/models";
import { cn } from "@/lib/utils";
import type { DisplayModel } from "@/lib/models/types";

// Static models for API key providers
const staticModels = {
  openai: [
    { id: "gpt-4o", name: "GPT-4o", description: "Most capable model" },
    { id: "gpt-4o-mini", name: "GPT-4o Mini", description: "Fast and affordable" },
    { id: "gpt-4.1", name: "GPT-4.1", description: "Latest GPT-4.1" },
  ],
  anthropic: [
    { id: "claude-sonnet-4-20250514", name: "Claude Sonnet 4", description: "Best for coding" },
    { id: "claude-3-5-haiku-20241022", name: "Claude 3.5 Haiku", description: "Fast and efficient" },
  ],
};

interface ModelSelectorProps {
  className?: string;
  disabled?: boolean;
}

export function ModelSelector({ className, disabled }: ModelSelectorProps) {
  const [open, setOpen] = useState(false);
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

  // Build the current model display
  const getCurrentModelDisplay = () => {
    // Check Codex models first
    if (selectedProvider === "codex") {
      const model = codexModels.find((m) => m.id === selectedModel);
      if (model) return model.name;
    }

    // Check static models
    for (const [, provider] of Object.entries(staticModels)) {
      const model = provider.find((m) => m.id === selectedModel);
      if (model) return model.name;
    }

    return selectedModel;
  };

  const handleSelectModel = (modelId: string, provider: ProviderType) => {
    setSelectedModel(modelId, provider);
    setOpen(false);
  };

  // Group models: GPT-5/Codex first, then GPT-4, then reasoning models
  const groupedCodexModels = {
    codex: codexModels.filter((m) => m.id.includes("5.") || m.id.includes("codex")),
    gpt4: codexModels.filter((m) => m.id.includes("4") && !m.id.includes("5") && !m.reasoning),
    reasoning: codexModels.filter((m) => m.reasoning),
  };

  return (
    <DropdownMenu open={open} onOpenChange={setOpen}>
      <DropdownMenuTrigger asChild disabled={disabled}>
        <Button
          variant="ghost"
          size="sm"
          className={cn(
            "gap-2 px-3 h-8 text-muted-foreground hover:text-foreground",
            "border border-transparent hover:border-border rounded-lg",
            className
          )}
        >
          <ProviderIcon id={selectedProvider === "codex" ? "openai" : selectedProvider} size="sm" />
          <span className="text-sm font-medium">{getCurrentModelDisplay()}</span>
          <Icon name="chevron-down" size="sm" className="opacity-50" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-72 rounded-xl max-h-[70vh] overflow-y-auto">
        {/* ChatGPT Plus Section - only show when authenticated */}
        {isAuthenticated && (
          <>
            <DropdownMenuLabel className="flex items-center gap-2 text-xs text-muted-foreground">
              <ProviderIcon id="openai" size="sm" />
              <span>ChatGPT Plus/Pro</span>
              {isLoading && (
                <Loader variant="circular" size="sm" className="ml-auto" />
              )}
              {!isLoading && (
                <span className="text-[10px] text-emerald-600 bg-emerald-50 px-1.5 py-0.5 rounded ml-auto">
                  Connected
                </span>
              )}
            </DropdownMenuLabel>

            {/* GPT-5 / Codex Models */}
            {groupedCodexModels.codex.length > 0 && (
              <>
                <div className="px-2 py-1 text-[10px] font-medium text-muted-foreground uppercase tracking-wider">
                  Codex Models
                </div>
                {groupedCodexModels.codex.map((model: DisplayModel) => (
                  <ModelItem
                    key={model.id}
                    model={model}
                    isSelected={selectedModel === model.id && selectedProvider === "codex"}
                    onClick={() => handleSelectModel(model.id, "codex")}
                  />
                ))}
              </>
            )}

            {/* GPT-4 Models */}
            {groupedCodexModels.gpt4.length > 0 && (
              <>
                <div className="px-2 py-1 text-[10px] font-medium text-muted-foreground uppercase tracking-wider mt-1">
                  GPT-4 Series
                </div>
                {groupedCodexModels.gpt4.map((model: DisplayModel) => (
                  <ModelItem
                    key={model.id}
                    model={model}
                    isSelected={selectedModel === model.id && selectedProvider === "codex"}
                    onClick={() => handleSelectModel(model.id, "codex")}
                  />
                ))}
              </>
            )}

            {/* Reasoning Models */}
            {groupedCodexModels.reasoning.length > 0 && (
              <>
                <div className="px-2 py-1 text-[10px] font-medium text-muted-foreground uppercase tracking-wider mt-1">
                  Reasoning Models
                </div>
                {groupedCodexModels.reasoning.map((model: DisplayModel) => (
                  <ModelItem
                    key={model.id}
                    model={model}
                    isSelected={selectedModel === model.id && selectedProvider === "codex"}
                    onClick={() => handleSelectModel(model.id, "codex")}
                  />
                ))}
              </>
            )}
            <DropdownMenuSeparator />
          </>
        )}

        {/* OpenAI Section */}
        <DropdownMenuLabel className="flex items-center gap-2 text-xs text-muted-foreground">
          <ProviderIcon id="openai" size="sm" />
          OpenAI API
          {!hasApiKey("openai") && (
            <span className="text-[10px] text-amber-600 bg-amber-50 px-1.5 py-0.5 rounded ml-auto">
              No API key
            </span>
          )}
        </DropdownMenuLabel>
        {staticModels.openai.map((model) => (
          <DropdownMenuItem
            key={model.id}
            onClick={() => handleSelectModel(model.id, "openai")}
            disabled={!hasApiKey("openai")}
            className={cn(
              "flex items-center justify-between cursor-pointer rounded-lg mx-1",
              selectedModel === model.id && selectedProvider === "openai" && "bg-accent"
            )}
          >
            <div className="flex flex-col">
              <span className="font-medium">{model.name}</span>
              <span className="text-xs text-muted-foreground">{model.description}</span>
            </div>
            {selectedModel === model.id && selectedProvider === "openai" && (
              <Icon name="check" size="sm" className="text-primary" />
            )}
          </DropdownMenuItem>
        ))}
        <DropdownMenuSeparator />

        {/* Anthropic Section */}
        <DropdownMenuLabel className="flex items-center gap-2 text-xs text-muted-foreground">
          <ProviderIcon id="anthropic" size="sm" />
          Anthropic API
          {!hasApiKey("anthropic") && (
            <span className="text-[10px] text-amber-600 bg-amber-50 px-1.5 py-0.5 rounded ml-auto">
              No API key
            </span>
          )}
        </DropdownMenuLabel>
        {staticModels.anthropic.map((model) => (
          <DropdownMenuItem
            key={model.id}
            onClick={() => handleSelectModel(model.id, "anthropic")}
            disabled={!hasApiKey("anthropic")}
            className={cn(
              "flex items-center justify-between cursor-pointer rounded-lg mx-1",
              selectedModel === model.id && selectedProvider === "anthropic" && "bg-accent"
            )}
          >
            <div className="flex flex-col">
              <span className="font-medium">{model.name}</span>
              <span className="text-xs text-muted-foreground">{model.description}</span>
            </div>
            {selectedModel === model.id && selectedProvider === "anthropic" && (
              <Icon name="check" size="sm" className="text-primary" />
            )}
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

// Extracted ModelItem component for cleaner code
function ModelItem({
  model,
  isSelected,
  onClick,
}: {
  model: DisplayModel;
  isSelected: boolean;
  onClick: () => void;
}) {
  return (
    <DropdownMenuItem
      onClick={onClick}
      className={cn(
        "flex items-center justify-between cursor-pointer rounded-lg mx-1",
        isSelected && "bg-accent"
      )}
    >
      <div className="flex flex-col gap-0.5">
        <div className="flex items-center gap-1.5">
          <span className="font-medium">{model.name}</span>
          {model.isNew && (
            <span className="flex items-center gap-0.5 text-[9px] text-amber-600 bg-amber-50 px-1 py-0.5 rounded">
              <ZapIcon className="w-2 h-2" />
              New
            </span>
          )}
          {model.reasoning && (
            <span className="flex items-center gap-0.5 text-[9px] text-purple-600 bg-purple-50 px-1 py-0.5 rounded">
              <BrainIcon className="w-2.5 h-2.5" />
              Reasoning
            </span>
          )}
        </div>
        {model.description && (
          <span className="text-xs text-muted-foreground">{model.description}</span>
        )}
      </div>
      {isSelected && <Icon name="check" size="sm" className="text-primary flex-shrink-0" />}
    </DropdownMenuItem>
  );
}

export default ModelSelector;
