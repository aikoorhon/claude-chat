# Claude Chat

A personal AI workspace that runs in your browser. Claude Desktop, rebuilt on top of Claude Code.

## The Problem

Claude Desktop is the best way to have an ongoing relationship with Claude — projects give you persistent context, conversations pick up where you left off, files let you share reference material. But not everyone can install it. Work machines have restrictions. IT policies block app installs. Some environments only allow browser-based tools.

Claude Code, on the other hand, is available anywhere Node.js runs. It's already authenticated, already powerful, already on your machine. What it lacks is the workspace experience — the visual layer that makes it easy to organize your work, manage context, and maintain continuity across sessions.

Claude Chat bridges that gap.

## What It Does

### Projects

The organizing unit. A project is a named workspace — "Samba Design System," "Q2 Planning," "React Native Migration" — with its own persistent context that carries across every conversation.

Each project has:

- **Instructions** — markdown files that define how Claude should behave in this context. Think of them as the system prompt, but editable and versioned. A design systems project might have `token-conventions.md`, `component-patterns.md`, and `review-checklist.md`. A planning project might just have `role.md` defining Claude's perspective.
- **Files** — reference documents that Claude can draw from. Design specs, API docs, code snippets, component inventories, meeting notes, style guides. Any text-based file. These provide knowledge; instructions provide direction.
- **Conversations** — every chat lives inside a project and inherits its full context. Start a new conversation and Claude already knows the rules. Resume an old one and pick up exactly where you left off.

### Conversations

Each conversation is a full session with history, streaming responses, and the ability to pause and return later. The sidebar shows all conversations within a project — titled, dated, searchable.

Starting a new conversation automatically loads the project's instructions and files. Claude responds as if it's been briefed. No copy-pasting context. No "here's what we're working on" preamble every time.

Resuming a conversation brings back the full thread — Claude remembers what you discussed, what decisions were made, what's still open.

### Files and Knowledge

Upload documents to a project and they become part of Claude's working knowledge for every conversation in that project. This is how you give Claude the same context your team has:

- The design system's token naming spec
- A component API reference
- Brand guidelines
- Architecture decision records
- Sprint goals or OKRs
- Anything you'd hand a new team member on day one

Files can be added, updated, or removed at any time. Changes apply to new conversations immediately.

### Model Selection

Switch between models per conversation or per project:
- **Sonnet** for fast iteration and everyday questions
- **Opus** for deep analysis, complex reasoning, architectural decisions
- **Haiku** for quick lookups and simple tasks

### Chat Experience

- Streaming responses — text appears as Claude generates it, not after
- Markdown rendering with syntax-highlighted code blocks
- Copy code blocks with one click
- Cancel a response mid-stream if it's going the wrong direction
- Keyboard-driven — Cmd+Enter to send, Cmd+N for new chat, Cmd+K to search

## How It Works

Claude Chat is a local web app. A Node.js server runs on your machine, serves a React frontend to your browser, and communicates with Claude Code's CLI under the hood. No cloud services, no external APIs, no database. Your data stays on your machine.

Claude Code handles all the hard parts — authentication, model access, context management, session persistence. Claude Chat handles the experience layer — project organization, conversation management, file uploads, and the visual interface.

### Requirements

- Node.js 22+
- Claude Code authenticated on the machine
- A browser
- That's it

## What It Doesn't Do

This isn't trying to replace Claude Code for coding. Claude Code in your terminal, inside your IDE, with full file system access — that's where active development happens. Claude Chat is for everything else:

- Thinking through architecture before writing code
- Discussing design decisions with full project context loaded
- Analyzing documents and specs
- Planning work across multiple domains
- Having Claude review something with the right framing already in place

They complement each other. Claude Code for building. Claude Chat for thinking.

## Design Principles

**Local-first.** Everything runs on your machine. No accounts, no cloud sync, no telemetry. Open source.

**Convention over configuration.** Sensible defaults, minimal setup. Create a project, add some files, start talking.

**Keyboard-native.** Every common action has a shortcut. The mouse is optional.

**Opinionated simplicity.** Not every Claude Desktop feature needs to be replicated. The goal is the 80% that matters — projects, files, conversations, streaming — done well.
