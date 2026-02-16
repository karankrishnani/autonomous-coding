#!/usr/bin/env node
/**
 * MCP Server for Desktop App Automation
 *
 * This server exposes Playwright Electron automation tools that allow
 * the coding agent to launch, interact with, and test a desktop app.
 *
 * Required environment variables:
 *   DESKTOP_APP_PATH - Absolute path to the Electron desktop app directory
 *
 * Optional environment variables:
 *   DESKTOP_WEB_URL - Web app URL (default: http://localhost:3000)
 */

import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
  Tool,
} from '@modelcontextprotocol/sdk/types.js';
import { _electron as electron, ElectronApplication, Page } from 'playwright';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';
import { createRequire } from 'module';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Create require function for ESM compatibility with CommonJS modules
const require = createRequire(import.meta.url);

// Session storage for active Electron app instances
interface DesktopSession {
  id: string;
  app: ElectronApplication;
  window: Page;
  launchedAt: Date;
}

const activeSessions = new Map<string, DesktopSession>();

// Paths
const DESKTOP_APP_PATH = process.env.DESKTOP_APP_PATH;
if (!DESKTOP_APP_PATH) {
  console.error('[MCP] DESKTOP_APP_PATH environment variable is required but not set.');
  console.error('[MCP] Set it to the absolute path of your Electron desktop app directory.');
  process.exit(1);
}

const MAIN_JS_PATH = path.join(DESKTOP_APP_PATH, 'dist', 'main.js');
const SCREENSHOTS_DIR = path.join(__dirname, '../screenshots');

// Ensure screenshots directory exists
if (!fs.existsSync(SCREENSHOTS_DIR)) {
  fs.mkdirSync(SCREENSHOTS_DIR, { recursive: true });
}

// Tool definitions
const TOOLS: Tool[] = [
  {
    name: 'desktop_launch',
    description: 'Launch the Electron desktop app and return a session ID',
    inputSchema: {
      type: 'object',
      properties: {
        env: {
          type: 'object',
          description: 'Optional environment variables to pass to the app',
          additionalProperties: { type: 'string' },
        },
        timeout: {
          type: 'number',
          description: 'Launch timeout in milliseconds (default: 30000)',
        },
      },
    },
  },
  {
    name: 'desktop_close',
    description: 'Close the Electron desktop app',
    inputSchema: {
      type: 'object',
      properties: {
        sessionId: {
          type: 'string',
          description: 'Session ID returned from desktop_launch',
        },
      },
      required: ['sessionId'],
    },
  },
  {
    name: 'desktop_snapshot',
    description: 'Capture the accessibility tree (structured representation) of the desktop app window',
    inputSchema: {
      type: 'object',
      properties: {
        sessionId: {
          type: 'string',
          description: 'Session ID returned from desktop_launch',
        },
      },
      required: ['sessionId'],
    },
  },
  {
    name: 'desktop_screenshot',
    description: 'Take a screenshot of the desktop app',
    inputSchema: {
      type: 'object',
      properties: {
        sessionId: {
          type: 'string',
          description: 'Session ID returned from desktop_launch',
        },
        filename: {
          type: 'string',
          description: 'Optional filename for the screenshot (without path)',
        },
      },
      required: ['sessionId'],
    },
  },
  {
    name: 'desktop_click',
    description: 'Click an element in the desktop app',
    inputSchema: {
      type: 'object',
      properties: {
        sessionId: {
          type: 'string',
          description: 'Session ID returned from desktop_launch',
        },
        selector: {
          type: 'string',
          description: 'CSS selector for the element to click',
        },
        text: {
          type: 'string',
          description: 'Alternative: text content to find and click',
        },
        timeout: {
          type: 'number',
          description: 'Wait timeout in milliseconds (default: 5000)',
        },
      },
      required: ['sessionId'],
    },
  },
  {
    name: 'desktop_type',
    description: 'Type text into an input field in the desktop app',
    inputSchema: {
      type: 'object',
      properties: {
        sessionId: {
          type: 'string',
          description: 'Session ID returned from desktop_launch',
        },
        selector: {
          type: 'string',
          description: 'CSS selector for the input field',
        },
        text: {
          type: 'string',
          description: 'Text to type',
        },
        clear: {
          type: 'boolean',
          description: 'Clear the field before typing (default: true)',
        },
      },
      required: ['sessionId', 'selector', 'text'],
    },
  },
  {
    name: 'desktop_wait_for',
    description: 'Wait for an element or text to appear in the desktop app',
    inputSchema: {
      type: 'object',
      properties: {
        sessionId: {
          type: 'string',
          description: 'Session ID returned from desktop_launch',
        },
        selector: {
          type: 'string',
          description: 'CSS selector to wait for',
        },
        text: {
          type: 'string',
          description: 'Alternative: text content to wait for',
        },
        state: {
          type: 'string',
          enum: ['visible', 'hidden', 'attached', 'detached'],
          description: 'Wait for element to be in this state (default: visible)',
        },
        timeout: {
          type: 'number',
          description: 'Wait timeout in milliseconds (default: 10000)',
        },
      },
      required: ['sessionId'],
    },
  },
  {
    name: 'desktop_get_text',
    description: 'Get text content from an element',
    inputSchema: {
      type: 'object',
      properties: {
        sessionId: {
          type: 'string',
          description: 'Session ID returned from desktop_launch',
        },
        selector: {
          type: 'string',
          description: 'CSS selector for the element',
        },
      },
      required: ['sessionId', 'selector'],
    },
  },
  {
    name: 'desktop_evaluate',
    description: 'Evaluate JavaScript in the desktop app renderer process',
    inputSchema: {
      type: 'object',
      properties: {
        sessionId: {
          type: 'string',
          description: 'Session ID returned from desktop_launch',
        },
        script: {
          type: 'string',
          description: 'JavaScript code to evaluate',
        },
      },
      required: ['sessionId', 'script'],
    },
  },
];

