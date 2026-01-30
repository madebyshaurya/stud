# Stud Implementation Plan

> Complete roadmap for building the ultimate AI Agent for Roblox Studio

## Status Overview

| Phase | Name | Status | Priority |
|-------|------|--------|----------|
| 1 | UI Foundation | In Progress | CRITICAL |
| 2 | Context Chips Integration | Pending | CRITICAL |
| 3 | Instance Picker (@ mentions) | Pending | HIGH |
| 4 | Question Tool (AI asks user) | Pending | CRITICAL |
| 5 | Toolbox Integration | Pending | HIGH |
| 6 | Improved System Prompt | Pending | CRITICAL |
| 7 | Diff View for Scripts | Pending | MEDIUM |
| 8 | Game Templates | Pending | MEDIUM |
| 9 | Cloud API Integration | Pending | MEDIUM |
| 10 | Plan Mode | Pending | HIGH |
| 11 | Live Preview | Pending | LOW |
| 12 | Testing & Polish | Pending | HIGH |

---

## Phase 1: UI Foundation

### 1.1 Black & White Theme
**Status:** COMPLETE

**File:** `src/index.css`
- Pure monochrome color palette
- Removed all purple/brand colors
- Clean, minimal aesthetic

### 1.2 Loading Animations
**Status:** COMPLETE

**File:** `src/pages/Home.tsx`
- Changed from `dots` to `wave`
- Changed from `loading-dots` to `terminal`
- More distinctive, less generic

### 1.3 Context Chips Component
**Status:** COMPLETE

**File:** `src/components/chat/ContextChips.tsx`
- Created chips: Models, Docs, Web, Run, Plan
- Toggle-able active state
- Ready for integration

---

## Phase 2: Context Chips Integration

### 2.1 Integrate into Home.tsx
**Status:** PENDING

**Tasks:**
- [ ] Import ContextChips component
- [ ] Add chips above input bar in empty state
- [ ] Add chips above input bar in chat view
- [ ] Wire up chip click handlers
- [ ] Store active chips in chat state

**Code changes needed:**

```tsx
// In Home.tsx
import { ContextChips, ChipAction } from "@/components/chat/ContextChips";

// Add state
const [activeChips, setActiveChips] = useState<ChipAction[]>([]);

// Handler
const handleChipClick = (chipId: ChipAction) => {
  setActiveChips(prev =>
    prev.includes(chipId)
      ? prev.filter(c => c !== chipId)
      : [...prev, chipId]
  );
};

// In JSX - add before PromptInput
<ContextChips
  onChipClick={handleChipClick}
  activeChips={activeChips}
  disabled={isStreaming}
/>
```

### 2.2 Chip Action Handlers
**Status:** PENDING

**Tasks:**
- [ ] "Models" chip triggers toolbox search mode
- [ ] "Docs" chip adds Roblox docs context
- [ ] "Web" chip enables web search tool
- [ ] "Run" chip enables immediate code execution
- [ ] "Plan" chip enables planning mode

---

## Phase 3: Instance Picker (@ mentions)

### 3.1 Create InstancePicker Component
**Status:** PENDING

**New File:** `src/components/chat/InstancePicker.tsx`

**Features:**
- Tree view of game hierarchy
- Lazy loading of children
- Search/filter functionality
- Class icons (Folder, Script, Part, etc.)
- Click to insert path at cursor

### 3.2 @ Trigger Detection
**Status:** PENDING

**File:** `src/pages/Home.tsx`

**Tasks:**
- [ ] Detect @ character in input
- [ ] Track cursor position
- [ ] Show picker popover at cursor
- [ ] Insert selected path
- [ ] Support keyboard navigation

### 3.3 Instance Path Formatting
**Status:** PENDING

**Format:** `@game.Workspace.Model.Part`

**Display:** Show as chip/tag in input

---

## Phase 4: Question Tool (AI asks user)

### 4.1 Create ask_user Tool
**Status:** PENDING

**New File:** `src/lib/roblox/tools/ask-user.ts`

```typescript
export const askUserTool = tool({
  description: `Ask the user a question when you need clarification.
Use this when:
- Choosing between approaches
- Details are ambiguous
- Need user confirmation
- Need specific values`,
  parameters: z.object({
    question: z.string().describe("The question to ask"),
    options: z.array(z.string()).optional().describe("Preset options"),
    type: z.enum(["single", "multi", "text"]).default("single"),
  }),
  execute: async ({ question, options, type }) => ({
    __type: "user_question",
    question,
    options: options || [],
    type,
    pending: true,
  }),
});
```

### 4.2 Create QuestionPrompt Component
**Status:** PENDING

**New File:** `src/components/chat/QuestionPrompt.tsx`

