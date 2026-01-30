/**
 * SettingsPanel - Slide-out settings panel
 *
 * Provides access to API keys, UI preferences, and app settings.
 */

import { useState } from "react";
import { useSettingsStore } from "@/stores/settings";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Settings, Key, Palette, Zap, RotateCcw, ExternalLink, Check, Eye, EyeOff } from "lucide-react";

interface SettingsPanelProps {
  trigger?: React.ReactNode;
}

export function SettingsPanel({ trigger }: SettingsPanelProps) {
  const { apiKeys, setApiKey, appSettings, updateAppSettings, resetAppSettings } = useSettingsStore();
  const [showOpenAIKey, setShowOpenAIKey] = useState(false);
  const [showAnthropicKey, setShowAnthropicKey] = useState(false);
  const [localOpenAI, setLocalOpenAI] = useState(apiKeys.openai || "");
  const [localAnthropic, setLocalAnthropic] = useState(apiKeys.anthropic || "");
  const [saved, setSaved] = useState<string | null>(null);

  const handleSaveKey = (provider: "openai" | "anthropic", value: string) => {
    setApiKey(provider, value);
    setSaved(provider);
    setTimeout(() => setSaved(null), 2000);
  };

  return (
    <Sheet>
      <SheetTrigger asChild>
        {trigger ?? (
          <Button variant="ghost" size="icon" className="h-8 w-8">
            <Settings className="w-4 h-4" />
          </Button>
        )}
      </SheetTrigger>
      <SheetContent className="w-[400px] sm:w-[540px] overflow-y-auto">
        <SheetHeader>
          <SheetTitle className="font-heading">Settings</SheetTitle>
          <SheetDescription>
            Configure <span className="font-logo">Stud</span> to your preferences
          </SheetDescription>
        </SheetHeader>

        <Tabs defaultValue="api" className="mt-6">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="api" className="gap-1.5">
              <Key className="w-3.5 h-3.5" />
              API Keys
            </TabsTrigger>
            <TabsTrigger value="ui" className="gap-1.5">
              <Palette className="w-3.5 h-3.5" />
              Interface
            </TabsTrigger>
            <TabsTrigger value="behavior" className="gap-1.5">
              <Zap className="w-3.5 h-3.5" />
              Behavior
            </TabsTrigger>
          </TabsList>

          {/* API Keys Tab */}
          <TabsContent value="api" className="mt-4 space-y-6">
            {/* OpenAI */}
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <Label htmlFor="openai-key" className="text-sm font-medium">
                  OpenAI API Key
                </Label>
                <a
                  href="https://platform.openai.com/api-keys"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-xs text-muted-foreground hover:text-foreground flex items-center gap-1"
                >
                  Get key <ExternalLink className="w-3 h-3" />
                </a>
              </div>
              <div className="flex gap-2">
                <div className="relative flex-1">
                  <Input
                    id="openai-key"
                    type={showOpenAIKey ? "text" : "password"}
                    placeholder="sk-..."
                    value={localOpenAI}
                    onChange={(e) => setLocalOpenAI(e.target.value)}
                    className="pr-10"
                  />
                  <button
                    type="button"
                    onClick={() => setShowOpenAIKey(!showOpenAIKey)}
                    className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                  >
                    {showOpenAIKey ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
                <Button
                  size="sm"
                  onClick={() => handleSaveKey("openai", localOpenAI)}
                  disabled={localOpenAI === apiKeys.openai}
                  className="gap-1"
                >
                  {saved === "openai" ? <Check className="w-3.5 h-3.5" /> : "Save"}
                </Button>
              </div>
            </div>

            {/* Anthropic */}
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <Label htmlFor="anthropic-key" className="text-sm font-medium">
                  Anthropic API Key
                </Label>
                <a
                  href="https://console.anthropic.com/settings/keys"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-xs text-muted-foreground hover:text-foreground flex items-center gap-1"
                >
                  Get key <ExternalLink className="w-3 h-3" />
                </a>
              </div>
              <div className="flex gap-2">
                <div className="relative flex-1">
                  <Input
                    id="anthropic-key"
                    type={showAnthropicKey ? "text" : "password"}
                    placeholder="sk-ant-..."
                    value={localAnthropic}
                    onChange={(e) => setLocalAnthropic(e.target.value)}
                    className="pr-10"
                  />
                  <button
                    type="button"
                    onClick={() => setShowAnthropicKey(!showAnthropicKey)}
                    className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                  >
                    {showAnthropicKey ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
                <Button
                  size="sm"
                  onClick={() => handleSaveKey("anthropic", localAnthropic)}
                  disabled={localAnthropic === apiKeys.anthropic}
                  className="gap-1"
                >
                  {saved === "anthropic" ? <Check className="w-3.5 h-3.5" /> : "Save"}
                </Button>
              </div>
            </div>

            {/* Codex info */}
            <div className="rounded-lg border bg-muted/30 p-4">
              <h4 className="text-sm font-medium mb-2">ChatGPT Plus/Pro (Codex)</h4>
              <p className="text-xs text-muted-foreground">
                Using ChatGPT Plus or Pro? Click the model selector in the chat and choose "Codex" to authenticate with your ChatGPT account. No API key needed.
              </p>
            </div>
          </TabsContent>

          {/* UI Tab */}
          <TabsContent value="ui" className="mt-4 space-y-4">
            <SettingToggle
              label="Animations"
              description="Enable smooth animations and transitions"
              checked={appSettings.animationsEnabled}
              onCheckedChange={(checked) => updateAppSettings({ animationsEnabled: checked })}
            />

            <SettingToggle
              label="Sound Effects"
              description="Play sounds for notifications and actions"
              checked={appSettings.soundEnabled}
              onCheckedChange={(checked) => updateAppSettings({ soundEnabled: checked })}
            />

            <SettingToggle
              label="Compact Mode"
              description="Reduce spacing for more content on screen"
              checked={appSettings.compactMode}
              onCheckedChange={(checked) => updateAppSettings({ compactMode: checked })}
            />

            <SettingToggle
              label="Show Tool Details"
              description="Display expanded tool call information"
              checked={appSettings.showToolDetails}
              onCheckedChange={(checked) => updateAppSettings({ showToolDetails: checked })}
            />
          </TabsContent>

          {/* Behavior Tab */}
          <TabsContent value="behavior" className="mt-4 space-y-4">
            <SettingToggle
              label="Auto-scroll Chat"
              description="Automatically scroll to new messages"
              checked={appSettings.autoScrollChat}
              onCheckedChange={(checked) => updateAppSettings({ autoScrollChat: checked })}
            />

            <SettingToggle
              label="Confirm Destructive Actions"
              description="Ask before deleting instances or scripts"
              checked={appSettings.confirmDestructiveActions}
              onCheckedChange={(checked) => updateAppSettings({ confirmDestructiveActions: checked })}
            />

            <SettingToggle
              label="Save Chat History"
              description="Remember conversations between sessions"
              checked={appSettings.saveHistory}
              onCheckedChange={(checked) => updateAppSettings({ saveHistory: checked })}
            />

            <div className="pt-4 border-t">
              <Button
                variant="outline"
                onClick={resetAppSettings}
                className="w-full gap-2"
              >
                <RotateCcw className="w-4 h-4" />
                Reset to Defaults
              </Button>
            </div>
          </TabsContent>
        </Tabs>

        {/* Keyboard shortcuts */}
        <div className="mt-8 pt-6 border-t">
          <h3 className="text-sm font-medium mb-3">Keyboard Shortcuts</h3>
          <div className="space-y-2 text-xs">
            <ShortcutRow keys={["⌘", "Enter"]} description="Send message" />
            <ShortcutRow keys={["⌘", "K"]} description="Clear chat" />
            <ShortcutRow keys={["⌘", ","]} description="Open settings" />
            <ShortcutRow keys={["Esc"]} description="Cancel / Close" />
          </div>
        </div>
      </SheetContent>
    </Sheet>
  );
}

function SettingToggle({
  label,
  description,
  checked,
  onCheckedChange,
}: {
  label: string;
  description: string;
  checked: boolean;
  onCheckedChange: (checked: boolean) => void;
}) {
  return (
    <div className="flex items-center justify-between py-2">
      <div className="space-y-0.5">
        <Label className="text-sm font-medium">{label}</Label>
        <p className="text-xs text-muted-foreground">{description}</p>
      </div>
      <Switch checked={checked} onCheckedChange={onCheckedChange} />
    </div>
  );
}

function ShortcutRow({ keys, description }: { keys: string[]; description: string }) {
  return (
    <div className="flex items-center justify-between">
      <span className="text-muted-foreground">{description}</span>
      <div className="flex items-center gap-1">
        {keys.map((key, i) => (
          <kbd
            key={i}
            className="px-1.5 py-0.5 bg-muted rounded text-[10px] font-mono border"
          >
            {key}
          </kbd>
        ))}
      </div>
    </div>
  );
}
