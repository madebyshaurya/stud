/**
 * Roblox Studio Tools for Vercel AI SDK
 *
 * These tools allow the AI to interact with Roblox Studio via the bridge server.
 */

import { tool } from "ai"
import { z } from "zod"
import { studioRequest, isStudioConnected, notConnectedError } from "./client"

// ============================================================================
// Types
// ============================================================================

interface ScriptContent {
  path: string
  source: string
  className: string
}

interface InstanceInfo {
  path: string
  name: string
  className: string
  children?: InstanceInfo[]
}

interface PropertyInfo {
  name: string
  value: string
  type: string
}

// ============================================================================
// Script Tools
// ============================================================================

export const robloxGetScript = tool({
  description: `Read the source code of a script in Roblox Studio.

Use this to read scripts like ServerScriptService.MainScript or Workspace.Part.LocalScript.
The path should be the full instance path from game root.

Examples:
- game.ServerScriptService.MainScript
- game.ReplicatedStorage.Modules.Utils
- game.Workspace.SpawnLocation.TouchScript`,
  inputSchema: z.object({
    path: z.string().describe("Full instance path to the script (e.g. game.ServerScriptService.MainScript)"),
  }),
  execute: async ({ path }: { path: string }) => {
    if (!(await isStudioConnected())) {
      return { error: notConnectedError() }
    }

    const result = await studioRequest<ScriptContent>("/script/get", { path })
    if (!result.success) {
      return { error: result.error }
    }

    const lines = result.data.source.split("\n")
    const numbered = lines.map((line, i) => `${(i + 1).toString().padStart(5, "0")}| ${line}`).join("\n")

    return {
      path: result.data.path,
      className: result.data.className,
      source: numbered,
    }
  },
})

export const robloxSetScript = tool({
  description: `Replace the entire source code of a script in Roblox Studio.

Use this to completely replace a script's contents.
For partial edits, consider using roblox_edit_script instead.

The path should be the full instance path from game root.`,
  inputSchema: z.object({
    path: z.string().describe("Full instance path to the script"),
    source: z.string().describe("The new source code for the script"),
  }),
  execute: async ({ path, source }: { path: string; source: string }) => {
    if (!(await isStudioConnected())) {
      return { error: notConnectedError() }
    }

    const result = await studioRequest<{ path: string }>("/script/set", { path, source })
    if (!result.success) {
      return { error: result.error }
    }

    const lines = source.split("\n").length
    return { success: true, path: result.data.path, lines }
  },
})

export const robloxEditScript = tool({
  description: `Edit a portion of a script by replacing specific code.

This performs a find-and-replace operation on the script source.
The oldCode must match exactly (including whitespace).
Use roblox_get_script first to see the current source.

Example:
  oldCode: "local speed = 10"
  newCode: "local speed = 20"`,
  inputSchema: z.object({
    path: z.string().describe("Full instance path to the script"),
    oldCode: z.string().describe("The exact code to find and replace"),
    newCode: z.string().describe("The new code to replace it with"),
  }),
  execute: async ({ path, oldCode, newCode }: { path: string; oldCode: string; newCode: string }) => {
    if (!(await isStudioConnected())) {
      return { error: notConnectedError() }
    }

    const result = await studioRequest<{ path: string; replaced: number }>("/script/edit", {
      path,
      oldCode,
      newCode,
    })

    if (!result.success) {
      return { error: result.error }
    }

    return { success: true, path: result.data.path, replacements: result.data.replaced }
  },
})

// ============================================================================
// Instance Tools
// ============================================================================