// Generate unique session ID
function generateSessionId(): string {
  return `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
}

// Get session or throw error
function getSession(sessionId: string): DesktopSession {
  const session = activeSessions.get(sessionId);
  if (!session) {
    throw new Error(`Session not found: ${sessionId}. Please launch the desktop app first.`);
  }
  return session;
}

// Tool handlers
async function handleDesktopLaunch(args: {
  env?: Record<string, string>;
  timeout?: number;
}): Promise<string> {
  const { env = {}, timeout = 30000 } = args;

  if (!fs.existsSync(MAIN_JS_PATH)) {
    throw new Error(
      `Desktop app not built. Build the Electron app first.\n` +
        `Expected: ${MAIN_JS_PATH}`
    );
  }

  // Get electron path
  const electronPath = require('electron') as string;

  console.error('[MCP] Launching Electron desktop app...');

  const app = await electron.launch({
    args: [MAIN_JS_PATH],
    executablePath: electronPath,
    timeout,
    env: {
      ...process.env,
      NODE_ENV: 'test',
      DISABLE_SCRAPER_SCHEDULER: 'true',
      DESKTOP_WEB_URL: process.env.DESKTOP_WEB_URL || 'http://localhost:3000',
      ...env,
    },
  });

  const window = await app.firstWindow();
  const sessionId = generateSessionId();

  activeSessions.set(sessionId, {
    id: sessionId,
    app,
    window,
    launchedAt: new Date(),
  });

  console.error(`[MCP] Desktop app launched. Session ID: ${sessionId}`);

  const url = await window.url();
  const title = await window.title();

  return JSON.stringify({
    sessionId,
    success: true,
    windowUrl: url,
    windowTitle: title,
    message: 'Desktop app launched successfully. Use this sessionId for subsequent commands.',
  });
}

async function handleDesktopClose(args: { sessionId: string }): Promise<string> {
  const session = getSession(args.sessionId);

  console.error(`[MCP] Closing desktop app. Session: ${args.sessionId}`);

  await session.app.close();
  activeSessions.delete(args.sessionId);

  return JSON.stringify({
    success: true,
    message: 'Desktop app closed successfully.',
  });
}

async function handleDesktopSnapshot(args: { sessionId: string }): Promise<string> {
  const session = getSession(args.sessionId);

  console.error(`[MCP] Taking accessibility snapshot. Session: ${args.sessionId}`);

  // Get page content and structure
  const url = await session.window.url();
  const title = await session.window.title();

  // Get HTML content
  const html = await session.window.content();

  // Extract key elements (simplified accessibility tree)
  const buttons = await session.window.locator('button').allTextContents();
  const inputs = await session.window.locator('input').evaluateAll((els) =>
    els.map((el) => ({
      type: el.type,
      placeholder: el.placeholder,
      name: el.name,
      id: el.id,
    }))
  );
  const headings = await session.window.locator('h1, h2, h3').allTextContents();
  const links = await session.window.locator('a').allTextContents();
  const labels = await session.window.locator('label').allTextContents();

  return JSON.stringify({
    url,
    title,
    elements: {
      buttons,
      inputs,
      headings,
      links,
      labels,
    },
    htmlLength: html.length,
  });
}

async function handleDesktopScreenshot(args: {
  sessionId: string;
  filename?: string;
}): Promise<string> {
  const session = getSession(args.sessionId);

  const filename = args.filename || `screenshot_${Date.now()}.png`;
  const filepath = path.join(SCREENSHOTS_DIR, filename);

  console.error(`[MCP] Taking screenshot. Session: ${args.sessionId}, File: ${filepath}`);

  await session.window.screenshot({ path: filepath });

  return JSON.stringify({
    success: true,
    filepath,
    message: `Screenshot saved to: ${filepath}`,
  });
}

async function handleDesktopClick(args: {
  sessionId: string;
  selector?: string;
  text?: string;
  timeout?: number;
}): Promise<string> {
  const session = getSession(args.sessionId);
  const { selector, text, timeout = 5000 } = args;

  console.error(`[MCP] Clicking element. Session: ${args.sessionId}, Selector: ${selector}, Text: ${text}`);

  let locator;
  if (selector) {
    locator = session.window.locator(selector);
  } else if (text) {
    locator = session.window.getByText(text);
  } else {
    throw new Error('Either selector or text must be provided');
  }

  await locator.waitFor({ state: 'visible', timeout });
  await locator.click();

  return JSON.stringify({
    success: true,
    message: `Clicked element: ${selector || text}`,
  });
}

async function handleDesktopType(args: {
  sessionId: string;
  selector: string;
  text: string;
  clear?: boolean;
}): Promise<string> {
  const session = getSession(args.sessionId);
  const { selector, text, clear = true } = args;

  console.error(`[MCP] Typing text. Session: ${args.sessionId}, Selector: ${selector}`);

  const locator = session.window.locator(selector);

  if (clear) {
    await locator.fill(text);
  } else {
    await locator.type(text);
  }

  return JSON.stringify({
    success: true,
    message: `Typed text into: ${selector}`,
  });
}

async function handleDesktopWaitFor(args: {
  sessionId: string;
  selector?: string;
  text?: string;
  state?: 'visible' | 'hidden' | 'attached' | 'detached';
  timeout?: number;
}): Promise<string> {
  const session = getSession(args.sessionId);
  const { selector, text, state = 'visible', timeout = 10000 } = args;

  console.error(`[MCP] Waiting for element. Session: ${args.sessionId}, Selector: ${selector}, Text: ${text}`);

  if (selector) {
    await session.window.locator(selector).waitFor({ state, timeout });
  } else if (text) {
    await session.window.getByText(text).waitFor({ state, timeout });
  } else {
    throw new Error('Either selector or text must be provided');
  }

  return JSON.stringify({
    success: true,
    message: `Element found: ${selector || text}`,
  });
}

async function handleDesktopGetText(args: {
  sessionId: string;
  selector: string;
}): Promise<string> {
  const session = getSession(args.sessionId);

  console.error(`[MCP] Getting text. Session: ${args.sessionId}, Selector: ${args.selector}`);

  const text = await session.window.locator(args.selector).textContent();

  return JSON.stringify({
    text,
  });
}

async function handleDesktopEvaluate(args: {
  sessionId: string;
  script: string;
}): Promise<string> {
  const session = getSession(args.sessionId);

  console.error(`[MCP] Evaluating script. Session: ${args.sessionId}`);

  const result = await session.window.evaluate(args.script);

  return JSON.stringify({
    result,
  });
}

// Main server setup
const server = new Server(
  {
    name: 'mcp-desktop-automation',
    version: '0.1.0',
  },
  {
    capabilities: {
      tools: {},
    },
  }
);

// Register tool handlers
server.setRequestHandler(ListToolsRequestSchema, async () => ({
  tools: TOOLS,
}));

server.setRequestHandler(CallToolRequestSchema, async (request) => {
  const { name, arguments: args } = request.params;

  try {
    let result: string;

    switch (name) {
      case 'desktop_launch':
        result = await handleDesktopLaunch(args as Parameters<typeof handleDesktopLaunch>[0]);
        break;
      case 'desktop_close':
        result = await handleDesktopClose(args as Parameters<typeof handleDesktopClose>[0]);
        break;
      case 'desktop_snapshot':
        result = await handleDesktopSnapshot(args as Parameters<typeof handleDesktopSnapshot>[0]);
        break;
      case 'desktop_screenshot':
        result = await handleDesktopScreenshot(args as Parameters<typeof handleDesktopScreenshot>[0]);
        break;
      case 'desktop_click':
        result = await handleDesktopClick(args as Parameters<typeof handleDesktopClick>[0]);
        break;
      case 'desktop_type':
        result = await handleDesktopType(args as Parameters<typeof handleDesktopType>[0]);
        break;
      case 'desktop_wait_for':
        result = await handleDesktopWaitFor(args as Parameters<typeof handleDesktopWaitFor>[0]);
        break;
      case 'desktop_get_text':
        result = await handleDesktopGetText(args as Parameters<typeof handleDesktopGetText>[0]);
        break;
      case 'desktop_evaluate':
        result = await handleDesktopEvaluate(args as Parameters<typeof handleDesktopEvaluate>[0]);
        break;
      default:
        throw new Error(`Unknown tool: ${name}`);
    }

    return {
      content: [
        {
          type: 'text',
          text: result,
        },
      ],
    };
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    return {
      content: [
        {
          type: 'text',
          text: JSON.stringify({
            error: true,
            message: errorMessage,
          }),
        },
      ],
      isError: true,
    };
  }
});

// Cleanup on exit
process.on('SIGINT', async () => {
  console.error('[MCP] Shutting down...');
  for (const [sessionId, session] of activeSessions) {
    console.error(`[MCP] Closing session: ${sessionId}`);
    try {
      await session.app.close();
    } catch {
      // Ignore errors during cleanup
    }
  }
  process.exit(0);
});

// Start the server
async function main() {
  console.error('[MCP] Starting MCP Desktop Automation server...');

  const transport = new StdioServerTransport();
  await server.connect(transport);

  console.error('[MCP] Server running. Waiting for commands...');
}

main().catch((error) => {
  console.error('[MCP] Fatal error:', error);
  process.exit(1);
});
