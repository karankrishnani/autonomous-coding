/**
 * Novee Desktop App - Main Process
 *
 * This file runs in the main Electron process and handles:
 * - Window management
 * - IPC handlers for renderer communication
 * - Playwright automation for Slack/LinkedIn scraping
 */

import { app, BrowserWindow, ipcMain } from 'electron';
import * as path from 'path';

// Keep a global reference of the window object
let mainWindow: BrowserWindow | null = null;

/**
 * Create the main application window
 */
function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1200,
    height: 800,
    minWidth: 800,
    minHeight: 600,
    webPreferences: {
      // Security: Disable Node.js integration in renderer
      nodeIntegration: false,
      // Security: Enable context isolation
      contextIsolation: true,
      // Use preload script for safe IPC
      preload: path.join(__dirname, 'preload.js'),
    },
    // Window styling
    titleBarStyle: 'hiddenInset',
    backgroundColor: '#FFFFFF',
  });

  // In development, load from Vite dev server
  if (process.env.NODE_ENV === 'development') {
    mainWindow.loadURL('http://localhost:5173');
    mainWindow.webContents.openDevTools();
  } else {
    // In production, load the built renderer
    mainWindow.loadFile(path.join(__dirname, '../renderer/index.html'));
  }

  // Clean up on window close
  mainWindow.on('closed', () => {
    mainWindow = null;
  });
}

// Create window when app is ready
app.whenReady().then(createWindow);

// Quit when all windows are closed (except on macOS)
app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

// Re-create window when app is activated (macOS)
app.on('activate', () => {
  if (mainWindow === null) {
    createWindow();
  }
});

// =============================================================================
// IPC Handlers
// =============================================================================

/**
 * Handle Slack login request
 * Opens a Playwright browser for user to authenticate with Slack
 */
ipcMain.handle('open-slack-login', async () => {
  // TODO: Implement Slack login flow with Playwright
  // See: .claude/docs/spikes/SLACK_WORKSPACE_CAPTURE_SPEC.md
  console.log('Opening Slack login...');
  return { success: true };
});

/**
 * Handle Slack workspace capture
 * Returns array of captured workspace info
 */
ipcMain.handle('get-slack-workspaces', async () => {
  // TODO: Implement workspace capture
  // See: .claude/docs/spikes/SLACK_WORKSPACE_CAPTURE_SPEC.md
  console.log('Getting Slack workspaces...');
  return [];
});

/**
 * Handle Slack keyword search
 * Searches all connected workspaces for matching messages
 */
ipcMain.handle('search-slack-keywords', async (_event, keywords: string, lastScrapeDate?: number) => {
  // TODO: Implement keyword search
  // See: .claude/docs/spikes/SLACK_MESSAGE_SEARCH_SPEC.md
  console.log('Searching Slack for keywords:', keywords, 'since:', lastScrapeDate);
  return [];
});

/**
 * Open a Slack message permalink
 */
ipcMain.handle('open-slack-message', async (_event, url: string) => {
  // TODO: Open URL in Playwright browser
  console.log('Opening Slack message:', url);
  return { success: true };
});

/**
 * Get stored browser fingerprint from Supabase
 */
ipcMain.handle('get-fingerprint', async () => {
  // TODO: Fetch fingerprint from Supabase
  console.log('Getting browser fingerprint...');
  return null;
});
