import { useState, useCallback, useEffect } from "react";
import {
  PromptInput,
  PromptInputTextarea,
  PromptInputActions,
  PromptInputAction,
} from "@/components/ui/prompt-input";
import { Button } from "@/components/ui/button";
import { PromptSuggestion } from "@/components/ui/prompt-suggestion";
import {
  ChatContainerRoot,
  ChatContainerContent,
} from "@/components/ui/chat-container";
import { ScrollButton } from "@/components/ui/scroll-button";
import { Message, MessageContent } from "@/components/ui/message";
import { ToolCalls } from "@/components/ui/tool-call";
import { Loader } from "@/components/ui/loader";
import { Logo, LogoMark } from "@/components/icons/Logo";
import { BotAvatar, UserAvatar } from "@/components/icons/Avatars";
import { Icon } from "@/components/icons/Icon";
import { ModelSelector } from "@/components/chat/ModelSelector";
import { SettingsDialog } from "@/components/settings/SettingsDialog";
import { useChatStore } from "@/stores/chat";
import { useSettingsStore } from "@/stores/settings";
import { useRobloxStore, ConnectionStatus } from "@/stores/roblox";
import { usePluginStore } from "@/stores/plugin";
import { useAuthStore } from "@/stores/auth";
import { useChat } from "@/lib/ai/providers";
import { cn } from "@/lib/utils";
import { ArrowUp, Square, CheckCircle2, Download, FolderOpen, RefreshCw } from "lucide-react";

const SUGGESTIONS = [
  "Create an NPC that follows players",
  "Add a currency system with DataStore",
  "Make a gun that shoots projectiles",
  "Design a shop GUI with items",
];

// Step indicator for connection flow
function ConnectionStep({ 
  step, 
  title, 
  description, 
  status 
}: { 
  step: number;
  title: string;
  description: string;
  status: "pending" | "active" | "complete";
}) {
  return (
    <div className="flex items-start gap-4">
      <div className="flex flex-col items-center">
        <div
          className={cn(
            "w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium transition-all",
            status === "complete" && "bg-green-100 text-green-600",
            status === "active" && "bg-primary/10 text-primary",
            status === "pending" && "bg-muted text-muted-foreground"
          )}
        >
          {status === "complete" ? (
            <CheckCircle2 className="w-5 h-5" />
          ) : status === "active" ? (
            <Loader variant="circular" size="sm" />
          ) : (
            step
          )}
        </div>
      </div>
      <div className="flex-1 pt-1">
        <h3 className={cn(
          "font-medium",
          status === "complete" && "text-green-600",
          status === "active" && "text-foreground",
          status === "pending" && "text-muted-foreground"
        )}>
          {title}
        </h3>
        <p className="text-sm text-muted-foreground mt-0.5">{description}</p>
      </div>
    </div>
  );
}

