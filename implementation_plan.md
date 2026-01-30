# Stud Agentic Flow - Technical Implementation Plan

## Executive Summary

Transform Stud from a chat interface into a **full agentic AI workflow** for Roblox Studio. The goal: an app that **does things** rather than just chats.

**Repository**: https://github.com/madebyshaurya/stud
**License**: AGPL-3.0 (open source, copyleft)

---

## Current State (Already Implemented)

### Tools (15 total)
- **Scripts**: `get_script`, `set_script`, `edit_script`
- **Instances**: `get_children`, `get_properties`, `set_property`, `create`, `delete`, `clone`, `move`, `search`, `get_selection`, `run_code`
- **Bulk**: `bulk_create`, `bulk_delete`, `bulk_set_property`

### UI Components (prompt-kit)
- `PromptInput`, `ChatContainer`, `Message`, `ToolCall`, `Loader`, `Markdown`, `CodeBlock`, `PromptSuggestion`
- `ContextChips` (UI only, not wired)

### Backend
- Tauri 2 desktop app with Rust bridge server
- Multi-provider support (OpenAI, Anthropic, ChatGPT Plus/Pro Codex)
- OAuth PKCE flow for ChatGPT subscriptions
- Studio plugin with 18 request handlers

---

## Implementation Phases

### Phase 1: Foundation & Theme (Day 1)

#### 1.1 Update License to AGPL-3.0
- **File**: `LICENSE`
- Replace MIT with AGPL-3.0 text
- Update README.md badge

#### 1.2 B&W Theme (DONE)
- **File**: `src/index.css`
- Remove purple accent colors
- Pure black/white palette

#### 1.3 Loading Animations (DONE)
- **Files**: `src/pages/Home.tsx`
- Change `loading-dots` → `wave` or `terminal`

#### 1.4 Wire Context Chips
- **File**: `src/components/chat/ContextChips.tsx`
- **File**: `src/pages/Home.tsx`
- Connect chips to actual functionality:
  - `search-models` → Opens toolbox search (Phase 3)
  - `docs` → Adds "search Roblox docs" to prompt
  - `web` → Adds "search the web" to prompt
  - `run-code` → Pre-fills with code execution template
  - `plan` → Triggers plan mode (Phase 5)

---

### Phase 2: Ask User Tool (Day 1-2)

The AI needs to ask questions during agentic workflows.

#### 2.1 Create Question Tool
**File**: `src/lib/roblox/tools.ts`
```typescript
roblox_ask_user: tool({
  description: "Ask the user questions when you need clarification",
  parameters: z.object({
    questions: z.array(z.object({
      question: z.string(),
      options: z.array(z.string()).optional(),
      type: z.enum(["single", "multi", "text"]).default("text")
    })).min(1).max(4).describe("1-4 questions to ask at once")
  }),
  execute: async (params) => {
    // Emit event to UI, wait for responses
    return { waiting: true, questionId: uuid() };
  }
})
```

#### 2.2 Create QuestionPrompt Component
**File**: `src/components/chat/QuestionPrompt.tsx`
```typescript
interface QuestionPromptProps {
  question: string;
  options?: string[];
  type: "single" | "multi" | "text";
  onAnswer: (answer: string | string[]) => void;
}
```
- Renders inline in chat when AI uses `ask_user` tool
- Blocks AI until user responds
- Integrates with streaming flow

#### 2.3 Update Chat Store
**File**: `src/stores/chat.ts`
- Add `pendingQuestion` state
- Add `answerQuestion(id, answer)` action
- Emit answer back to AI stream

---

### Phase 3: Toolbox Integration (Day 2-3)

Allow AI to search and insert free models from Roblox Creator Store.

#### 3.1 Toolbox API Client
**File**: `src/lib/roblox/toolbox.ts`
```typescript
interface ToolboxAsset {
  id: number;
  name: string;
  description: string;
  thumbnailUrl: string;
  creator: { id: number; name: string };
  favoriteCount: number;
  productId?: number;
}

export async function searchToolbox(query: string, category?: string): Promise<ToolboxAsset[]>
export async function getAssetDetails(assetId: number): Promise<ToolboxAsset>
```

