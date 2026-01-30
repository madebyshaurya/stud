/**
 * InstanceTree - Displays the Roblox Studio game hierarchy
 *
 * Fetches the instance tree from Studio via the bridge and displays it
 * in an expandable tree view for browsing and selection.
 */

import { useState, useEffect, useCallback } from "react";
import { cn } from "@/lib/utils";
import { studioRequest, isStudioConnected } from "@/lib/roblox/client";
import { ChevronRight, ChevronDown, Folder, FileCode, Box, Boxes, Users, Settings, Package, Play } from "lucide-react";
import { Loader } from "@/components/ui/loader";

export interface InstanceNode {
  path: string;
  name: string;
  className: string;
  children?: InstanceNode[];
}

interface InstanceTreeProps {
  onSelect: (path: string) => void;
  searchQuery?: string;
  className?: string;
}

// Icon mapping for common Roblox classes
function getClassIcon(className: string) {
  const iconClass = "w-4 h-4 flex-shrink-0";

  switch (className) {
    case "Folder":
      return <Folder className={cn(iconClass, "text-yellow-500")} />;
    case "Script":
    case "LocalScript":
    case "ModuleScript":
      return <FileCode className={cn(iconClass, "text-blue-500")} />;
    case "Part":
    case "MeshPart":
    case "UnionOperation":
      return <Box className={cn(iconClass, "text-gray-500")} />;
    case "Model":
      return <Boxes className={cn(iconClass, "text-purple-500")} />;
    case "Players":
      return <Users className={cn(iconClass, "text-green-500")} />;
    case "ServerScriptService":
    case "ServerStorage":
    case "ReplicatedStorage":
      return <Package className={cn(iconClass, "text-orange-500")} />;
    case "Workspace":
      return <Play className={cn(iconClass, "text-blue-400")} />;
    default:
      return <Settings className={cn(iconClass, "text-gray-400")} />;
  }
}

// Single tree node
function TreeNode({
  node,
  level,
  onSelect,
  searchQuery,
  defaultExpanded,
}: {
  node: InstanceNode;
  level: number;
  onSelect: (path: string) => void;
  searchQuery?: string;
  defaultExpanded?: boolean;
}) {
  const [expanded, setExpanded] = useState(defaultExpanded ?? level < 1);
  const [children, setChildren] = useState<InstanceNode[] | null>(node.children ?? null);
  const [loading, setLoading] = useState(false);

  const hasChildren = node.className !== "Script" &&
                      node.className !== "LocalScript" &&
                      node.className !== "ModuleScript";

  // Fetch children when expanding
  const handleExpand = useCallback(async () => {
    if (!hasChildren) return;

    if (expanded) {
      setExpanded(false);
      return;
    }

    // If we already have children, just expand
    if (children && children.length > 0) {
      setExpanded(true);
      return;
    }

    // Fetch children from Studio
    setLoading(true);
    try {
      const result = await studioRequest<InstanceNode[]>("/instance/children", {
        path: node.path,
        recursive: false
      });

      if (result.success) {
        setChildren(result.data);
      }
    } catch (err) {
      console.error("Failed to fetch children:", err);
    } finally {
      setLoading(false);
      setExpanded(true);
    }
  }, [expanded, children, node.path, hasChildren]);

  // Filter by search query
  const matchesSearch = !searchQuery ||
    node.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    node.className.toLowerCase().includes(searchQuery.toLowerCase());

  // If searching and no match, check if any children might match
  const shouldRender = matchesSearch || (searchQuery && expanded);

  if (!shouldRender && !expanded) {
    return null;
  }

  return (
    <div className="select-none">
      <div
        className={cn(
          "flex items-center gap-1.5 py-1 px-2 rounded-md cursor-pointer transition-colors",
          "hover:bg-muted/80",
          matchesSearch && searchQuery && "bg-primary/10"
        )}
        style={{ paddingLeft: `${level * 12 + 8}px` }}
        onClick={(e) => {
          e.stopPropagation();
          onSelect(node.path);
        }}
      >
        {/* Expand/collapse button */}
        <button
          className={cn(
            "p-0.5 rounded hover:bg-muted-foreground/20 transition-colors",
            !hasChildren && "invisible"
          )}
          onClick={(e) => {
            e.stopPropagation();
            handleExpand();
          }}
        >
          {loading ? (
            <Loader variant="circular" size="sm" className="w-3 h-3" />
          ) : expanded ? (
            <ChevronDown className="w-3 h-3 text-muted-foreground" />
          ) : (
            <ChevronRight className="w-3 h-3 text-muted-foreground" />
          )}
        </button>

        {/* Icon */}
        {getClassIcon(node.className)}

        {/* Name */}
        <span className="text-sm truncate flex-1">{node.name}</span>

        {/* Class name hint */}
        <span className="text-xs text-muted-foreground/60 hidden group-hover:block">
          {node.className}
        </span>
      </div>

      {/* Children */}
      {expanded && children && children.length > 0 && (
        <div>
          {children.map((child) => (
            <TreeNode
              key={child.path}
              node={child}
              level={level + 1}
              onSelect={onSelect}
              searchQuery={searchQuery}
            />
          ))}
        </div>
      )}
    </div>
  );
}