export const robloxGetChildren = tool({
  description: `List the children of an instance in Roblox Studio.

Use this to explore the game hierarchy.
Set recursive=true to get all descendants (can be slow for large trees).

Examples:
- game.Workspace
- game.ServerScriptService
- game.Players.Player1.Backpack`,
  inputSchema: z.object({
    path: z.string().describe("Full instance path (e.g. game.Workspace)"),
    recursive: z.boolean().optional().describe("If true, get all descendants recursively"),
  }),
  execute: async ({ path, recursive = false }: { path: string; recursive?: boolean }) => {
    if (!(await isStudioConnected())) {
      return { error: notConnectedError() }
    }

    const result = await studioRequest<InstanceInfo[]>("/instance/children", { path, recursive })
    if (!result.success) {
      return { error: result.error }
    }

    const format = (items: InstanceInfo[], indent = 0): string => {
      return items
        .map((item) => {
          const prefix = "  ".repeat(indent)
          const line = `${prefix}- ${item.name} (${item.className})`
          if (item.children && item.children.length > 0) {
            return `${line}\n${format(item.children, indent + 1)}`
          }
          return line
        })
        .join("\n")
    }

    return { path, children: format(result.data) }
  },
})

export const robloxGetProperties = tool({
  description: `Get all properties of an instance in Roblox Studio.

Returns a list of property names, values, and types.
Useful for understanding what can be modified on an instance.`,
  inputSchema: z.object({
    path: z.string().describe("Full instance path"),
  }),
  execute: async ({ path }: { path: string }) => {
    if (!(await isStudioConnected())) {
      return { error: notConnectedError() }
    }

    const result = await studioRequest<PropertyInfo[]>("/instance/properties", { path })
    if (!result.success) {
      return { error: result.error }
    }

    return { path, properties: result.data }
  },
})

export const robloxSetProperty = tool({
  description: `Set a property value on an instance in Roblox Studio.

The value is parsed based on the property type:
- Numbers: "10", "3.14"
- Booleans: "true", "false"
- Strings: "Hello World"
- Vector3: "1, 2, 3"
- Color3: "255, 128, 0" (RGB 0-255) or "#FF8800"
- BrickColor: "Bright red"
- Enum: "Enum.Material.Plastic"`,
  inputSchema: z.object({
    path: z.string().describe("Full instance path"),
    property: z.string().describe("Property name to set"),
    value: z.string().describe("New value for the property"),
  }),
  execute: async ({ path, property, value }: { path: string; property: string; value: string }) => {
    if (!(await isStudioConnected())) {
      return { error: notConnectedError() }
    }

    const result = await studioRequest<{ path: string }>("/instance/set", { path, property, value })
    if (!result.success) {
      return { error: result.error }
    }

    return { success: true, path: result.data.path, property, value }
  },
})

export const robloxCreate = tool({
  description: `Create a new instance in Roblox Studio.

Common class names:
- Scripts: Script, LocalScript, ModuleScript
- Parts: Part, MeshPart, UnionOperation
- UI: ScreenGui, Frame, TextLabel, TextButton
- Values: StringValue, IntValue, BoolValue, ObjectValue
- Other: Folder, Model, RemoteEvent, RemoteFunction`,
  inputSchema: z.object({
    className: z.string().describe("The class name of the instance to create"),
    parent: z.string().describe("Full path to the parent instance"),
    name: z.string().optional().describe("Name for the new instance"),
  }),
  execute: async ({ className, parent, name }: { className: string; parent: string; name?: string }) => {
    if (!(await isStudioConnected())) {
      return { error: notConnectedError() }
    }

    const result = await studioRequest<{ path: string }>("/instance/create", { className, parent, name })
    if (!result.success) {
      return { error: result.error }
    }

    return { success: true, path: result.data.path }
  },
})

export const robloxDelete = tool({
  description: `Delete an instance from Roblox Studio.

This permanently removes the instance and all its descendants.
Use with caution - this cannot be undone through the tool.`,
  inputSchema: z.object({
    path: z.string().describe("Full instance path to delete"),
  }),
  execute: async ({ path }: { path: string }) => {
    if (!(await isStudioConnected())) {
      return { error: notConnectedError() }
    }

    const result = await studioRequest<{ deleted: string }>("/instance/delete", { path })
    if (!result.success) {
      return { error: result.error }
    }

    return { success: true, deleted: result.data.deleted }
  },
})