// Connection screen shown when bridge is not connected
function ConnectionScreen({ status }: { status: ConnectionStatus }) {
  const { 
    status: pluginStatus, 
    isChecking, 
    isInstalling, 
    checkPlugin, 
    installPlugin 
  } = usePluginStore();
  
  const [installMessage, setInstallMessage] = useState<string | null>(null);
  const [showManualPath, setShowManualPath] = useState(false);

  // Check plugin status on mount
  useEffect(() => {
    checkPlugin();
  }, [checkPlugin]);

  const handleInstallPlugin = async () => {
    try {
      const result = await installPlugin();
      setInstallMessage(result.message);
    } catch (error) {
      setInstallMessage(`Error: ${error instanceof Error ? error.message : String(error)}`);
    }
  };

  const handleDownloadPlugin = async () => {
    // Fetch the plugin content and trigger download
    try {
      const response = await fetch("/studio-plugin/stud-bridge.server.lua");
      if (!response.ok) {
        // If not available via fetch, we'll use the embedded version from Tauri
        // For now, show manual path
        setShowManualPath(true);
        return;
      }
      const content = await response.text();
      const blob = new Blob([content], { type: "text/plain" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = "stud-bridge.server.lua";
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } catch {
      setShowManualPath(true);
    }
  };

  const getStepStatus = (step: 1 | 2 | 3): "pending" | "active" | "complete" => {
    if (status === "connected") return "complete";
    if (status === "bridge_only") {
      if (step === 1) return "complete";
      if (step === 2) return "active";
      return "pending";
    }
    // disconnected
    if (step === 1) return "active";
    return "pending";
  };

  const pluginInstalled = pluginStatus?.installed && pluginStatus?.is_current_version;

  return (
    <div className="h-screen flex flex-col bg-background">
      {/* Minimal header */}
      <header className="flex items-center justify-between px-6 py-4">
        <Logo />
        <SettingsDialog />
      </header>

      {/* Centered content */}
      <main className="flex-1 flex flex-col items-center justify-center px-6 pb-24">
        <div className="w-full max-w-md space-y-6">
          {/* Main heading */}
          <div className="text-center space-y-2">
            <div className="inline-flex items-center justify-center w-16 h-16 rounded-3xl bg-primary/10 mb-4">
              <Loader variant="dots" size="lg" />
            </div>
            <h1 className="text-2xl font-semibold text-foreground">
              Connecting to Roblox Studio
            </h1>
            <p className="text-muted-foreground">
              <Loader variant="loading-dots" text="Waiting for connection" size="sm" />
            </p>
          </div>

          {/* Connection steps */}
          <div className="bg-card rounded-2xl border border-border p-6 space-y-6">
            <ConnectionStep
              step={1}
              title="Start Stud Desktop"
              description="The bridge server starts automatically with this app"
              status={getStepStatus(1)}
            />
            
            <div className="border-l-2 border-dashed border-border ml-4 h-4" />
            
            <ConnectionStep
              step={2}
              title="Open Roblox Studio"
              description="Launch Roblox Studio and open your project"
              status={getStepStatus(2)}
            />
            
            <div className="border-l-2 border-dashed border-border ml-4 h-4" />
            
            <ConnectionStep
              step={3}
              title="Connect stud-bridge Plugin"
              description="Click 'Connect' in the stud-bridge plugin toolbar"
              status={getStepStatus(3)}
            />
          </div>

          {/* Plugin Installation Card */}
          <div className="bg-card rounded-2xl border border-border p-5 space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="font-medium text-foreground">Plugin Status</span>
                {isChecking ? (
                  <Loader variant="circular" size="sm" />
                ) : pluginInstalled ? (
                  <span className="flex items-center gap-1 text-xs text-green-600 bg-green-50 px-2 py-0.5 rounded-full">
                    <CheckCircle2 className="w-3 h-3" />
                    Installed
                  </span>
                ) : pluginStatus?.installed ? (
                  <span className="flex items-center gap-1 text-xs text-amber-600 bg-amber-50 px-2 py-0.5 rounded-full">
                    Update Available
                  </span>
                ) : (
                  <span className="flex items-center gap-1 text-xs text-muted-foreground bg-muted px-2 py-0.5 rounded-full">
                    Not Installed
                  </span>
                )}
              </div>
              <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8"
                onClick={() => checkPlugin()}
                disabled={isChecking}
              >
                <RefreshCw className={cn("w-4 h-4", isChecking && "animate-spin")} />
              </Button>
            </div>

            {/* Install Message */}
            {installMessage && (
              <p className={cn(
                "text-sm p-2 rounded-lg",
                installMessage.startsWith("Error") 
                  ? "bg-red-50 text-red-700" 
                  : "bg-green-50 text-green-700"
              )}>
                {installMessage}
              </p>
            )}

            {/* Action Buttons */}
            <div className="flex gap-2">
              <Button
                onClick={handleInstallPlugin}
                disabled={isInstalling || (pluginInstalled ?? false)}
                className="flex-1"
              >
                {isInstalling ? (
                  <>
                    <Loader variant="circular" size="sm" className="mr-2" />
                    Installing...
                  </>
                ) : pluginInstalled ? (
                  <>
                    <CheckCircle2 className="w-4 h-4 mr-2" />
                    Up to Date
                  </>
                ) : pluginStatus?.installed ? (
                  <>
                    <Download className="w-4 h-4 mr-2" />
                    Update Plugin
                  </>
                ) : (
                  <>
                    <Download className="w-4 h-4 mr-2" />
                    Install Automatically
                  </>
                )}
              </Button>
              
              <Button
                variant="outline"
                onClick={handleDownloadPlugin}
                title="Download plugin file for manual installation"
              >
                <FolderOpen className="w-4 h-4" />
              </Button>
            </div>

            {/* Manual path info */}
            {showManualPath && pluginStatus && (
              <div className="text-xs text-muted-foreground bg-muted/50 rounded-lg p-3 space-y-1">
                <p className="font-medium text-foreground">Manual Installation:</p>
                <p>Copy the plugin to your Roblox Plugins folder:</p>
                <code className="block bg-background px-2 py-1 rounded text-xs break-all">
                  {pluginStatus.plugins_folder}
                </code>
              </div>
            )}
          </div>
        </div>
      </main>
    </div>
  );
}

// Status badge for the header
function StatusBadge({ status }: { status: ConnectionStatus }) {
  const config = {
    disconnected: {
      color: "bg-zinc-400",
      label: "Offline",
    },
    bridge_only: {
      color: "bg-amber-500",
      label: "Waiting",
    },
    connected: {
      color: "bg-green-500",
      label: "Connected",
    },
  };

  const { color, label } = config[status];

  return (
    <div className="flex items-center gap-2 text-sm text-muted-foreground">
      <div className={cn("w-2 h-2 rounded-full", color)} />
      <span>{label}</span>
    </div>
  );
}

export function Home() {
  const [input, setInput] = useState("");
  const { messages, isStreaming, error, addMessage, updateMessage, addToolCall, updateToolCall, setStreaming, setError } = useChatStore();
  const { hasApiKey } = useSettingsStore();
  const { status: studioStatus, startPolling } = useRobloxStore();
  const { sendMessage } = useChat();

  // Start polling for connection on mount
  useEffect(() => {
    const cleanup = startPolling();
    return cleanup;
  }, [startPolling]);

  const hasConfiguredProvider = hasApiKey("openai") || hasApiKey("anthropic") || useAuthStore.getState().isOAuthAuthenticated();
  const isConnected = studioStatus === "connected";

  const handleSubmit = useCallback(async () => {
    if (!input.trim() || isStreaming) return;

    const userMessage = input.trim();
    setInput("");

    console.log("[Home] Submitting message:", userMessage);

    // Add user message
    addMessage({ role: "user", content: userMessage });

    // Add placeholder for assistant
    const assistantId = addMessage({ role: "assistant", content: "" });

    setStreaming(true);
    setError(null);

    try {
      const chatMessages = [
        ...messages.map((m) => ({ role: m.role, content: m.content })),
        { role: "user" as const, content: userMessage },
      ];

      console.log("[Home] Sending", chatMessages.length, "messages to AI");

      let fullText = "";

      await sendMessage(chatMessages, {
        onToken: (token) => {
          fullText += token;
          updateMessage(assistantId, fullText);
        },
        onToolCall: (toolCall) => {
          console.log("[Home] Tool call received:", toolCall.name);
          // Add tool call to the assistant message
          addToolCall(assistantId, {
            id: toolCall.id,
            name: toolCall.name,
            args: toolCall.input,
          });
          // Mark it as running
          updateToolCall(assistantId, toolCall.id, { status: "running" });
        },
        onToolResult: (toolResult) => {
          console.log("[Home] Tool result received:", toolResult.id);
          // Update the tool call with the result
          updateToolCall(assistantId, toolResult.id, {
            status: "complete",
            result: toolResult.output,
          });
        },
        onFinish: () => {
          console.log("[Home] Stream finished, total length:", fullText.length);
          setStreaming(false);
        },
        onError: (error) => {
          console.error("[Home] Stream error:", error);
          setError(error.message);
          setStreaming(false);
        },
      });
    } catch (error) {
      console.error("[Home] Chat error:", error);
      const errorMessage = error instanceof Error ? error.message : String(error);
      setError(errorMessage);
      setStreaming(false);
    }
  }, [input, isStreaming, messages, addMessage, updateMessage, addToolCall, updateToolCall, setStreaming, setError, sendMessage]);

  const handleSuggestionClick = (suggestion: string) => {
    setInput(suggestion);
  };

  const handleStop = () => {
    setStreaming(false);
  };

  // Show connection screen if not connected
  if (!isConnected) {
    return <ConnectionScreen status={studioStatus} />;
  }

  // Empty state - show centered input (connected but no messages)
  if (messages.length === 0) {
    return (
      <div className="h-screen flex flex-col bg-background">
        {/* Header */}
        <header className="flex items-center justify-between px-6 py-4 border-b border-border/50">
          <Logo />
          <div className="flex items-center gap-3">
            <StatusBadge status={studioStatus} />
            <SettingsDialog />
          </div>
        </header>

        {/* Centered content */}
        <main className="flex-1 flex flex-col items-center justify-center px-6 pb-24">
          <div className="w-full max-w-2xl space-y-8">
            {/* Welcome message */}
            <div className="text-center space-y-2">
              <h1 className="text-3xl font-semibold text-foreground">
                What would you like to build?
              </h1>
              <p className="text-muted-foreground">
                I can help you create scripts, design systems, and build games in Roblox Studio.
              </p>
            </div>

            {/* Input */}
            <div className="relative">
              <PromptInput
                value={input}
                onValueChange={setInput}
                onSubmit={handleSubmit}
                isLoading={isStreaming}
                className="rounded-2xl border-2 border-border shadow-lg bg-card"
              >
                <PromptInputTextarea
                  placeholder={
                    hasConfiguredProvider
                      ? "Ask me anything about Roblox development..."
                      : "Configure an API key in settings to start..."
                  }
                  disabled={!hasConfiguredProvider}
                  className="min-h-[60px] text-base"
                />
                <PromptInputActions className="justify-between px-3 py-2">
                  <div className="flex items-center gap-1">
                    <PromptInputAction tooltip="Attach file">
                      <Button variant="ghost" size="icon" className="h-8 w-8 rounded-lg" disabled>
                        <Icon name="link" size="sm" />
                      </Button>
                    </PromptInputAction>
                  </div>
                  <div className="flex items-center gap-2">
                    <ModelSelector disabled={!hasConfiguredProvider} />
                    <Button
                      size="icon"
                      className="h-8 w-8 rounded-lg"
                      onClick={handleSubmit}
                      disabled={!input.trim() || isStreaming || !hasConfiguredProvider}
                    >
                      {isStreaming ? (
                        <Square className="h-4 w-4 fill-current" />
                      ) : (
                        <ArrowUp className="h-4 w-4" />
                      )}
                    </Button>
                  </div>
                </PromptInputActions>
              </PromptInput>
            </div>

            {/* Suggestions */}
            <div className="flex flex-wrap justify-center gap-2">
              {SUGGESTIONS.map((suggestion) => (
                <PromptSuggestion
                  key={suggestion}
                  onClick={() => handleSuggestionClick(suggestion)}
                  className="rounded-xl"
                >
                  {suggestion}
                </PromptSuggestion>
              ))}
            </div>

            {/* Not configured warning */}
            {!hasConfiguredProvider && (
              <div className="text-center">
                <p className="text-sm text-amber-600">
                  <Icon name="key" size="sm" className="inline mr-1" />
                  No API key configured.{" "}
                  <SettingsDialog>
                    <button className="underline hover:no-underline">
                      Open settings
                    </button>
                  </SettingsDialog>{" "}
                  to add one.
                </p>
              </div>
            )}
          </div>
        </main>
      </div>
    );
  }

  // Chat view
  return (
    <div className="h-screen flex flex-col bg-background">
      {/* Header */}
      <header className="flex items-center justify-between px-6 py-3 border-b border-border/50 bg-card/50 backdrop-blur-sm">
        <div className="flex items-center gap-3">
          <LogoMark className="w-8 h-8" />
          <span className="text-lg font-semibold">Stud</span>
        </div>
        <div className="flex items-center gap-3">
          <StatusBadge status={studioStatus} />
          <SettingsDialog />
        </div>
      </header>

      {/* Chat messages */}
      <ChatContainerRoot className="flex-1 relative">
        <ChatContainerContent className="max-w-3xl mx-auto px-4 py-6 space-y-6">
          {/* Error alert */}
          {error && (
            <div className="bg-red-50 border border-red-200 text-red-700 rounded-xl p-4 flex items-start gap-3">
              <div className="flex-shrink-0 w-5 h-5 mt-0.5">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <circle cx="12" cy="12" r="10" />
                  <line x1="12" y1="8" x2="12" y2="12" />
                  <line x1="12" y1="16" x2="12.01" y2="16" />
                </svg>
              </div>
              <div className="flex-1">
                <p className="font-medium">Error</p>
                <p className="text-sm mt-1">{error}</p>
              </div>
              <button
                onClick={() => setError(null)}
                className="flex-shrink-0 text-red-500 hover:text-red-700"
              >
                <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <line x1="18" y1="6" x2="6" y2="18" />
                  <line x1="6" y1="6" x2="18" y2="18" />
                </svg>
              </button>
            </div>
          )}

          {messages.map((message) => (
            <Message key={message.id} className="gap-4">
              {message.role === "assistant" ? (
                <BotAvatar />
              ) : (
                <UserAvatar />
              )}
              <div className="flex-1 space-y-3">
                {/* Tool calls (shown before content for assistant) */}
                {message.role === "assistant" && message.toolCalls && message.toolCalls.length > 0 && (
                  <ToolCalls toolCalls={message.toolCalls} />
                )}

                {/* Message content */}
                {message.content ? (
                  <MessageContent
                    markdown={message.role === "assistant"}
                    className={cn(
                      "prose prose-sm max-w-none",
                      message.role === "user" && "bg-muted/50 rounded-2xl px-4 py-3"
                    )}
                  >
                    {message.content}
                  </MessageContent>
                ) : (
                  isStreaming && message.role === "assistant" && !message.toolCalls?.length && (
                    <div className="flex items-center gap-2 h-8">
                      <Loader variant="dots" size="sm" />
                      <span className="text-sm text-muted-foreground">Thinking...</span>
                    </div>
                  )
                )}
              </div>
            </Message>
          ))}
        </ChatContainerContent>
        
        {/* Scroll to bottom button */}
        <div className="absolute bottom-24 left-1/2 -translate-x-1/2">
          <ScrollButton className="shadow-lg rounded-full" />
        </div>
      </ChatContainerRoot>

      {/* Input */}
      <div className="border-t border-border/50 bg-card/50 backdrop-blur-sm px-4 py-4">
        <div className="max-w-3xl mx-auto">
          <PromptInput
            value={input}
            onValueChange={setInput}
            onSubmit={handleSubmit}
            isLoading={isStreaming}
            className="rounded-2xl border shadow-sm"
          >
            <PromptInputTextarea
              placeholder="Ask a follow-up..."
              className="min-h-[44px] text-base"
            />
            <PromptInputActions className="justify-between px-3 py-2">
              <div className="flex items-center gap-1">
                <PromptInputAction tooltip="Attach file">
                  <Button variant="ghost" size="icon" className="h-8 w-8 rounded-lg" disabled>
                    <Icon name="link" size="sm" />
                  </Button>
                </PromptInputAction>
              </div>
              <div className="flex items-center gap-2">
                <ModelSelector />
                {isStreaming ? (
                  <Button
                    size="icon"
                    variant="destructive"
                    className="h-8 w-8 rounded-lg"
                    onClick={handleStop}
                  >
                    <Square className="h-4 w-4 fill-current" />
                  </Button>
                ) : (
                  <Button
                    size="icon"
                    className="h-8 w-8 rounded-lg"
                    onClick={handleSubmit}
                    disabled={!input.trim()}
                  >
                    <ArrowUp className="h-4 w-4" />
                  </Button>
                )}
              </div>
            </PromptInputActions>
          </PromptInput>
        </div>
      </div>
    </div>
  );
}

export default Home;
