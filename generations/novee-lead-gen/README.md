# Novee Lead Generation Platform

Novee is a conversation-based lead generation platform that helps freelancers, agencies, and consultants discover high-quality client opportunities by monitoring Slack workspaces (and LinkedIn in the future) for relevant job posts and project requests.

## Overview

Unlike traditional B2B data tools that focus on profile scraping, Novee surfaces real-time opportunities from actual conversations where clients are actively seeking help.

**Core differentiators:**
- 🎯 **Data accuracy** with transparency about sources and freshness
- 💬 **Conversation-first approach** capturing real intent, not just contact info
- 🔒 **Privacy-first** - We only read, never post. Your credentials stay on your device.

## Architecture

The platform consists of two main components:

1. **Web Dashboard** (`apps/web/`) - Next.js 15 application for managing keywords and viewing leads
2. **Desktop App** (`apps/desktop/`) - Electron app that handles secure, user-consented scraping

```
novee-lead-gen/
├── apps/
│   ├── web/                    # Next.js 15 web dashboard
│   └── desktop/                # Electron desktop app
├── packages/
│   └── shared/                 # Shared utilities, types, Supabase client
├── pnpm-workspace.yaml
├── turbo.json
└── package.json
```

## Tech Stack

- **Frontend**: Next.js 15 (App Router), Tailwind CSS, React 18
- **Backend**: Supabase (PostgreSQL + Auth + Realtime)
- **Desktop**: Electron 28+, Playwright for browser automation
- **Monorepo**: pnpm workspaces, Turborepo
- **Language**: TypeScript 5+

## Prerequisites

- Node.js 18+
- pnpm 8+ (`npm install -g pnpm`)
- A Supabase project (for database and auth)
- (Optional) Google OAuth credentials for social login

## Getting Started

### 1. Clone and Install

```bash
# Clone the repository
git clone <repository-url>
cd novee-lead-gen

# Install dependencies
pnpm install
```

### 2. Configure Environment

```bash
# Copy example environment files
cp apps/web/.env.example apps/web/.env.local
cp apps/desktop/.env.example apps/desktop/.env

# Edit the files with your Supabase credentials
```

### 3. Quick Start with init.sh

```bash
# Make the script executable and run it
chmod +x init.sh
./init.sh
```

The script will:
- Verify Node.js and pnpm are installed
- Install all dependencies
- Set up environment files
- Start the development server

### 4. Manual Development

```bash
# Start the web app development server
pnpm --filter @novee/web dev

# In another terminal, start the desktop app
pnpm --filter @novee/desktop dev
```

## Environment Variables

### Web App (`apps/web/.env.local`)

```env
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_anon_key
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key
GOOGLE_CLIENT_ID=your_google_client_id
GOOGLE_CLIENT_SECRET=your_google_client_secret
NEXT_PUBLIC_APP_URL=http://localhost:3000
```

### Desktop App (`apps/desktop/.env`)

```env
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_ANON_KEY=your_anon_key
PLAYWRIGHT_CACHE_DIR=./playwright-cache
```

## Project Structure

### Apps

- **`apps/web/`** - Next.js web dashboard
  - `src/app/` - App Router pages and layouts
  - `src/components/` - Reusable React components
  - `src/lib/` - Utilities and Supabase client
  - `src/types/` - TypeScript type definitions

- **`apps/desktop/`** - Electron desktop application
  - `src/main.ts` - Main process (Playwright automation)
  - `src/preload.ts` - Context bridge for secure IPC
  - `src/renderer/` - Renderer process UI

### Packages

- **`packages/shared/`** - Shared code between apps
  - `src/types.ts` - TypeScript interfaces and types
  - `src/supabase.ts` - Supabase client configuration
  - `src/utils.ts` - Utility functions

## Database Schema

See `app_spec.txt` for the complete database schema. Key tables:
- `users` - User accounts
- `platform_connections` - Slack/LinkedIn connections
- `keywords` - User's monitoring keywords
- `posts` - Scraped messages
- `leads` - Matched leads for users

## Scripts

```bash
# Development
pnpm dev              # Start all apps in development mode
pnpm --filter @novee/web dev     # Start web app only
pnpm --filter @novee/desktop dev # Start desktop app only

# Building
pnpm build            # Build all apps
pnpm --filter @novee/web build   # Build web app only

# Code Quality
pnpm lint             # Run ESLint
pnpm format           # Run Prettier
pnpm typecheck        # Run TypeScript type checking
```

## Documentation

Additional documentation is available in `.claude/docs/`:

- `design/` - UI mockups and design system
- `architecture/` - Architecture decisions
- `spikes/` - Technical spike results (Slack capture specs)

## Security Notes

- **Desktop App**: Node integration disabled, context isolation enabled
- **IPC**: All renderer-main communication via validated IPC handlers
- **Auth**: Supabase Row Level Security (RLS) policies on all tables
- **Credentials**: Never stored in code; uses persistent browser context

## Contributing

1. Create a feature branch
2. Make changes following the coding standards
3. Run tests and linting
4. Submit a pull request

## License

Private - All rights reserved