export const robloxClone = tool({
  description: `Clone an instance in Roblox Studio.

Creates a deep copy of the instance and all its descendants.
If parent is not specified, the clone is placed in the same parent as the original.`,
  inputSchema: z.object({
    path: z.string().describe("Full instance path to clone"),
    parent: z.string().optional().describe("Optional new parent path for the clone"),
  }),
  execute: async ({ path, parent }: { path: string; parent?: string }) => {
    if (!(await isStudioConnected())) {
      return { error: notConnectedError() }
    }

    const result = await studioRequest<{ path: string }>("/instance/clone", { path, parent })
    if (!result.success) {
      return { error: result.error }
    }

    return { success: true, path: result.data.path }
  },
})

export const robloxSearch = tool({
  description: `Search for instances in Roblox Studio by name or class.

At least one of name or className must be provided.
Name matching is case-insensitive and supports partial matches.`,
  inputSchema: z.object({
    root: z.string().optional().describe("Root path to search from (default: game)"),
    name: z.string().optional().describe("Name pattern to match"),
    className: z.string().optional().describe("Class name to filter by"),
    limit: z.number().optional().describe("Maximum results (default: 50)"),
  }),
  execute: async ({
    root = "game",
    name,
    className,
    limit = 50,
  }: {
    root?: string
    name?: string
    className?: string
    limit?: number
  }) => {
    if (!name && !className) {
      return { error: "At least one of name or className must be provided" }
    }

    if (!(await isStudioConnected())) {
      return { error: notConnectedError() }
    }

    const result = await studioRequest<InstanceInfo[]>("/instance/search", { root, name, className, limit })
    if (!result.success) {
      return { error: result.error }
    }

    if (result.data.length === 0) {
      return { message: "No instances found matching criteria", results: [] }
    }

    return {
      count: result.data.length,
      results: result.data.map((item) => ({ path: item.path, className: item.className })),
    }
  },
})

export const robloxGetSelection = tool({
  description: `Get the currently selected objects in Roblox Studio.

Returns the paths and class names of all selected instances.
Useful for operating on what the user has selected in the Explorer.`,
  inputSchema: z.object({}),
  execute: async () => {
    if (!(await isStudioConnected())) {
      return { error: notConnectedError() }
    }

    const result = await studioRequest<InstanceInfo[]>("/selection/get")
    if (!result.success) {
      return { error: result.error }
    }

    if (result.data.length === 0) {
      return { message: "No objects selected in Studio", selection: [] }
    }

    return {
      count: result.data.length,
      selection: result.data.map((item) => ({ path: item.path, className: item.className })),
    }
  },
})

export const robloxRunCode = tool({
  description: `Execute Luau code in Roblox Studio.

The code runs in the command bar context with full access to game services.
Use print() to output results - they will be captured and returned.

Examples:
- print(game.Workspace:GetChildren())
- game.Players.LocalPlayer.Character:MoveTo(Vector3.new(0, 10, 0))
- for _, part in game.Workspace:GetDescendants() do if part:IsA("BasePart") then part.Anchored = true end end`,
  inputSchema: z.object({
    code: z.string().describe("Luau code to execute"),
  }),
  execute: async ({ code }: { code: string }) => {
    if (!(await isStudioConnected())) {
      return { error: notConnectedError() }
    }

    const result = await studioRequest<{ output: string; error?: string }>("/code/run", { code })
    if (!result.success) {
      return { error: result.error }
    }

    if (result.data.error) {
      return { error: result.data.error }
    }

    return { output: result.data.output || "Code executed successfully (no output)" }
  },
})

export const robloxMove = tool({
  description: `Move an instance to a new parent (reparent).

Changes the Parent property of the instance to the new location.
The instance keeps all its properties and children.

Examples:
- Move a part to a folder: path="game.Workspace.Part1", newParent="game.Workspace.MyFolder"
- Move a script to ServerScriptService: path="game.Workspace.Script", newParent="game.ServerScriptService"`,
  inputSchema: z.object({
    path: z.string().describe("Full instance path to move"),
    newParent: z.string().describe("Full path to the new parent"),
  }),
  execute: async ({ path, newParent }: { path: string; newParent: string }) => {
    if (!(await isStudioConnected())) {
      return { error: notConnectedError() }
    }

    const result = await studioRequest<{ path: string }>("/instance/move", { path, newParent })
    if (!result.success) {
      return { error: result.error }
    }

    return { success: true, path: result.data.path }
  },
})

