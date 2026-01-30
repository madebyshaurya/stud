/**
 * DiffView - Shows before/after code changes with syntax highlighting
 *
 * Used to display script edits in a clear, visual format.
 */

import { useState } from "react";
import { cn } from "@/lib/utils";
import { ChevronDown, ChevronRight, FileCode, Plus, Minus } from "lucide-react";

interface DiffLine {
  type: "add" | "remove" | "context";
  content: string;
  lineNumber?: number;
  oldLineNumber?: number;
  newLineNumber?: number;
}

interface DiffViewProps {
  oldCode: string;
  newCode: string;
  fileName?: string;
  language?: string;
  className?: string;
  defaultExpanded?: boolean;
}

// Simple diff algorithm
function computeDiff(oldLines: string[], newLines: string[]): DiffLine[] {
  const result: DiffLine[] = [];

  // Use longest common subsequence for basic diff
  const lcs = computeLCS(oldLines, newLines);

  let oldIdx = 0;
  let newIdx = 0;
  let lcsIdx = 0;

  while (oldIdx < oldLines.length || newIdx < newLines.length) {
    if (lcsIdx < lcs.length && oldIdx < oldLines.length && oldLines[oldIdx] === lcs[lcsIdx]) {
      if (newIdx < newLines.length && newLines[newIdx] === lcs[lcsIdx]) {
        // Context line (unchanged)
        result.push({
          type: "context",
          content: oldLines[oldIdx],
          oldLineNumber: oldIdx + 1,
          newLineNumber: newIdx + 1,
        });
        oldIdx++;
        newIdx++;
        lcsIdx++;
      } else {
        // Line added in new
        result.push({
          type: "add",
          content: newLines[newIdx],
          newLineNumber: newIdx + 1,
        });
        newIdx++;
      }
    } else if (lcsIdx < lcs.length && newIdx < newLines.length && newLines[newIdx] === lcs[lcsIdx]) {
      // Line removed from old
      result.push({
        type: "remove",
        content: oldLines[oldIdx],
        oldLineNumber: oldIdx + 1,
      });
      oldIdx++;
    } else if (oldIdx < oldLines.length) {
      // Line removed
      result.push({
        type: "remove",
        content: oldLines[oldIdx],
        oldLineNumber: oldIdx + 1,
      });
      oldIdx++;
    } else if (newIdx < newLines.length) {
      // Line added
      result.push({
        type: "add",
        content: newLines[newIdx],
        newLineNumber: newIdx + 1,
      });
      newIdx++;
    }
  }

  return result;
}

function computeLCS(a: string[], b: string[]): string[] {
  const m = a.length;
  const n = b.length;
  const dp: number[][] = Array(m + 1).fill(null).map(() => Array(n + 1).fill(0));

  for (let i = 1; i <= m; i++) {
    for (let j = 1; j <= n; j++) {
      if (a[i - 1] === b[j - 1]) {
        dp[i][j] = dp[i - 1][j - 1] + 1;
      } else {
        dp[i][j] = Math.max(dp[i - 1][j], dp[i][j - 1]);
      }
    }
  }

  // Backtrack to find LCS
  const lcs: string[] = [];
  let i = m, j = n;
  while (i > 0 && j > 0) {
    if (a[i - 1] === b[j - 1]) {
      lcs.unshift(a[i - 1]);
      i--;
      j--;
    } else if (dp[i - 1][j] > dp[i][j - 1]) {
      i--;
    } else {
      j--;
    }
  }

  return lcs;
}

export function DiffView({
  oldCode,
  newCode,
  fileName,
  className,
  defaultExpanded = true,
}: DiffViewProps) {
  const [expanded, setExpanded] = useState(defaultExpanded);

  const oldLines = oldCode.split("\n");
  const newLines = newCode.split("\n");
  const diffLines = computeDiff(oldLines, newLines);

  const additions = diffLines.filter(l => l.type === "add").length;
  const deletions = diffLines.filter(l => l.type === "remove").length;

  return (
    <div className={cn("rounded-lg border overflow-hidden", className)}>
      {/* Header */}
      <button
        className="w-full flex items-center gap-2 px-3 py-2 bg-muted/50 hover:bg-muted transition-colors text-left"
        onClick={() => setExpanded(!expanded)}
      >
        {expanded ? (
          <ChevronDown className="w-4 h-4 text-muted-foreground" />
        ) : (
          <ChevronRight className="w-4 h-4 text-muted-foreground" />
        )}
        <FileCode className="w-4 h-4 text-blue-500" />
        <span className="text-sm font-medium flex-1 truncate">
          {fileName || "Script changes"}
        </span>
        <span className="flex items-center gap-2 text-xs">
          {additions > 0 && (
            <span className="text-green-600 flex items-center gap-0.5">
              <Plus className="w-3 h-3" />
              {additions}
            </span>
          )}
          {deletions > 0 && (
            <span className="text-red-600 flex items-center gap-0.5">
              <Minus className="w-3 h-3" />
              {deletions}
            </span>
          )}
        </span>
      </button>

      {/* Diff content */}
      {expanded && (
        <div className="overflow-x-auto">
          <table className="w-full text-xs font-mono">
            <tbody>
              {diffLines.map((line, idx) => (
                <tr
                  key={idx}
                  className={cn(
                    "border-b border-border/50 last:border-0",
                    line.type === "add" && "bg-green-50",
                    line.type === "remove" && "bg-red-50"
                  )}
                >
                  {/* Old line number */}
                  <td className="w-10 px-2 py-0.5 text-right text-muted-foreground select-none border-r border-border/30">
                    {line.oldLineNumber ?? ""}
                  </td>
                  {/* New line number */}
                  <td className="w-10 px-2 py-0.5 text-right text-muted-foreground select-none border-r border-border/30">
                    {line.newLineNumber ?? ""}
                  </td>
                  {/* Change indicator */}
                  <td className="w-6 px-1 py-0.5 text-center select-none">
                    {line.type === "add" && <span className="text-green-600">+</span>}
                    {line.type === "remove" && <span className="text-red-600">-</span>}
                    {line.type === "context" && <span className="text-muted-foreground/50"> </span>}
                  </td>
                  {/* Code */}
                  <td className="px-2 py-0.5 whitespace-pre">
                    {line.content || " "}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

// Compact diff summary for tool calls
interface DiffSummaryProps {
  additions: number;
  deletions: number;
  fileName?: string;
}

export function DiffSummary({ additions, deletions, fileName }: DiffSummaryProps) {
  return (
    <div className="flex items-center gap-2 text-sm">
      <FileCode className="w-4 h-4 text-blue-500" />
      {fileName && <span className="text-muted-foreground">{fileName}</span>}
      <div className="flex items-center gap-1.5">
        {additions > 0 && (
          <span className="text-green-600 flex items-center gap-0.5 text-xs">
            <Plus className="w-3 h-3" />
            {additions}
          </span>
        )}
        {deletions > 0 && (
          <span className="text-red-600 flex items-center gap-0.5 text-xs">
            <Minus className="w-3 h-3" />
            {deletions}
          </span>
        )}
      </div>
    </div>
  );
}
