# Claude Chat — Spike

A minimal web UI wrapping Claude Code's CLI. Proof of concept.

## Quick start

```bash
cd projects/claude-chat
npm install
npm start
```

Then open http://localhost:3456

## What it tests

- Spawning Claude Code from Node (`npx @anthropic-ai/claude-code -p`)
- Streaming JSON output → WebSocket → browser
- System prompt injection (simulating project instructions)
- Process lifecycle (cancel mid-stream)

## Requirements

- Node 22+
- Claude Code authenticated (`npx @anthropic-ai/claude-code` must work in your terminal)
- That's it

## What's next (if spike works)

- Projects with persistent instruction files
- Conversation history (using `--session-id` / `--resume`)
- React + Vite for real UI
- Markdown rendering with syntax highlighting