**Features:**
- Display question prominently
- Show clickable option buttons
- Allow custom text input
- Single or multi-select support
- Keyboard shortcuts

### 4.3 Handle Question in Chat Flow
**Status:** PENDING

**Tasks:**
- [ ] Detect `__type: "user_question"` in tool result
- [ ] Render QuestionPrompt instead of normal tool output
- [ ] Pause AI stream until answer received
- [ ] Send answer back to AI as tool result
- [ ] Resume conversation

---

## Phase 5: Toolbox Integration

### 5.1 Toolbox API Client
**Status:** PENDING

**New File:** `src/lib/roblox/toolbox.ts`

**Features:**
- Search assets by keyword
- Get asset details
- Get thumbnails
- Filter by category
- Filter free-only assets

**API Endpoints:**
- Search: `https://apis.roblox.com/toolbox-service/v1/marketplace/{category}`
- Details: `https://apis.roblox.com/toolbox-service/v1/items/details`
- Thumbnails: `https://thumbnails.roblox.com/v1/assets`

### 5.2 Asset Grid Component
**Status:** PENDING

**New File:** `src/components/chat/AssetGrid.tsx`

**Features:**
- Grid layout with thumbnails
- Selection with checkboxes
- Creator info and verification badge
- Script warning indicator
- Vote percentage
- Multi-select for batch insert

### 5.3 Toolbox AI Tools
**Status:** PENDING

**New File:** `src/lib/roblox/tools/toolbox.ts`

**Tools:**
- `roblox_toolbox_search` - Search for assets
- `roblox_insert_asset` - Insert asset into game

### 5.4 Special Tool Result Rendering
**Status:** PENDING

**Tasks:**
- [ ] Detect `__type: "toolbox_search"` in tool result
- [ ] Render AssetGrid instead of JSON
- [ ] Handle user selection
- [ ] Send selection back to AI

---

## Phase 6: Improved System Prompt

### 6.1 Tool-Aware System Prompt
**Status:** PENDING

**File:** `src/lib/ai/providers.ts`

**Key Changes:**
- Emphasize ACTION over description
- List all available tools with use cases
- Define behavior guidelines
- Short response style
- Proactive tool usage patterns

### 6.2 Context-Aware Prompting
**Status:** PENDING

**Tasks:**
- [ ] Include active chips in prompt
- [ ] Include selected instances in prompt
- [ ] Include game structure context
- [ ] Include recent tool results

---

## Phase 7: Diff View for Scripts

### 7.1 Install diff Package
**Status:** PENDING

```bash
npm install diff
npm install -D @types/diff
```

### 7.2 Create DiffView Component
**Status:** PENDING

**New File:** `src/components/chat/DiffView.tsx`

**Features:**
- Side-by-side or unified diff
- Syntax highlighting
- Line numbers
- Added/removed highlighting
- File name header

### 7.3 Modify Script Edit Tool
**Status:** PENDING

**File:** `src/lib/roblox/tools.ts`

**Changes:**
- Return `oldCode` and `newCode` in result
- Add `__type: "script_diff"` marker
- Render DiffView for script changes

---

## Phase 8: Game Templates

### 8.1 Template Definitions
**Status:** PENDING

**New File:** `src/lib/templates/index.ts`

**Templates:**
1. **Obby** - Obstacle course with checkpoints
2. **Tycoon** - Build and earn money
3. **Simulator** - Click to collect resources
4. **Fighting Game** - PvP combat system
5. **Story Game** - Dialogue and quests
6. **Showcase** - Beautiful environment

### 8.2 Template Cards Component
**Status:** PENDING

**New File:** `src/components/chat/TemplateCards.tsx`

**Features:**
- Grid of template cards
- Icon, name, description
- Step count indicator
- One-click to start

### 8.3 Template Execution
**Status:** PENDING

**Tasks:**
- [ ] Select template shows steps
- [ ] AI executes steps automatically
- [ ] Progress indicator
- [ ] Can pause/resume

---

## Phase 9: Cloud API Integration

### 9.1 DataStore Tools
**Status:** PENDING

**New File:** `src/lib/roblox/tools/cloud.ts`

**Tools:**
- `roblox_datastore_get` - Read player data
- `roblox_datastore_set` - Write player data
- `roblox_datastore_list` - List keys

### 9.2 Publish Tools
**Status:** PENDING

**Tools:**
- `roblox_publish_place` - Publish to Roblox

### 9.3 API Key Configuration
**Status:** PENDING

**File:** `src/stores/settings.ts`

**Tasks:**
- [ ] Add robloxApiKey to settings
- [ ] UI for entering API key
- [ ] Secure storage

---

## Phase 10: Plan Mode

### 10.1 Plan Store
**Status:** PENDING

