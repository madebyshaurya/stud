import { useState, useEffect } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Icon } from "@/components/icons/Icon";
import { ProviderIcon } from "@/components/icons/ProviderIcon";
import { Loader } from "@/components/ui/loader";
import { useSettingsStore } from "@/stores/settings";
import { useAuthStore } from "@/stores/auth";
import { useModelsStore } from "@/stores/models";
import { cn } from "@/lib/utils";
import { LogOut, Sparkles, Key, Copy, Check, X, RefreshCw, Bug } from "lucide-react";

// Debug panel to show current auth/model status
function DebugPanel() {
  const [isOpen, setIsOpen] = useState(false);
  const { authMethod, isOAuthAuthenticated, oauthAuth } = useAuthStore();
  const { selectedModel, selectedProvider, apiKeys } = useSettingsStore();
  const { codexModels, lastFetched, isLoading } = useModelsStore();

  const isOAuth = isOAuthAuthenticated();

  if (!isOpen) {
    return (
      <button
        onClick={() => setIsOpen(true)}
        className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground pt-4"
      >
        <Bug className="w-3 h-3" />
        Show Debug Info
      </button>
    );
  }

  return (
    <div className="pt-4 border-t space-y-2">
      <div className="flex items-center justify-between">
        <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
          Debug Info
        </h3>
        <button
          onClick={() => setIsOpen(false)}
          className="text-xs text-muted-foreground hover:text-foreground"
        >
          Hide
        </button>
      </div>
      <div className="bg-muted/50 rounded-lg p-3 font-mono text-xs space-y-1">
        <div><span className="text-muted-foreground">Auth Method:</span> {authMethod}</div>
        <div><span className="text-muted-foreground">OAuth Authenticated:</span> {isOAuth ? "true" : "false"}</div>
        <div><span className="text-muted-foreground">OAuth Auth Object:</span> {oauthAuth ? "exists" : "null"}</div>
        <div><span className="text-muted-foreground">Has OpenAI Key:</span> {apiKeys.openai ? "true" : "false"}</div>
        <div><span className="text-muted-foreground">Has Anthropic Key:</span> {apiKeys.anthropic ? "true" : "false"}</div>
        <div><span className="text-muted-foreground">Selected Provider:</span> {selectedProvider}</div>
        <div><span className="text-muted-foreground">Selected Model:</span> {selectedModel}</div>
        <div><span className="text-muted-foreground">Models Count:</span> {codexModels.length}</div>
        <div><span className="text-muted-foreground">Models Loading:</span> {isLoading ? "true" : "false"}</div>
        <div><span className="text-muted-foreground">Last Fetched:</span> {lastFetched ? new Date(lastFetched).toLocaleString() : "never"}</div>
      </div>
      <p className="text-xs text-muted-foreground">
        Check browser console (F12) for detailed logs when sending messages.
      </p>
    </div>
  );
}

interface ApiKeyInputProps {
  provider: "openai" | "anthropic";
  label: string;
  placeholder: string;
}

function ApiKeyInput({ provider, label, placeholder }: ApiKeyInputProps) {
  const { apiKeys, setApiKey, hasApiKey } = useSettingsStore();
  const [showKey, setShowKey] = useState(false);
  const [value, setValue] = useState(apiKeys[provider] || "");
  const isConfigured = hasApiKey(provider);

  const handleSave = () => {
    setApiKey(provider, value);
  };

  const handleClear = () => {
    setValue("");
    setApiKey(provider, "");
  };

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <ProviderIcon id={provider} size="sm" />
          <label className="text-sm font-medium">{label}</label>
        </div>
        {isConfigured && (
          <span className="text-xs text-green-600 bg-green-50 px-2 py-0.5 rounded-full flex items-center gap-1">
            <Icon name="check" size="sm" />
            Configured
          </span>
        )}
      </div>
      <div className="flex gap-2">
        <div className="relative flex-1">
          <Input
            type={showKey ? "text" : "password"}
            value={value}
            onChange={(e) => setValue(e.target.value)}
            placeholder={placeholder}
            className="pr-10 rounded-xl"
          />
          <button
            type="button"
            onClick={() => setShowKey(!showKey)}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
          >
            <Icon name={showKey ? "eye-off" : "eye"} size="sm" />
          </button>
        </div>
        {value !== (apiKeys[provider] || "") ? (
          <Button onClick={handleSave} size="sm" className="rounded-xl">
            Save
          </Button>
        ) : isConfigured ? (
          <Button onClick={handleClear} variant="outline" size="sm" className="rounded-xl text-destructive">
            Clear
          </Button>
        ) : null}
      </div>
    </div>
  );
}

