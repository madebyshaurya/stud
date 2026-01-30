# Stud

**The AI Agent for Roblox Studio** - Build games with AI that actually *does* things.

[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![Made with Tauri](https://img.shields.io/badge/Made%20with-Tauri-blue)](https://tauri.app)
[![React](https://img.shields.io/badge/React-19-61DAFB)](https://react.dev)

Stud connects AI models (GPT-4, Claude, ChatGPT Plus/Pro) directly to Roblox Studio, enabling real-time manipulation of instances, scripts, and properties through natural language. Think **Cursor AI, but for Roblox development**.

## Why Stud?

Most AI coding tools are built for text files. Roblox Studio is different - it's a visual tree of instances, properties, and Luau scripts. Stud bridges this gap by giving AI direct access to your Studio session.

**Before Stud**: Copy code from ChatGPT → Paste into Studio → Debug → Repeat

**With Stud**: "Create a car that players can drive" → AI creates the model, scripts, and configures everything → Done

## Features

- **Direct Studio Control** - AI creates, modifies, and deletes instances in real-time
- **Script Editing** - Read, write, and edit Luau scripts with intelligent diff
- **15+ AI Tools** - Complete toolkit for any Roblox development task
- **Multi-Provider** - OpenAI API, Anthropic API, or ChatGPT Plus/Pro (no API key needed!)
- **Live Feedback** - See exactly what the AI is doing in your game
- **Undo Support** - Every AI change creates an undo waypoint
- **Modern UI** - Built with React 19 and [prompt-kit](https://prompt-kit.com)

## Demo

> *"Set up a basic obby with 5 platforms that get progressively harder"*

The AI will:
1. Create a folder structure for the obby
2. Generate 5 platforms with increasing gaps
3. Add spawn and finish checkpoints
4. Create a respawn script for falling players
5. Test the configuration

All while you watch it happen in real-time.

## How It Works

```
┌─────────────┐     HTTP      ┌─────────────┐     Polling     ┌─────────────┐
│   Stud UI   │◄────────────►│   Bridge    │◄───────────────►│   Studio    │
│   (React)   │   :3001      │   (Rust)    │   100ms         │  (Plugin)   │
└─────────────┘              └─────────────┘                 └─────────────┘
      │
      │ Vercel AI SDK
      ▼
┌─────────────┐
│  AI Models  │
│ GPT/Claude  │
└─────────────┘
```

1. You type a message in Stud
2. AI decides which tools to use
3. Bridge Server (Rust) queues the requests
4. Studio Plugin executes commands in your game
5. Results flow back to AI, which continues or responds

*The polling pattern is necessary because Roblox Studio can only make outgoing HTTP requests.*

## Installation

### Prerequisites

- [Node.js](https://nodejs.org/) v18+
- [Rust](https://rustup.rs/) (for Tauri)
- [Roblox Studio](https://create.roblox.com/)

### Quick Start

```bash
# Clone the repo
git clone https://github.com/madebyshaurya/stud.git
cd stud

# Install dependencies
npm install

# Run in development mode
npm run tauri dev
```

### Install the Studio Plugin

1. Open Roblox Studio
2. Go to **Plugins** → **Plugins Folder** (or press `Alt+P`)
3. Copy `studio-plugin/stud-bridge.server.lua` to this folder
4. Restart Roblox Studio
5. You'll see "Stud Bridge" in your plugin toolbar

## Configuration

### AI Providers

| Provider | Setup | Best For |
|----------|-------|----------|
| **ChatGPT Plus/Pro** | Click "Sign in with ChatGPT" | Free with subscription, no API costs |
| **OpenAI API** | Add API key in Settings | Pay-per-use, full control |
| **Anthropic API** | Add API key in Settings | Claude models |

**Recommended**: If you have ChatGPT Plus/Pro, use the OAuth sign-in. No API key needed, and it works with GPT-4, GPT-5, o3, and more.

### Roblox Cloud API (Optional)

For DataStore access and game publishing:
1. Go to [Creator Hub > API Keys](https://create.roblox.com/dashboard/credentials)
2. Create a key with required permissions
3. Add to Settings in Stud

## AI Tools

### Instance Manipulation
| Tool | What it does |
|------|-------------|
| `roblox_create` | Create new instances (Parts, Models, Scripts, etc.) |
| `roblox_delete` | Remove instances from the game |
| `roblox_clone` | Duplicate instances |
| `roblox_move` | Reparent instances to new locations |
| `roblox_set_property` | Change any property (Position, Color, Name, etc.) |
| `roblox_get_properties` | Read all properties of an instance |
| `roblox_get_children` | List children (with recursive option) |
| `roblox_search` | Find instances by name or class |
| `roblox_get_selection` | Get what you have selected in Studio |

### Script Editing
| Tool | What it does |
|------|-------------|
| `roblox_get_script` | Read script source code |
| `roblox_set_script` | Replace entire script content |
| `roblox_edit_script` | Find/replace within scripts |
| `roblox_run_code` | Execute Luau code immediately |

### Bulk Operations
| Tool | What it does |
|------|-------------|
| `roblox_bulk_create` | Create many instances at once |
| `roblox_bulk_delete` | Delete multiple instances |
| `roblox_bulk_set_property` | Update properties across many instances |

## Example Prompts

**Creating things:**
> "Create a red neon part at position 0, 10, 0 that slowly rotates"

**Editing scripts:**
> "Add a debounce to the touch handler in game.Workspace.Coin.Script"

**Bulk operations:**
> "Find all parts named 'Coin' and make them spin using TweenService"

**Game systems:**
> "Set up a basic shop system with a GUI and DataStore for saving purchases"

**Debugging:**
> "Why isn't my script in ServerScriptService working? Read it and help me fix it"

## Development

```bash
# Full app with hot reload
npm run tauri dev

# Frontend only (faster iteration)
npm run dev

# Type checking
npx tsc --noEmit

# Production build
npm run tauri build
```

### Project Structure

```
stud/
├── src/                      # React frontend
│   ├── components/           # UI components (shadcn/ui + prompt-kit)
│   ├── lib/
│   │   ├── ai/              # AI providers and chat logic
│   │   └── roblox/          # Roblox tools (Zod schemas)
│   └── stores/              # Zustand state management
├── src-tauri/               # Rust backend
│   └── src/
│       ├── bridge.rs        # HTTP bridge server (Warp)
│       └── lib.rs           # Tauri app setup
└── studio-plugin/           # Roblox Studio plugin
    └── stud-bridge.server.lua
```

## Tech Stack

| Layer | Technology |
|-------|------------|
| **Frontend** | React 19, Vite 7, Tailwind CSS 4, shadcn/ui |
| **UI Components** | [prompt-kit](https://prompt-kit.com) |
| **AI** | Vercel AI SDK v6, OpenAI, Anthropic |
| **Desktop** | Tauri 2 (Rust) |
| **HTTP Server** | Warp |
| **State** | Zustand |
| **Validation** | Zod |

## Roadmap

- [ ] **Toolbox Search** - Visual asset picker from Creator Store
- [ ] **Auto-Planning** - AI plans before executing complex tasks
- [ ] **@ Mentions** - Reference instances with `@game.Workspace.Part`
- [ ] **Diff View** - See script changes before/after
- [ ] **One-Click Games** - Templates for Obby, Tycoon, FPS, etc.
- [ ] **Roblox Docs RAG** - AI that knows the Roblox API deeply
- [ ] **Sub-Agents** - Parallel AI workers for complex tasks

## Contributing

Contributions are welcome!

1. Fork the repo
2. Create a feature branch (`git checkout -b feature/amazing`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to branch (`git push origin feature/amazing`)
5. Open a Pull Request

See [CLAUDE.md](./CLAUDE.md) for code style guidelines and architecture details.

## Community

- Report bugs via [GitHub Issues](https://github.com/madebyshaurya/stud/issues)
- Feature requests welcome!
- Star the repo if you find it useful

## License

MIT License - see [LICENSE](./LICENSE) for details.

---

**Made for Roblox developers who want to build faster.**

*Not affiliated with Roblox Corporation.*