**New File:** `src/stores/plan.ts`

```typescript
interface PlanState {
  isPlanning: boolean;
  currentPlan: Plan | null;
  steps: PlanStep[];
  currentStep: number;
}
```

### 10.2 Plan UI
**Status:** PENDING

**Features:**
- Plan sidebar/panel
- Step checklist
- Progress indicator
- Can skip/reorder steps
- Execution controls

### 10.3 Plan Tool
**Status:** PENDING

**Tool:** `create_plan`
- AI creates multi-step plan
- User can approve/modify
- Steps execute sequentially

---

## Phase 11: Live Preview

### 11.1 Preview Panel
**Status:** PENDING

**Features:**
- Side panel showing game view
- Screenshot capture from Studio
- Refresh on changes
- Zoom/pan controls

### 11.2 Studio Screenshot Tool
**Status:** PENDING

**Requires:** Plugin modification to capture viewport

---

## Phase 12: Testing & Polish

### 12.1 Vitest Setup
**Status:** PENDING

```bash
npm install -D vitest @testing-library/react jsdom
```

### 12.2 Unit Tests
**Status:** PENDING

**Test Files:**
- `src/lib/roblox/__tests__/toolbox.test.ts`
- `src/lib/roblox/__tests__/tools.test.ts`
- `src/stores/__tests__/chat.test.ts`
- `src/components/__tests__/ContextChips.test.tsx`

### 12.3 E2E Tests
**Status:** PENDING

**Test Scenarios:**
- Full chat flow
- Tool execution
- Toolbox search and insert
- Question/answer flow

### 12.4 UI Polish
**Status:** PENDING

**Tasks:**
- [ ] Animations and transitions
- [ ] Loading states everywhere
- [ ] Error handling
- [ ] Empty states
- [ ] Keyboard shortcuts
- [ ] Accessibility

---

## File Structure

```
src/
├── components/
│   ├── chat/
│   │   ├── ContextChips.tsx      [DONE]
│   │   ├── InstancePicker.tsx    [Phase 3]
│   │   ├── AssetGrid.tsx         [Phase 5]
│   │   ├── QuestionPrompt.tsx    [Phase 4]
│   │   ├── DiffView.tsx          [Phase 7]
│   │   ├── TemplateCards.tsx     [Phase 8]
│   │   ├── PlanPanel.tsx         [Phase 10]
│   │   └── ModelSelector.tsx     [Existing]
│   └── ui/
│       └── ... (prompt-kit components)
├── lib/
│   ├── ai/
│   │   ├── providers.ts          [Modify Phase 6]
│   │   └── codex-chat.ts         [Existing]
│   ├── roblox/
│   │   ├── tools/
│   │   │   ├── studio.ts         [Existing]
│   │   │   ├── toolbox.ts        [Phase 5]
│   │   │   ├── cloud.ts          [Phase 9]
│   │   │   └── ask-user.ts       [Phase 4]
│   │   ├── toolbox.ts            [Phase 5]
│   │   ├── client.ts             [Existing]
│   │   └── tools.ts              [Existing]
│   └── templates/
│       └── index.ts              [Phase 8]
├── stores/
│   ├── chat.ts                   [Modify]
│   ├── plan.ts                   [Phase 10]
│   └── settings.ts               [Modify Phase 9]
├── pages/
│   └── Home.tsx                  [Modify Phase 2]
└── index.css                     [DONE]
```

---

## Dependencies

```json
{
  "dependencies": {
    "diff": "^5.x"
  },
  "devDependencies": {
    "@types/diff": "^5.x",
    "vitest": "^3.x",
    "@testing-library/react": "^16.x",
    "jsdom": "^26.x"
  }
}
```

---

## API Keys Required

| Service | Required | Purpose |
|---------|----------|---------|
| OpenAI or Anthropic | Yes | AI chat |
| ChatGPT Plus OAuth | Optional | Alternative AI provider |
| Roblox Open Cloud | Optional | DataStore, Publish |

---

## Success Criteria

1. User can build a complete game without writing code manually
2. AI proactively uses tools instead of just describing
3. Toolbox search/insert feels native
4. Questions from AI are helpful, not annoying
5. UI feels like productivity tool, not chat app
6. All critical paths have error handling
7. Performance is smooth (no lag)
8. Works offline for local operations

---

## Next Steps

1. **Immediate:** Integrate ContextChips into Home.tsx
2. **Today:** Complete Phase 2 (chip handlers)
3. **Next:** Phase 4 (Question Tool - critical for agentic)
4. **Then:** Phase 5 (Toolbox - high value)
5. **Continue:** Phases 3, 6, 7, 8...

---

*Last Updated: 2026-01-29*