API Endpoints (public, no auth required):
- Search: `https://apis.roblox.com/toolbox-service/v1/items/details`
- Thumbnails: `https://thumbnails.roblox.com/v1/assets`

#### 3.2 Toolbox Tools
**File**: `src/lib/roblox/tools.ts`
```typescript
roblox_toolbox_search: tool({
  description: "Search the Roblox Creator Store for free models",
  parameters: z.object({
    query: z.string(),
    category: z.enum(["Model", "Decal", "Audio", "Plugin"]).optional(),
    limit: z.number().default(10)
  })
})

roblox_insert_asset: tool({
  description: "Insert a free model from the Creator Store into the game",
  parameters: z.object({
    assetId: z.number(),
    parent: z.string().default("game.Workspace")
  })
})
```

#### 3.3 Update Studio Plugin
**File**: `studio-plugin/stud-bridge.server.lua`
Add handler:
```lua
["/asset/insert"] = function(data)
  local success, model = pcall(function()
    return game:GetObjects("rbxassetid://" .. data.assetId)[1]
  end)
  if success and model then
    model.Parent = resolvePath(data.parent)
    return { success = true, name = model.Name }
  end
  return { success = false, error = "Failed to load asset" }
end
```

#### 3.4 AssetGrid Component
**File**: `src/components/chat/AssetGrid.tsx`
- Thumbnail grid view for search results
- Click to preview, double-click to insert
- Loading states with skeleton

---

### Phase 4: @ Instance Picker (Day 3-4)

Type `@` in input to browse and select game instances.

#### 4.1 Create Instance Tree Component
**File**: `src/components/chat/InstanceTree.tsx`
```typescript
interface InstanceNode {
  path: string;
  name: string;
  className: string;
  children: InstanceNode[];
  icon?: string;
}

// Fetches tree from Studio via bridge
export function InstanceTree({ onSelect }: { onSelect: (path: string) => void })
```

#### 4.2 Create InstancePicker Component
**File**: `src/components/chat/InstancePicker.tsx`
- Triggered when user types `@` in PromptInput OR clicks browse button
- Shows popover with InstanceTree
- Search/filter within picker
- Selection inserts `@game.Workspace.PartName` into input

#### 4.3 Update PromptInput
**File**: `src/components/ui/prompt-input.tsx`
- Detect `@` keypress → show picker
- Add browse button (folder icon) → show picker
- Replace `@...` with selected path on confirm

#### 4.4 Parse @ Mentions in Messages
**File**: `src/lib/ai/providers.ts`
- Before sending to AI, resolve `@path` mentions
- Fetch instance properties automatically
- Include context in message

---

### Phase 5: Plan Mode (Day 4-5)

For complex tasks, AI plans before executing.

#### 5.1 Plan Store
**File**: `src/stores/plan.ts`
```typescript
interface PlanStore {
  isActive: boolean;
  plan: PlanStep[];
  currentStep: number;
  enter: () => void;
  exit: () => void;
  approve: () => void;
  addStep: (step: PlanStep) => void;
}

interface PlanStep {
  id: string;
  description: string;
  tools: string[];
  status: "pending" | "approved" | "executing" | "done" | "error";
}
```

#### 5.2 Plan Mode Tools
**File**: `src/lib/roblox/tools.ts`
```typescript
plan_enter: tool({
  description: "Enter planning mode - explore and design before making changes",
  execute: async () => {
    // Emit to UI, restrict to read-only tools
  }
})

plan_exit: tool({
  description: "Exit planning mode and request user approval",
  parameters: z.object({
    plan: z.array(z.object({
      step: z.string(),
      tools: z.array(z.string())
    }))
  })
})
```

#### 5.3 PlanView Component
**File**: `src/components/chat/PlanView.tsx`
- Shows plan steps in a structured list
- Checkboxes for user to approve/reject steps
- "Execute Plan" button
- Progress indicator during execution

#### 5.4 Plan Mode Indicator
**File**: `src/components/chat/PlanModeIndicator.tsx`
- Persistent banner when in plan mode
- Shows "Read-only mode" reminder
- Exit button