export function InstanceTree({ onSelect, searchQuery, className }: InstanceTreeProps) {
  const [rootNodes, setRootNodes] = useState<InstanceNode[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Fetch root nodes on mount
  useEffect(() => {
    async function fetchTree() {
      setLoading(true);
      setError(null);

      try {
        const connected = await isStudioConnected();
        if (!connected) {
          setError("Not connected to Roblox Studio");
          setLoading(false);
          return;
        }

        // Get root services
        const result = await studioRequest<InstanceNode[]>("/instance/children", {
          path: "game",
          recursive: false,
        });

        if (result.success) {
          // Filter to commonly used services
          const commonServices = [
            "Workspace",
            "Players",
            "ReplicatedStorage",
            "ServerStorage",
            "ServerScriptService",
            "StarterGui",
            "StarterPack",
            "StarterPlayer",
            "Lighting",
            "SoundService",
          ];

          const filtered = result.data.filter((node) =>
            commonServices.includes(node.name)
          );

          // Sort by common order
          filtered.sort((a, b) => {
            const aIndex = commonServices.indexOf(a.name);
            const bIndex = commonServices.indexOf(b.name);
            return aIndex - bIndex;
          });

          setRootNodes(filtered);
        } else {
          setError(result.error);
        }
      } catch (err) {
        setError(err instanceof Error ? err.message : String(err));
      } finally {
        setLoading(false);
      }
    }

    fetchTree();
  }, []);

  if (loading) {
    return (
      <div className={cn("flex items-center justify-center py-8", className)}>
        <Loader variant="wave" size="sm" />
        <span className="text-sm text-muted-foreground ml-2">Loading hierarchy...</span>
      </div>
    );
  }

  if (error) {
    return (
      <div className={cn("flex flex-col items-center justify-center py-8 text-center", className)}>
        <p className="text-sm text-muted-foreground">{error}</p>
        <p className="text-xs text-muted-foreground mt-1">
          Make sure Roblox Studio is connected
        </p>
      </div>
    );
  }

  if (rootNodes.length === 0) {
    return (
      <div className={cn("flex items-center justify-center py-8", className)}>
        <p className="text-sm text-muted-foreground">No instances found</p>
      </div>
    );
  }

  return (
    <div className={cn("overflow-auto", className)}>
      {/* Game root */}
      <div className="py-1">
        <div className="flex items-center gap-1.5 py-1 px-2 font-medium text-sm text-muted-foreground">
          <Play className="w-4 h-4" />
          game
        </div>
        {rootNodes.map((node) => (
          <TreeNode
            key={node.path}
            node={node}
            level={1}
            onSelect={onSelect}
            searchQuery={searchQuery}
            defaultExpanded={node.name === "Workspace"}
          />
        ))}
      </div>
    </div>
  );
}
