# Claude Chat

A clean chat interface for Claude Code with persistent project context.

## Why

At work, the available AI tools are ChatGPT and Claude Code. ChatGPT isn't an option — not the experience you want. Claude Code is great but it's a terminal tool, not a conversation interface. Claude Desktop would solve this, but it can't be installed on work machines.

Claude Chat gives you a browser-based way to talk to Claude through Claude Code, with the one thing that matters most: context.

## What It Does

**Projects** are the core concept. Each project is a named context — "Samba," "React Native," "General" — that shapes every conversation.

A project has:
- **Instructions** — markdown files that tell Claude how to behave. Design system conventions, code standards, role definitions. These get injected as system prompt on every message.
- **Files** — reference documents Claude can draw from. Specs, component APIs, architecture docs, style guides. The context you'd normally paste in manually every time.

**The workflow:** Open the tool, pick a project, start chatting. Claude already has your context loaded. When the conversation gets long and context compresses, start fresh — the project context is still there.

One active chat per project. No conversation history, no saving old chats. Simple.

## How It Works

Local Node.js server talks to Claude Code's CLI. Browser connects via WebSocket. Claude Code handles auth, models, and streaming. No API keys, no database, no cloud.

**Requires:** Node.js 22+, authenticated Claude Code, a browser.