---

### Phase 6: Diff View for Scripts (Day 5-6)

Show before/after when editing scripts.

#### 6.1 Create DiffView Component
**File**: `src/components/chat/DiffView.tsx`
- Use `diff` library for line-by-line comparison
- Syntax highlighting with Shiki
- Side-by-side or unified view toggle

#### 6.2 Integrate with edit_script Tool
**File**: `src/pages/Home.tsx`
- When tool result contains script changes, render DiffView
- Accept/Reject buttons
- Apply changes on accept

#### 6.3 Undo Integration
- Store previous script content
- "Undo" button restores original
- Syncs with Studio's ChangeHistoryService

---

### Phase 7: Web & Docs Search (Day 6-7)

AI can search the web and Roblox documentation.

#### 7.1 Web Fetch Tool
**File**: `src/lib/roblox/tools.ts`
```typescript
web_fetch: tool({
  description: "Fetch and read content from a URL",
  parameters: z.object({
    url: z.string().describe("URL to fetch"),
    prompt: z.string().describe("What to extract from the page")
  }),
  execute: async ({ url, prompt }) => {
    // Use Tauri HTTP plugin to fetch, then summarize
  }
})
```

#### 7.2 Roblox Docs Tool
**File**: `src/lib/roblox/tools.ts`
```typescript
roblox_docs_search: tool({
  description: "Search Roblox Creator documentation",
  parameters: z.object({
    query: z.string()
  }),
  execute: async ({ query }) => {
    // Scrape create.roblox.com/docs or use RAG
  }
})

roblox_api_lookup: tool({
  description: "Look up a specific Roblox API class, method, or event",
  parameters: z.object({
    name: z.string().describe("Class name like 'BasePart' or method like 'TweenService:Create'")
  })
})
```

#### 7.3 Source Display Component
**File**: `src/components/chat/SourceCard.tsx`
- Shows fetched sources inline
- Link to original docs
- Collapsible content preview

---

### Phase 8: Cloud API Integration (Day 7-8)

DataStore access, publishing, and more.

#### 8.1 Open Cloud Client
**File**: `src/lib/roblox/cloud.ts`
```typescript
interface OpenCloudConfig {
  apiKey: string;
  universeId: string;
}

export class OpenCloudClient {
  constructor(config: OpenCloudConfig);

  // DataStores
  async listDataStores(): Promise<DataStore[]>;
  async getEntry(dataStore: string, key: string): Promise<any>;
  async setEntry(dataStore: string, key: string, value: any): Promise<void>;

  // Publishing
  async publishPlace(placeId: string): Promise<void>;

  // Universe Info
  async getUniverseInfo(): Promise<UniverseInfo>;
}
```

#### 8.2 Cloud API Tools
**File**: `src/lib/roblox/tools.ts`
```typescript
roblox_datastore_get: tool({ ... })
roblox_datastore_set: tool({ ... })
roblox_datastore_list: tool({ ... })
roblox_publish_place: tool({ ... })
```

#### 8.3 API Key Settings
**File**: `src/components/Settings.tsx`
- Add Open Cloud API key input
- Add Universe ID input
- Validation and connection test

---

### Phase 9: Sub-Agents (Day 8-9)

Launch parallel workers for complex tasks.

#### 9.1 Agent System
**File**: `src/lib/agents/index.ts`
```typescript
interface Agent {
  id: string;
  type: "explore" | "plan" | "execute";
  status: "running" | "done" | "error";
  messages: Message[];
  result?: any;
}

export function spawnAgent(type: string, prompt: string): Agent;
export function waitForAgent(agentId: string): Promise<any>;
```

#### 9.2 Agent Tool
**File**: `src/lib/roblox/tools.ts`
```typescript
spawn_agent: tool({
  description: "Launch a sub-agent to work on a specific task",
  parameters: z.object({
    type: z.enum(["explore", "plan", "execute"]),
    prompt: z.string(),
    background: z.boolean().default(false)
  })
})
```

