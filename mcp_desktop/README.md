# MCP Desktop Automation Server

An MCP (Model Context Protocol) server that provides tools for automating Electron desktop apps using Playwright.

## Overview

This server exposes Playwright Electron automation capabilities as MCP tools, allowing Claude and other AI assistants to:

- Launch and close the desktop app
- Take screenshots and accessibility snapshots
- Click elements and type text
- Wait for elements to appear
- Evaluate JavaScript in the renderer process

## Installation

```bash
  cd mcp_desktop
  npm install
  npm run build
```

## Environment Variables

| Variable | Required | Description |
|---|---|---|
| `DESKTOP_APP_PATH` | Yes | Absolute path to the Electron desktop app directory (must contain `dist/main.js` after build) |
| `DESKTOP_WEB_URL` | No | Web app URL (default: `http://localhost:3000`) |

## Usage

### Starting the Server

```bash
  DESKTOP_APP_PATH=/path/to/your/desktop/app node dist/index.js
```

### Available Tools

#### `desktop_launch`
Launch the Electron desktop app and return a session ID.

- `env` (optional): Environment variables to pass to the app
- `timeout` (optional): Launch timeout in milliseconds (default: 30000)

#### `desktop_close`
Close the Electron desktop app.

- `sessionId` (required): Session ID from `desktop_launch`

#### `desktop_snapshot`
Capture the accessibility tree of the desktop app window.

- `sessionId` (required): Session ID from `desktop_launch`

#### `desktop_screenshot`
Take a screenshot of the desktop app.

- `sessionId` (required): Session ID from `desktop_launch`
- `filename` (optional): Filename for the screenshot

#### `desktop_click`
Click an element in the desktop app.

- `sessionId` (required): Session ID from `desktop_launch`
- `selector` (optional): CSS selector for the element
- `text` (optional): Text content to find and click
- `timeout` (optional): Wait timeout in milliseconds (default: 5000)

#### `desktop_type`
Type text into an input field.

- `sessionId` (required): Session ID from `desktop_launch`
- `selector` (required): CSS selector for the input field
- `text` (required): Text to type
- `clear` (optional): Clear field before typing (default: true)

#### `desktop_wait_for`
Wait for an element or text to appear.

- `sessionId` (required): Session ID from `desktop_launch`
- `selector` (optional): CSS selector to wait for
- `text` (optional): Text content to wait for
- `state` (optional): Element state to wait for (visible, hidden, attached, detached)
- `timeout` (optional): Wait timeout in milliseconds (default: 10000)

#### `desktop_get_text`
Get text content from an element.

- `sessionId` (required): Session ID from `desktop_launch`
- `selector` (required): CSS selector for the element

#### `desktop_evaluate`
Evaluate JavaScript in the renderer process.

- `sessionId` (required): Session ID from `desktop_launch`
- `script` (required): JavaScript code to evaluate

## Development

```bash
  npm run dev       # Watch mode
  npm run build     # Build
  npm run typecheck # Type check
```

## Prerequisites

Before using this server, build the target Electron desktop app so that `$DESKTOP_APP_PATH/dist/main.js` exists.