// ============================================================================
// Bulk Operations
// ============================================================================

export const robloxBulkCreate = tool({
  description: `Create multiple instances at once.

More efficient than calling roblox_create multiple times.
Each item specifies className, parent, and optional name.

Example: Create 5 parts in workspace
[
  { className: "Part", parent: "game.Workspace", name: "Part1" },
  { className: "Part", parent: "game.Workspace", name: "Part2" },
  ...
]`,
  inputSchema: z.object({
    instances: z
      .array(
        z.object({
          className: z.string().describe("Class name of the instance"),
          parent: z.string().describe("Parent path"),
          name: z.string().optional().describe("Optional name"),
        })
      )
      .describe("Array of instances to create"),
  }),
  execute: async ({
    instances,
  }: {
    instances: Array<{ className: string; parent: string; name?: string }>
  }) => {
    if (!(await isStudioConnected())) {
      return { error: notConnectedError() }
    }

    const result = await studioRequest<{ created: string[] }>("/instance/bulk-create", { instances })
    if (!result.success) {
      return { error: result.error }
    }

    return { success: true, count: result.data.created.length, paths: result.data.created }
  },
})

export const robloxBulkDelete = tool({
  description: `Delete multiple instances at once.

More efficient than calling roblox_delete multiple times.
All specified instances and their descendants will be destroyed.

WARNING: This cannot be undone through the tool.`,
  inputSchema: z.object({
    paths: z.array(z.string()).describe("Array of instance paths to delete"),
  }),
  execute: async ({ paths }: { paths: string[] }) => {
    if (!(await isStudioConnected())) {
      return { error: notConnectedError() }
    }

    const result = await studioRequest<{ deleted: string[] }>("/instance/bulk-delete", { paths })
    if (!result.success) {
      return { error: result.error }
    }

    return { success: true, count: result.data.deleted.length, deleted: result.data.deleted }
  },
})

export const robloxBulkSetProperty = tool({
  description: `Set properties on multiple instances at once.

More efficient than calling roblox_set_property multiple times.
Each operation specifies path, property name, and value.

Example: Make all parts red and anchored
[
  { path: "game.Workspace.Part1", property: "BrickColor", value: "Bright red" },
  { path: "game.Workspace.Part1", property: "Anchored", value: "true" },
  { path: "game.Workspace.Part2", property: "BrickColor", value: "Bright red" },
  ...
]`,
  inputSchema: z.object({
    operations: z
      .array(
        z.object({
          path: z.string().describe("Instance path"),
          property: z.string().describe("Property name"),
          value: z.string().describe("New value"),
        })
      )
      .describe("Array of property set operations"),
  }),
  execute: async ({
    operations,
  }: {
    operations: Array<{ path: string; property: string; value: string }>
  }) => {
    if (!(await isStudioConnected())) {
      return { error: notConnectedError() }
    }

    const result = await studioRequest<{ updated: number; errors?: string[] }>("/instance/bulk-set", { operations })
    if (!result.success) {
      return { error: result.error }
    }

    return {
      success: true,
      count: result.data.updated,
      errors: result.data.errors,
    }
  },
})

// ============================================================================
// Export all tools
// ============================================================================

export const robloxTools = {
  // Script tools
  roblox_get_script: robloxGetScript,
  roblox_set_script: robloxSetScript,
  roblox_edit_script: robloxEditScript,

  // Instance tools
  roblox_get_children: robloxGetChildren,
  roblox_get_properties: robloxGetProperties,
  roblox_set_property: robloxSetProperty,
  roblox_create: robloxCreate,
  roblox_delete: robloxDelete,
  roblox_clone: robloxClone,
  roblox_search: robloxSearch,
  roblox_get_selection: robloxGetSelection,
  roblox_run_code: robloxRunCode,
  roblox_move: robloxMove,

  // Bulk tools
  roblox_bulk_create: robloxBulkCreate,
  roblox_bulk_delete: robloxBulkDelete,
  roblox_bulk_set_property: robloxBulkSetProperty,
}