#### 9.3 AgentStatus Component
**File**: `src/components/chat/AgentStatus.tsx`
- Shows active agents with progress
- Expandable to show agent's messages
- Cancel button

---

## File Summary

### New Files to Create
```
src/lib/roblox/toolbox.ts          # Toolbox API client
src/lib/roblox/cloud.ts            # Open Cloud API client
src/lib/agents/index.ts            # Sub-agent system

src/stores/plan.ts                 # Plan mode state

src/components/chat/QuestionPrompt.tsx    # AI question UI
src/components/chat/AssetGrid.tsx         # Toolbox results grid
src/components/chat/InstanceTree.tsx      # Game hierarchy tree
src/components/chat/InstancePicker.tsx    # @ mention picker + browse button
src/components/chat/PlanView.tsx          # Plan mode display
src/components/chat/PlanModeIndicator.tsx # Plan mode banner
src/components/chat/DiffView.tsx          # Script diff
src/components/chat/SourceCard.tsx        # Web/docs source display
src/components/chat/AgentStatus.tsx       # Sub-agent progress
```

### Files to Modify
```
LICENSE                           # MIT → AGPL-3.0
src/lib/roblox/tools.ts           # Add 12+ new tools
src/stores/chat.ts                # Add question handling
src/pages/Home.tsx                # Integrate new components
src/components/ui/prompt-input.tsx # Add @ detection
studio-plugin/stud-bridge.server.lua # Add asset insert handler
```

---

## New Tools Summary

| Tool | Category | Description |
|------|----------|-------------|
| `roblox_ask_user` | Core | Ask user questions during execution |
| `roblox_toolbox_search` | Toolbox | Search Creator Store |
| `roblox_insert_asset` | Toolbox | Insert free model |
| `plan_enter` | Planning | Enter read-only plan mode |
| `plan_exit` | Planning | Exit with plan for approval |
| `web_fetch` | Research | Fetch and read URL content |
| `roblox_docs_search` | Research | Search Roblox docs |
| `roblox_api_lookup` | Research | Look up specific API |
| `roblox_datastore_get` | Cloud | Read DataStore entry |
| `roblox_datastore_set` | Cloud | Write DataStore entry |
| `roblox_datastore_list` | Cloud | List DataStores |
| `roblox_publish_place` | Cloud | Publish to production |
| `spawn_agent` | Agents | Launch sub-agent |

**Total**: 15 existing + 13 new = **28 tools**

---

## Verification Checklist

After each phase, verify:

1. **TypeScript**: `npx tsc --noEmit` passes
2. **Runtime**: `npm run tauri dev` launches without errors
3. **Tools**: AI can use new tools correctly
4. **UI**: Components render properly
5. **Studio**: Plugin handles new requests

End-to-end tests:
- [ ] Send message, get streaming response
- [ ] AI uses ask_user tool, user responds
- [ ] AI searches toolbox, inserts model
- [ ] User types @, picks instance
- [ ] AI enters plan mode, user approves
- [ ] Script edit shows diff view
- [ ] AI searches docs, cites sources
- [ ] AI reads/writes DataStore
- [ ] Sub-agent runs in background

---

## Priority Order

1. **Phase 2**: Ask User Tool (enables all agentic flows)
2. **Phase 1**: Foundation (theme already done, wire chips)
3. **Phase 4**: @ Instance Picker (core UX improvement)
4. **Phase 3**: Toolbox Integration (major feature)
5. **Phase 6**: Diff View (essential for script editing)
6. **Phase 5**: Plan Mode (complex tasks)
7. **Phase 7**: Web & Docs Search (research capability)
8. **Phase 8**: Cloud API (production features)
9. **Phase 9**: Sub-Agents (advanced agentic)

---

## Dependencies to Add

```bash
npm install diff             # For DiffView
npm install uuid             # For question IDs (if not already)
```

No other major dependencies needed - using existing:
- Vercel AI SDK for tools
- Zod for schemas
- shadcn/ui + prompt-kit for UI
- Tauri HTTP plugin for API calls

---

## Ready to Implement

Starting with **Phase 2: Ask User Tool** as it's the foundation for all agentic workflows, then proceeding through the phases in priority order.
