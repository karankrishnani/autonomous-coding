# System Architecture Overview

## High-Level Architecture
```
┌─────────────────────────────────────────────────────────────┐
│                        Web App (Vercel)                     │
│  ┌────────────┐  ┌──────────────┐  ┌──────────────────┐   │
│  │  Next.js   │  │   Supabase   │  │  Lead Dashboard  │   │
│  │  App Router│◄─┤     Auth     │  │   (React UI)     │   │
│  └────────────┘  └──────────────┘  └──────────────────┘   │
└───────────────────────────┬─────────────────────────────────┘
                            │ Auth Session
                            │ Real-time Updates
                            ▼
┌─────────────────────────────────────────────────────────────┐
│                   Supabase (PostgreSQL)                     │
│  ┌──────────┐  ┌────────────┐  ┌───────────┐  ┌─────────┐ │
│  │  Users   │  │  Platforms │  │ Keywords  │  │  Leads  │ │
│  └──────────┘  └────────────┘  └───────────┘  └─────────┘ │
└───────────────────────────┬─────────────────────────────────┘
                            │ API Calls
                            │ Data Storage
                            ▼
┌─────────────────────────────────────────────────────────────┐
│              Desktop App (Electron + Playwright)            │
│  ┌─────────────────┐  ┌────────────────────────────────┐   │
│  │  Main Process   │  │   Playwright Automation       │   │
│  │  (Node.js)      │◄─┤   - Slack workspace capture   │   │
│  │  - IPC handlers │  │   - Message search & extract  │   │
│  │  - Scheduling   │  │   - Persistent browser context│   │
│  └─────────────────┘  └────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────┘
```

## Key Design Decisions

### Why Desktop App?
- **Privacy**: User's Slack credentials never leave their machine
- **No OAuth**: Avoids complex workspace admin approval process
- **Platform Evasion**: Persistent context mimics real user behavior
- **User Control**: User can disconnect platforms anytime

### Why Monorepo?
- **Shared Types**: Single source of truth for TypeScript types
- **Code Reuse**: Supabase client shared between web and desktop
- **Atomic Deploys**: Changes to shared code don't break deployments

See `docs/Novee-Monorepo-Build-Plan.md` for detailed setup instructions.