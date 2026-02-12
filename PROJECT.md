# Claude Chat — Project Overview

## What is this?

A web-based Claude Desktop replacement for environments where Desktop isn't available (e.g., work machines with restricted app installs). Wraps Claude Code's CLI in a browser UI with project management, conversation history, and file context — the features that make Claude Desktop useful, powered by the tool you already have access to.

## Why?

- Betterment doesn't provide Claude Desktop access
- Claude Code CLI works fine but lacks project organization and conversation persistence in a visual way
- A lightweight web UI gives you the Desktop experience without needing Desktop

## Core Concepts

### Projects
Named workspaces, just like Claude Desktop. Each project has:
- **A name** (e.g., "Samba Design System", "React Native Migration")
- **Instruction files** — one or more `.md` files that define persistent context. Every conversation in the project inherits these instructions as system prompt.
- **Knowledge files** — uploaded documents (specs, docs, code snippets) that get included as context. Similar to Claude Desktop's file attachment feature.
- **Conversations** — multiple chat sessions within a project, each with full history and the ability to resume.

### Instruction Files
Markdown files that shape how Claude responds within a project. Examples:
- `design-system-rules.md` — token naming conventions, component patterns, do/don't guidelines
- `codebase-context.md` — repo structure, key abstractions, team conventions
- `role.md` — "You are a senior design systems engineer helping maintain Samba..."

These get concatenated and passed via `--system-prompt` or `--append-system-prompt` to Claude Code on every message.

### Knowledge Files
Files uploaded to a project that provide reference context. Unlike instructions (which shape behavior), these are reference material Claude can draw from:
- Design specs, API docs, component inventories
- Code snippets, configuration files
- Meeting notes, decision records
- Any text-based file (`.md`, `.txt`, `.json`, `.yaml`, `.ts`, `.tsx`, etc.)

These get included in the prompt context alongside instructions. Size limits TBD based on Claude Code's context window handling.

### Conversations
Each chat within a project is a separate Claude Code session:
- **New conversation** → fresh `--session-id`, project instructions + files injected
- **Resume conversation** → `--resume <session-id>`, picks up where you left off
- **Conversation list** → sidebar showing all chats in a project (title, date, preview)
- Conversations persist between app restarts via Claude Code's built-in session storage

## Architecture

```
Browser (React + Vite)
    ↕ WebSocket
Express Server (Node)
    ↕ spawn + stdio
Claude Code CLI (npx @anthropic-ai/claude-code)
```

### Server
- Express serves the static frontend
- WebSocket handles real-time bidirectional communication
- Spawns Claude Code processes per conversation
- Manages process lifecycle (start, stream, cancel, cleanup)
- Stores project metadata (names, file paths, session IDs) in a local JSON file

### Frontend
- React + Vite (after spike validation)
- Sidebar: projects list → conversations list
- Main area: chat interface with streaming responses
- Settings panel: project instructions and file management
- Markdown rendering with syntax highlighting

### Data Model
```
~/.claude-chat/                    # App data directory
  projects.json                    # Project metadata index
  projects/
    <project-id>/
      config.json                  # Name, created date, settings
      instructions/
        design-system-rules.md     # Instruction files
        codebase-context.md
      files/
        component-inventory.json   # Knowledge files
        api-spec.md
      conversations.json           # Session ID index (titles, dates)
```

Conversation content is stored by Claude Code itself (via `--session-id`). We only store the metadata needed to list and resume them.

## Claude Code Integration

### Key CLI Flags
| Flag | Purpose |
|------|---------|
| `-p "prompt"` | Non-interactive print mode |
| `--output-format stream-json` | Real-time streaming JSON events |
| `--system-prompt "..."` | Inject project instructions |
| `--append-system-prompt "..."` | Add to default system prompt |
| `--session-id <uuid>` | Pin to a specific session |
| `--resume <id>` | Resume an existing session |
| `--model <model>` | Select model (sonnet, opus, haiku) |

### How Project Context Gets Injected
On each message:
1. Read all instruction `.md` files → concatenate
2. Read all knowledge files → format as reference context
3. Combine into a single system prompt
4. Pass via `--system-prompt` (or `--append-system-prompt` to keep Claude Code defaults)
5. Include `--session-id` for conversation continuity

## Development Phases

### Phase 0: Spike ✅ (current)
- Single HTML + Express server
- Validates: CLI spawning, streaming JSON, system prompt injection, WebSocket bridge
- No projects, no persistence, no styling

### Phase 1: Working MVP
- React + Vite frontend
- Project CRUD (create, rename, delete)
- Instruction file management (add, edit, remove per project)
- Basic conversation list and resume
- Markdown rendering + code highlighting
- Model selector

### Phase 2: Polish
- Knowledge file upload and management
- Search across conversations
- Keyboard shortcuts (Cmd+Enter send, Cmd+N new chat, Cmd+K search)
- Dark/light theme
- Export conversations as markdown
- Token usage display

### Phase 3: Nice-to-haves
- Drag-and-drop file upload
- Image paste support
- Conversation branching (fork from a point)
- Electron wrapper for native app feel
- Shareable project templates

## Tech Stack
- **Runtime:** Node.js 22+
- **Server:** Express + ws (WebSocket)
- **Frontend:** React + Vite (post-spike)
- **Styling:** Tailwind CSS
- **Markdown:** marked + highlight.js (or similar)
- **Storage:** Local JSON files (no database)
- **Auth:** None needed — inherits Claude Code's existing authentication

## Requirements
- Claude Code authenticated on the machine (`npx @anthropic-ai/claude-code -p "hi"` must work)
- Node.js 22+
- That's it — no API keys, no external services, no database
