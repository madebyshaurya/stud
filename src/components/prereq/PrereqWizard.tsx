/**
 * Prerequisite Wizard
 *
 * Shows on app startup when prerequisites are not met.
 * Only displays items that need attention.
 */

import { useEffect } from "react";
import { invoke } from "@tauri-apps/api/core";
import { openUrl } from "@tauri-apps/plugin-opener";
import { usePrereqStore, type PrereqCheck } from "@/stores/prereq";
import { Loader } from "@/components/ui/loader";
import { cn } from "@/lib/utils";
import { SettingsDialog } from "@/components/settings/SettingsDialog";
import {
  CheckCircle,
  XCircle,
  AlertTriangle,
  Loader2,
  ExternalLink,
  Download,
  Plug,
  Key,
  Server,
  Monitor,
} from "lucide-react";

const iconMap: Record<string, React.ElementType> = {
  "roblox-studio": Monitor,
  "stud-plugin": Plug,
  "api-provider": Key,
  "bridge-server": Server,
  "studio-connection": Plug,
};

function StatusIcon({ status }: { status: PrereqCheck["status"] }) {
  switch (status) {
    case "pending":
      return <div className="w-5 h-5 rounded-full border-2 border-neutral-300" />;
    case "checking":
      return <Loader2 className="w-5 h-5 animate-spin text-neutral-500" />;
    case "passed":
      return <CheckCircle className="w-5 h-5 text-green-500" />;
    case "failed":
      return <XCircle className="w-5 h-5 text-red-500" />;
    case "warning":
      return <AlertTriangle className="w-5 h-5 text-amber-500" />;
  }
}

