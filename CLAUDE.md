# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Repository Overview

This repository contains two main components:

1. **Autonomous Coding Agent** (root level): A long-running autonomous coding agent powered by the Claude Agent SDK that builds complete applications over multiple sessions using a two-agent pattern.

2. **Generated Projects** (in `generations/`): Applications built by the autonomous agent. Currently contains the Novee Lead Generation Platform.

## Common Commands

### Autonomous Agent (Root Level)

```bash
# Start the autonomous agent (interactive menu)
./start.sh                    # macOS/Linux
start.bat                     # Windows

# Run the agent directly
python autonomous_agent_demo.py --project novee-lead-gen
```

### Novee Lead Generation Platform (generations/novee-lead-gen)

```bash
cd generations/novee-lead-gen

# Install dependencies
pnpm install

# Development
pnpm dev                              # Start all apps (web + desktop)
pnpm --filter @novee/web dev          # Web app only (localhost:3000)
pnpm --filter @novee/desktop dev      # Desktop app only

# Building
pnpm build                            # Build all
pnpm --filter @novee/shared build     # Build shared package first if needed

# Code quality
pnpm lint
pnpm typecheck
pnpm format

# Database (Supabase)
pnpm db:start                         # Start local Supabase
pnpm db:stop
pnpm db:reset
pnpm db:types                         # Regenerate TypeScript types

# Desktop app testing (Playwright)
pnpm desktop:test
pnpm desktop:test:headed              # With visible browser
pnpm desktop:test:debug               # Debug mode

# MCP Desktop Automation
pnpm --filter @novee/mcp-desktop-automation build
```

## Architecture

### Autonomous Agent (Two-Agent Pattern)

1. **Initializer Agent** (first session): Reads app spec, generates `feature_list.json` with test cases, sets up project structure
2. **Coding Agent** (subsequent sessions): Picks up from previous session, implements features, marks them passing in `feature_list.json`

Key files:
- `agent.py` - Core agent session logic
- `client.py` - Claude SDK client configuration
- `security.py` - Bash command allowlist and validation
- `prompts.py` - Prompt template loading with project-specific fallback
- `.claude/templates/` - Base prompt templates

Security model uses an allowlist approach - only explicitly permitted bash commands can run (see `ALLOWED_COMMANDS` in `security.py`).

### Novee Lead Gen Platform (Monorepo)

```
generations/novee-lead-gen/
├── apps/
│   ├── web/              # Next.js 15 web dashboard (Supabase Auth, Tailwind)
│   └── desktop/          # Electron app (Playwright for Slack scraping)
├── packages/
│   ├── shared/           # Shared types, Supabase client
│   └── mcp-desktop-automation/  # MCP server for testing Electron app
└── turbo.json            # Turborepo pipeline config
```

**Data Flow:**
- Web App authenticates users, manages keywords, displays leads
- Desktop App uses Playwright with persistent browser context to scrape Slack (user's credentials never leave their machine)
- Supabase provides auth, PostgreSQL database, and real-time updates

**Desktop App Security:**
- Node integration disabled in renderer
- Context isolation enabled
- All IPC handlers validate input

## Project-Specific Context

### Novee Documentation

Design mockups and architecture docs are in `generations/novee-lead-gen/.claude/docs/`:
- `design/mockups/` - UI mockups (reference when implementing UI)
- `design/design-system.md` - Colors, typography, components
- `architecture/` - System diagrams and decisions
- `spikes/` - Slack scraping implementation specs

When implementing Novee UI, always reference the mockups in `.claude/docs/design/mockups/`.

### Slack Scraping

Key implementation details (from spike docs):
- Uses persistent browser context to maintain Slack login
- Intercepts SSB redirects to avoid protocol dialogs
- Must check if search modal is open before interacting
- Always expand "Show More" buttons before extracting messages
- Scraper configs must be updatable without app rebuild
