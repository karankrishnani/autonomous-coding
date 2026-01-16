# Novee Lead Generation Platform - Development Context

This document provides essential context for building the Novee MVP. Reference the files in `.claude/docs/` for detailed technical information.

## Quick Reference

- **Tech Stack**: Next.js 15, Electron, Playwright, Supabase, pnpm workspaces
- **Key Challenge**: Secure, user-consented Slack scraping via desktop app
- **Design System**: See `.claude/docs/design/design-system.md`
- **Architecture Decisions**: See `.claude/docs/architecture/`
- **Spike Results**: See `.claude/docs/spikes/`

## Critical Implementation Notes

### Desktop App (Electron + Playwright)
- Uses persistent browser context to maintain Slack login
- Intercepts SSB redirects to avoid protocol dialogs
- Reference implementation: `.claude/docs/spikes/SLACK_WORKSPACE_CAPTURE_SPEC.md`

### Security Boundaries
- Node integration disabled in renderer
- Context isolation enabled
- IPC validation on all handlers

### Design References
All UI mockups are in `.claude/docs/design/mockups/`:
- .claude/docs/design/mockups/01-login.png : Login Page (Web App)
- .claude/docs/design/mockups/02-desktop-download-instructions.png : Download Desktop from Web App (Text Instructions)
- .claude/docs/design/mockups/02-desktop-download-support.png : Download Desktop from Web App (Support Instructions)
- .claude/docs/design/mockups/02-desktop-download-video.png : Download Desktop from Web App (Video Instructions)
- .claude/docs/design/mockups/02-platform-connect.png : View Platform Connections from Web App (Open Desktop App from Web App)
- .claude/docs/design/mockups/03a-desktop-app-login.png : Login Page (Desktop App)
- .claude/docs/design/mockups/03b-desktop-connect-platforms.png : Connect Social Platforms (Desktop App) 
- .claude/docs/design/mockups/04-keywords-empty.png : Keyword Selections Screen Empty State (Web App)
- .claude/docs/design/mockups/04-keywords-filled.png : Keyword Selections Screen Filled In (Web App)
- .claude/docs/design/mockups/05-lead-feed.png : Lead Feed (Web App)
      
When implementing UI, **always reference the mockups** to ensure visual consistency.

## Desktop App Automation (MCP Server)

The `@novee/mcp-desktop-automation` package provides an MCP server for automating the Electron desktop app.

**Location**: `packages/mcp-desktop-automation/`

**Build**: `pnpm --filter @novee/mcp-desktop-automation build`

**Tools Available**:
- `desktop_launch` - Launch the app, returns sessionId
- `desktop_close` - Close the app
- `desktop_snapshot` - Get UI element structure
- `desktop_screenshot` - Take screenshot
- `desktop_click` - Click elements
- `desktop_type` - Type into inputs
- `desktop_wait_for` - Wait for elements
- `desktop_get_text` - Get element text
- `desktop_evaluate` - Run JavaScript

See `packages/mcp-desktop-automation/README.md` for detailed documentation.

## Known Gotchas

1. **Slack Search Modal**: Must check if modal is open before interacting
2. **Show More Buttons**: Always expand truncated messages before extracting
3. **Remote Config**: Scraper configs MUST be updatable without app rebuild
4. **Browser Fingerprinting**: Collect from web app, apply to Playwright context

## Testing Priorities

1. Real data verification (no mock data)
2. Security boundaries (unauthenticated users blocked)
3. Navigation integrity (all buttons work)
4. Workflow completeness (every CRUD operation works end-to-end)

Refer to `prompts/app_spec.txt` for the complete specification.