function CheckItem({
  check,
  onAction,
}: {
  check: PrereqCheck;
  onAction: (handler: string) => void;
}) {
  const Icon = iconMap[check.id] || Plug;
  const isIssue = check.status === "failed" || check.status === "warning";

  return (
    <div
      className={cn(
        "flex items-start gap-4 p-4 rounded-lg border transition-colors",
        check.status === "failed" && "border-red-200 bg-red-50",
        check.status === "warning" && "border-amber-200 bg-amber-50",
        check.status === "passed" && "border-green-200 bg-green-50",
        check.status === "pending" && "border-neutral-200 bg-neutral-50",
        check.status === "checking" && "border-neutral-200 bg-neutral-50"
      )}
    >
      <div
        className={cn(
          "p-2 rounded-lg",
          check.status === "failed" && "bg-red-100",
          check.status === "warning" && "bg-amber-100",
          check.status === "passed" && "bg-green-100",
          (check.status === "pending" || check.status === "checking") && "bg-neutral-100"
        )}
      >
        <Icon className="w-5 h-5" />
      </div>

      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <h3 className="font-medium">{check.name}</h3>
          <StatusIcon status={check.status} />
        </div>
        <p className="text-sm text-neutral-600 mt-0.5">{check.description}</p>
        {check.message && (
          <p
            className={cn(
              "text-sm mt-1",
              check.status === "failed" && "text-red-600",
              check.status === "warning" && "text-amber-600",
              check.status === "passed" && "text-green-600"
            )}
          >
            {check.message}
          </p>
        )}

        {isIssue && check.action && (
          <div className="mt-3">
            {check.action.handler === "open-settings" ? (
              <SettingsDialog>
                <button className="inline-flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium bg-black text-white rounded-md hover:bg-neutral-800 transition-colors">
                  {check.action.label}
                </button>
              </SettingsDialog>
            ) : (
              <button
                onClick={() => onAction(check.action!.handler)}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium bg-black text-white rounded-md hover:bg-neutral-800 transition-colors"
              >
                {check.action.handler === "download-studio" && <Download className="w-4 h-4" />}
                {check.action.handler === "install-plugin" && <Plug className="w-4 h-4" />}
                {check.action.label}
                {check.action.handler === "download-studio" && <ExternalLink className="w-3 h-3" />}
              </button>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

export function PrereqWizard() {
  const { checks, isChecking, showWizard, runAllChecks, dismissWizard, getFailedChecks, getWarningChecks } =
    usePrereqStore();

  useEffect(() => {
    runAllChecks();
  }, [runAllChecks]);

  const handleAction = async (handler: string) => {
    switch (handler) {
      case "download-studio":
        await openUrl("https://create.roblox.com/");
        break;
      case "install-plugin":
        try {
          await invoke("install_plugin");
          // Re-run checks after installation
          runAllChecks();
        } catch (err) {
          console.error("Failed to install plugin:", err);
        }
        break;
      case "restart-app":
        window.location.reload();
        break;
      case "show-connection-help":
        // Will be handled by dismissing and showing connection screen
        dismissWizard();
        break;
    }
  };

  const failedChecks = getFailedChecks();
  const warningChecks = getWarningChecks();
  const hasIssues = failedChecks.length > 0;

  // Don't render if no wizard needed
  if (!showWizard && !isChecking) {
    return null;
  }

  // Show loading state while checking
  if (isChecking) {
    return (
      <div className="fixed inset-0 bg-white z-50 flex items-center justify-center">
        <div className="text-center">
          <Loader variant="wave" size="lg" />
          <p className="mt-4 text-neutral-600">Checking prerequisites...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 bg-white z-50 overflow-auto">
      <div className="max-w-2xl mx-auto px-6 py-12">
        {/* Header */}
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold tracking-tight">Setup Required</h1>
          <p className="text-neutral-600 mt-2">
            {hasIssues
              ? "Some prerequisites need your attention before using Stud."
              : "Almost ready! Just a few optional items to review."}
          </p>
        </div>

        {/* Failed checks (required) */}
        {failedChecks.length > 0 && (
          <div className="mb-6">
            <h2 className="text-sm font-medium text-red-600 uppercase tracking-wide mb-3">
              Required
            </h2>
            <div className="space-y-3">
              {failedChecks.map((check) => (
                <CheckItem key={check.id} check={check} onAction={handleAction} />
              ))}
            </div>
          </div>
        )}

        {/* Warning checks (optional) */}
        {warningChecks.length > 0 && (
          <div className="mb-6">
            <h2 className="text-sm font-medium text-amber-600 uppercase tracking-wide mb-3">
              Recommended
            </h2>
            <div className="space-y-3">
              {warningChecks.map((check) => (
                <CheckItem key={check.id} check={check} onAction={handleAction} />
              ))}
            </div>
          </div>
        )}

        {/* Passed checks (collapsed) */}
        <details className="mb-8">
          <summary className="text-sm font-medium text-neutral-500 cursor-pointer hover:text-neutral-700">
            Show all checks ({checks.filter((c) => c.status === "passed").length} passed)
          </summary>
          <div className="mt-3 space-y-3">
            {checks
              .filter((c) => c.status === "passed")
              .map((check) => (
                <CheckItem key={check.id} check={check} onAction={handleAction} />
              ))}
          </div>
        </details>

        {/* Actions */}
        <div className="flex items-center justify-center gap-4">
          <button
            onClick={() => runAllChecks()}
            className="px-4 py-2 text-sm font-medium border border-neutral-300 rounded-md hover:bg-neutral-50 transition-colors"
          >
            Re-check
          </button>

          {!hasIssues && (
            <button
              onClick={dismissWizard}
              className="px-6 py-2 text-sm font-medium bg-black text-white rounded-md hover:bg-neutral-800 transition-colors"
            >
              Continue to Stud
            </button>
          )}

          {hasIssues && (
            <button
              onClick={dismissWizard}
              className="px-4 py-2 text-sm text-neutral-500 hover:text-neutral-700 transition-colors"
            >
              Skip for now
            </button>
          )}
        </div>

        {hasIssues && (
          <p className="text-center text-xs text-neutral-400 mt-4">
            Some features may not work without completing the required setup.
          </p>
        )}
      </div>
    </div>
  );
}