// ChatGPT Plus/Pro OAuth component
function ChatGPTAuth() {
  const {
    isLoggingIn,
    loginError,
    loginUrl,
    startLogin,
    logout,
    cancelLogin,
    checkOAuthCallback,
    isOAuthAuthenticated,
  } = useAuthStore();
  const { codexModels, isLoading: isLoadingModels, refreshModels, lastFetched } = useModelsStore();

  const [copied, setCopied] = useState(false);
  const isAuthenticated = isOAuthAuthenticated();

  // Poll for OAuth callback when logging in
  useEffect(() => {
    if (!isLoggingIn) return;
    
    const interval = setInterval(async () => {
      const completed = await checkOAuthCallback();
      if (completed) {
        clearInterval(interval);
      }
    }, 1000);
    
    // Cleanup after 5 minutes
    const timeout = setTimeout(() => clearInterval(interval), 5 * 60 * 1000);
    
    return () => {
      clearInterval(interval);
      clearTimeout(timeout);
    };
  }, [isLoggingIn, checkOAuthCallback]);

  const handleCopyUrl = async () => {
    if (loginUrl) {
      await navigator.clipboard.writeText(loginUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="w-5 h-5 rounded-full bg-gradient-to-br from-[#10a37f] to-[#1a7f64] flex items-center justify-center">
            <Sparkles className="w-3 h-3 text-white" />
          </div>
          <label className="text-sm font-medium">ChatGPT Plus/Pro</label>
        </div>
        {isAuthenticated && (
          <span className="text-xs text-green-600 bg-green-50 px-2 py-0.5 rounded-full flex items-center gap-1">
            <Icon name="check" size="sm" />
            Signed In
          </span>
        )}
      </div>
      
      <p className="text-xs text-muted-foreground">
        Sign in with your ChatGPT Plus or Pro subscription. No API key needed!
      </p>

      {loginError && (
        <p className="text-xs text-red-600 bg-red-50 p-2 rounded-lg">
          {loginError}
        </p>
      )}

      {isAuthenticated ? (
        <div className="space-y-2">
          <div className="flex items-center justify-between p-3 bg-green-50 rounded-xl">
            <div className="flex items-center gap-2">
              <div className="w-2 h-2 rounded-full bg-green-500" />
              <span className="text-sm text-green-700">Connected to ChatGPT</span>
            </div>
            <Button
              variant="ghost"
              size="sm"
              onClick={logout}
              className="text-red-600 hover:text-red-700 hover:bg-red-50"
            >
              <LogOut className="w-4 h-4 mr-1" />
              Sign Out
            </Button>
          </div>
          {/* Model info and refresh */}
          <div className="flex items-center justify-between px-1">
            <span className="text-xs text-muted-foreground">
              {codexModels.length} models available
              {lastFetched && (
                <span className="ml-1">
                  · Updated {new Date(lastFetched).toLocaleTimeString()}
                </span>
              )}
            </span>
            <Button
              variant="ghost"
              size="sm"
              onClick={refreshModels}
              disabled={isLoadingModels}
              className="h-6 px-2 text-xs"
            >
              <RefreshCw className={cn("w-3 h-3 mr-1", isLoadingModels && "animate-spin")} />
              Refresh
            </Button>
          </div>
        </div>
      ) : isLoggingIn ? (
        <div className="space-y-3">
          {/* Signing in state with URL fallback */}
          <div className="flex items-center justify-between p-3 bg-primary/5 rounded-xl">
            <div className="flex items-center gap-2">
              <Loader variant="dots" size="sm" />
              <Loader variant="text-shimmer" text="Signing in" size="sm" />
            </div>
            <Button
              variant="ghost"
              size="sm"
              onClick={cancelLogin}
              className="text-muted-foreground hover:text-foreground"
            >
              <X className="w-4 h-4" />
            </Button>
          </div>

          {/* URL fallback */}
          {loginUrl && (
            <div className="space-y-2">
              <p className="text-xs text-muted-foreground">
                Browser didn't open? Copy this URL and paste it in your browser:
              </p>
              <div className="flex gap-2">
                <Input
                  value={loginUrl}
                  readOnly
                  className="text-xs font-mono rounded-lg h-9"
                />
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleCopyUrl}
                  className="shrink-0 h-9 w-9 p-0 rounded-lg"
                >
                  {copied ? (
                    <Check className="w-4 h-4 text-green-600" />
                  ) : (
                    <Copy className="w-4 h-4" />
                  )}
                </Button>
              </div>
            </div>
          )}

          <p className="text-xs text-muted-foreground text-center">
            Complete sign-in in your browser. This window will update automatically.
          </p>
        </div>
      ) : (
        <Button 
          onClick={startLogin}
          disabled={isLoggingIn}
          className="w-full rounded-xl bg-gradient-to-r from-[#10a37f] to-[#1a7f64] hover:from-[#0d8f6e] hover:to-[#166b55]"
        >
          <Sparkles className="w-4 h-4 mr-2" />
          Sign in with ChatGPT
        </Button>
      )}
    </div>
  );
}

// Auth method tabs
function AuthMethodTabs() {
  const { authMethod, setAuthMethod, isOAuthAuthenticated } = useAuthStore();
  const { hasApiKey } = useSettingsStore();
  
  const isOAuth = isOAuthAuthenticated();
  const hasKey = hasApiKey("openai") || hasApiKey("anthropic");

  return (
    <div className="flex gap-2 p-1 bg-muted rounded-xl">
      <button
        onClick={() => setAuthMethod("oauth")}
        className={cn(
          "flex-1 flex items-center justify-center gap-2 py-2 px-3 rounded-lg text-sm font-medium transition-all",
          authMethod === "oauth" 
            ? "bg-background shadow-sm text-foreground" 
            : "text-muted-foreground hover:text-foreground"
        )}
      >
        <Sparkles className="w-4 h-4" />
        ChatGPT Plus/Pro
        {isOAuth && <span className="w-2 h-2 rounded-full bg-green-500" />}
      </button>
      <button
        onClick={() => setAuthMethod("api_key")}
        className={cn(
          "flex-1 flex items-center justify-center gap-2 py-2 px-3 rounded-lg text-sm font-medium transition-all",
          authMethod === "api_key" 
            ? "bg-background shadow-sm text-foreground" 
            : "text-muted-foreground hover:text-foreground"
        )}
      >
        <Key className="w-4 h-4" />
        API Keys
        {hasKey && <span className="w-2 h-2 rounded-full bg-green-500" />}
      </button>
    </div>
  );
}

interface SettingsDialogProps {
  children?: React.ReactNode;
}

export function SettingsDialog({ children }: SettingsDialogProps) {
  const { authMethod } = useAuthStore();

  return (
    <Dialog>
      <DialogTrigger asChild>
        {children || (
          <Button variant="ghost" size="icon" className="rounded-xl">
            <Icon name="settings-gear" size="md" />
          </Button>
        )}
      </DialogTrigger>
      <DialogContent className="sm:max-w-md rounded-2xl">
        <DialogHeader>
          <DialogTitle className="text-xl">Settings</DialogTitle>
          <DialogDescription>
            Configure your AI provider to start chatting.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-6 py-4">
          {/* Auth method tabs */}
          <AuthMethodTabs />

          {/* Auth content based on selected method */}
          <div className="space-y-4">
            {authMethod === "oauth" ? (
              <ChatGPTAuth />
            ) : (
              <>
                <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">
                  API Keys
                </h3>
                <ApiKeyInput
                  provider="openai"
                  label="OpenAI"
                  placeholder="sk-..."
                />
                <ApiKeyInput
                  provider="anthropic"
                  label="Anthropic"
                  placeholder="sk-ant-..."
                />
              </>
            )}
          </div>
          
          <div className="pt-4 border-t">
            <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide mb-3">
              Roblox Studio
            </h3>
            <div className="flex items-center justify-between p-3 bg-muted/50 rounded-xl">
              <div className="flex items-center gap-2">
                <div className={cn(
                  "w-2 h-2 rounded-full",
                  "bg-muted-foreground" // Will change to green when connected
                )} />
                <span className="text-sm">Studio Connection</span>
              </div>
              <span className="text-xs text-muted-foreground">
                Not connected
              </span>
            </div>
            <p className="text-xs text-muted-foreground mt-2">
              Install the Stud plugin in Roblox Studio to enable AI-powered editing.
            </p>
          </div>

          {/* Debug Panel - shows auth status */}
          <DebugPanel />
        </div>
      </DialogContent>
    </Dialog>
  );
}

export default SettingsDialog;
