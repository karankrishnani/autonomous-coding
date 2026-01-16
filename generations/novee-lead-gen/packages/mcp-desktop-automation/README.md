# MCP Desktop Automation Server

An MCP (Model Context Protocol) server that provides tools for automating the Novee Electron desktop app using Playwright.

## Overview

This server exposes Playwright Electron automation capabilities as MCP tools, allowing Claude and other AI assistants to:

- Launch and close the desktop app
- Take screenshots and accessibility snapshots
- Click elements and type text
- Wait for elements to appear
- Evaluate JavaScript in the renderer process

## Installation

```bash
# From the monorepo root
pnpm install
pnpm --filter @novee/mcp-desktop-automation build
```

## Usage

### Starting the Server

```bash
pnpm --filter @novee/mcp-desktop-automation start
```

### Available Tools

#### `desktop_launch`
Launch the Novee Electron desktop app and return a session ID.

**Parameters:**
- `env` (optional): Environment variables to pass to the app
- `timeout` (optional): Launch timeout in milliseconds (default: 30000)

**Returns:** Session ID for subsequent commands

#### `desktop_close`
Close the Electron desktop app.

**Parameters:**
- `sessionId` (required): Session ID from `desktop_launch`

#### `desktop_snapshot`
Capture the accessibility tree of the desktop app window.

**Parameters:**
- `sessionId` (required): Session ID from `desktop_launch`

**Returns:** Accessibility tree structure with buttons, inputs, headings, etc.

#### `desktop_screenshot`
Take a screenshot of the desktop app.

**Parameters:**
- `sessionId` (required): Session ID from `desktop_launch`
- `filename` (optional): Filename for the screenshot

**Returns:** Path to the saved screenshot

#### `desktop_click`
Click an element in the desktop app.

**Parameters:**
- `sessionId` (required): Session ID from `desktop_launch`
- `selector` (optional): CSS selector for the element
- `text` (optional): Text content to find and click
- `timeout` (optional): Wait timeout in milliseconds (default: 5000)

#### `desktop_type`
Type text into an input field.

**Parameters:**
- `sessionId` (required): Session ID from `desktop_launch`
- `selector` (required): CSS selector for the input field
- `text` (required): Text to type
- `clear` (optional): Clear field before typing (default: true)

#### `desktop_wait_for`
Wait for an element or text to appear.

**Parameters:**
- `sessionId` (required): Session ID from `desktop_launch`
- `selector` (optional): CSS selector to wait for
- `text` (optional): Text content to wait for
- `state` (optional): Element state to wait for (visible, hidden, attached, detached)
- `timeout` (optional): Wait timeout in milliseconds (default: 10000)

#### `desktop_get_text`
Get text content from an element.

**Parameters:**
- `sessionId` (required): Session ID from `desktop_launch`
- `selector` (required): CSS selector for the element

#### `desktop_evaluate`
Evaluate JavaScript in the renderer process.

**Parameters:**
- `sessionId` (required): Session ID from `desktop_launch`
- `script` (required): JavaScript code to evaluate

## Example Workflow

```typescript
// 1. Launch the desktop app
const launch = await mcp.call('desktop_launch', {});
const { sessionId } = JSON.parse(launch);

// 2. Take a screenshot
await mcp.call('desktop_screenshot', { sessionId, filename: 'app-initial.png' });

// 3. Get accessibility snapshot
const snapshot = await mcp.call('desktop_snapshot', { sessionId });
console.log(JSON.parse(snapshot));

// 4. Login
await mcp.call('desktop_type', { sessionId, selector: 'input[type="email"]', text: 'user@example.com' });
await mcp.call('desktop_type', { sessionId, selector: 'input[type="password"]', text: 'password123' });
await mcp.call('desktop_click', { sessionId, text: 'Log In' });

// 5. Wait for dashboard
await mcp.call('desktop_wait_for', { sessionId, text: 'Platform Connections' });

// 6. Take final screenshot
await mcp.call('desktop_screenshot', { sessionId, filename: 'app-logged-in.png' });

// 7. Close the app
await mcp.call('desktop_close', { sessionId });
```

## Configuration

### Environment Variables

- `NOVEE_WEB_URL`: Web app URL (default: http://localhost:3000)
- `NODE_ENV`: Node environment (set to 'test' automatically)
- `DISABLE_SCRAPER_SCHEDULER`: Disable auto-scraping (set to 'true' automatically)

## Development

```bash
# Watch mode
pnpm --filter @novee/mcp-desktop-automation dev

# Build
pnpm --filter @novee/mcp-desktop-automation build

# Type check
pnpm --filter @novee/mcp-desktop-automation typecheck
```

## Prerequisites

Before using this server:

1. Build the desktop app: `pnpm --filter @novee/desktop build`
2. Ensure the web app is running: `pnpm --filter @novee/web dev`

## Troubleshooting

### "Desktop app not built" error
Run `pnpm --filter @novee/desktop build` to build the Electron app.

### "Session not found" error
The session ID may have expired or the app was closed. Launch a new session with `desktop_launch`.

### Screenshot path issues
Screenshots are saved to `packages/mcp-desktop-automation/screenshots/` by default.
