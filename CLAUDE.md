# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

**Stud** is an AI Agent for Roblox Studio - essentially "Cursor AI for Roblox." It connects AI assistants (OpenAI, Anthropic) to Roblox Studio via an HTTP bridge, enabling AI to manipulate instances, scripts, and properties in real-time through natural language.

### Architecture

```
┌─────────────┐     HTTP      ┌─────────────┐     Polling     ┌─────────────┐
│   Stud UI   │◄────────────►│   Bridge    │◄───────────────►│   Studio    │
│   (React)   │   :3001      │   (Rust)    │                 │  (Plugin)   │
└─────────────┘              └─────────────┘                 └─────────────┘
      │
      │ Vercel AI SDK
      ▼
┌─────────────┐
│  OpenAI /   │
│  Anthropic  │
└─────────────┘
```

- **React Frontend** (`src/`): Chat UI with shadcn/ui components, Zustand state management
- **Rust Bridge** (`src-tauri/src/bridge.rs`): HTTP server on port 3001 that queues requests; uses oneshot channels for async request/response matching
- **Studio Plugin** (`studio-plugin/stud-bridge.server.lua`): Lua plugin polls bridge every 100ms, executes commands, creates undo waypoints

The polling pattern is necessary because Roblox Studio can only make HTTP requests, not receive them.

## Build Commands

```bash
npm run tauri dev      # Full desktop app with hot reload (frontend on port 1430)
npm run tauri build    # Production build for distribution
npm run dev            # Frontend dev server only (no Tauri)
npx tsc --noEmit       # Type checking
```

## Key Files

| Path | Purpose |
|------|---------|
| `src/lib/ai/providers.ts` | AI provider setup, `chat()` function with streaming and tool calling |
| `src/lib/roblox/tools.ts` | 15+ AI SDK tools for Roblox (Zod schemas, `studioRequest()` calls) |
| `src/lib/roblox/client.ts` | HTTP client for bridge server communication |
| `src-tauri/src/bridge.rs` | Bridge server endpoints: `/stud/request`, `/stud/poll`, `/stud/respond` |
| `studio-plugin/stud-bridge.server.lua` | Lua plugin that handles all Roblox operations |
| `src/stores/` | Zustand stores: `chat.ts`, `settings.ts`, `auth.ts`, `roblox.ts`, `plugin.ts` |

## Roblox Tools Available to AI

Studio tools: `roblox_get_script`, `roblox_set_script`, `roblox_edit_script`, `roblox_get_children`, `roblox_get_properties`, `roblox_set_property`, `roblox_create`, `roblox_delete`, `roblox_clone`, `roblox_move`, `roblox_search`, `roblox_get_selection`, `roblox_run_code`

Bulk operations: `roblox_bulk_create`, `roblox_bulk_delete`, `roblox_bulk_set_property`

## Project Context

This project's UI is built with React + shadcn/ui + Tailwind for a clean, modern interface. When adding functionality, reference the opencode fork at `/Users/shauryagupta/Downloads/stud` which has a more complete feature set (28 tools, cloud APIs, toolbox integration, MCP support, LSP, multi-provider support for 20+ AI providers). That fork uses SolidJS + monorepo structure; adapt patterns to this React codebase when porting features.

## Style Guide

- Prefer `const` over `let`; use ternaries instead of if/else assignments
- Early returns over else statements
- Single-word variable names when possible
- Avoid unnecessary destructuring - use `obj.a` instead of `const { a } = obj` to preserve context
- Avoid `try`/`catch` where possible
- Avoid `any` type
- Rely on type inference; avoid explicit types unless needed for exports/clarity
- Use parallel tool calls when applicable

## Tech Stack

- **Frontend**: React 19, Vite 7, Tailwind CSS 4, shadcn/ui (New York style), Zustand
- **AI**: Vercel AI SDK v6 (`ai` package), `@ai-sdk/openai`, `@ai-sdk/anthropic`
- **Desktop**: Tauri 2 (Rust), Warp HTTP server
- **Validation**: Zod for AI tool schemas

## Prompt-Kit Components

We use [prompt-kit](https://prompt-kit.com) for AI interface components. Install via:
```bash
npx shadcn@latest add "https://prompt-kit.com/c/[COMPONENT].json"
```

### Available Components (in `src/components/ui/`)

| Component | Purpose | Key Props |
|-----------|---------|-----------|
| `PromptInput` | Chat input with auto-resize | `isLoading`, `value`, `onSubmit`, `maxHeight` |
| `ChatContainer` | Auto-scrolling chat wrapper | Uses `use-stick-to-bottom` |
| `Message` | Chat message with avatar | `MessageAvatar`, `MessageContent`, `MessageActions` |
| `ToolCall` | AI tool execution display | `toolPart` (pending/running/complete/error states) |
| `Loader` | 12 loading variants | `variant`, `size`, `text` |
| `Reasoning` | Collapsible AI thinking | `open`, `isStreaming`, `ReasoningContent` |
| `ResponseStream` | Streaming text animation | `textStream`, `mode` (typewriter/fade), `speed` |
| `Markdown` | GFM markdown renderer | `children`, `components`, `id` |
| `CodeBlock` | Syntax highlighting (Shiki) | `code`, `language`, `theme` |
| `PromptSuggestion` | Clickable prompt chips | `highlight`, `onClick`, `variant` |
| `ScrollButton` | Jump to bottom button | `scrollRef`, `threshold` |
| `FileUpload` | Drag-and-drop files | `onFilesAdded`, `multiple`, `accept` |
| `Source` | Website source display | `href`, `SourceTrigger`, `SourceContent` |

### Loader Variants
`circular`, `classic`, `pulse`, `pulse-dot`, `dots`, `typing`, `wave`, `bars`, `terminal`, `text-blink`, `text-shimmer`, `loading-dots`

### Adding New Components
```bash
# Example: Add file upload
npx shadcn@latest add "https://prompt-kit.com/c/file-upload.json"
```

### Primitives (Full Features)
- `chatbot`: Complete chat implementation
- `tool-calling`: Chatbot with tool execution

Docs: https://prompt-kit.com/docs
