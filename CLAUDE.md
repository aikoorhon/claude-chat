# Claude Chat

A lightweight web UI that wraps Claude Code's CLI, designed as a Claude Desktop replacement for environments where Desktop isn't available.

## Architecture

- **server.js** — Express + WebSocket server. Spawns `npx @anthropic-ai/claude-code -p` processes, pipes streaming JSON output to connected browser clients.
- **public/index.html** — Single-page chat UI. Connects via WebSocket, renders streamed responses.

## How it works

1. User types a message in the browser
2. Browser sends it over WebSocket to the server
3. Server spawns Claude Code with `--output-format stream-json`
4. Claude Code's streaming JSON events are forwarded to the browser in real-time
5. Browser renders the response progressively

## Key Claude Code flags

- `-p "prompt"` — non-interactive print mode
- `--output-format stream-json` — real-time streaming JSON events
- `--system-prompt "..."` — inject project instructions as system context
- `--session-id <uuid>` — use a specific session for conversation persistence
- `--resume <id>` — resume an existing conversation
- `--append-system-prompt "..."` — add to (not replace) the default system prompt

## Current state: Spike (v0.1)

This is a proof of concept validating:
- CLI spawning and streaming from Node
- WebSocket bridge to browser
- System prompt injection
- Process lifecycle (cancel mid-stream)

## Planned features (post-spike)

- **Projects** — named workspaces with persistent instruction .md files (like Claude Desktop projects)
- **Conversation history** — sidebar with past chats, resume via `--session-id` / `--resume`
- **React + Vite** — proper component-based UI replacing the single HTML file
- **Markdown rendering** — with syntax highlighting for code blocks
- **File upload** — paste images or attach files
- **Model selector** — switch between Sonnet/Opus/Haiku

## Running

```bash
npm install
npm start
# Open http://localhost:3456
```

Requires Claude Code to be authenticated (`npx @anthropic-ai/claude-code -p "hi"` must work in your terminal).

## Code style

- ES modules (type: module in package.json)
- Minimal dependencies — Express + ws only
- No build step for now
