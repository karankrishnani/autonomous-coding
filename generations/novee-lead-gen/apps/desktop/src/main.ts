/**
 * Novee Desktop App - Main Process
 *
 * This file runs in the main Electron process and handles:
 * - Window management
 * - IPC handlers for renderer communication
 * - Playwright automation for Slack/LinkedIn scraping
 * - Authentication with web app backend
 */

import { app, BrowserWindow, ipcMain, safeStorage } from 'electron';
import * as path from 'path';
import * as fs from 'fs';

// Keep a global reference of the window object
let mainWindow: BrowserWindow | null = null;

// Web app URL (configurable for development)
const WEB_APP_URL = process.env.NOVEE_WEB_URL || 'http://localhost:3000';

// Session storage path
const SESSION_FILE_PATH = path.join(app.getPath('userData'), 'session.enc');

/**
 * User information from session
 */
interface UserInfo {
  id: string;
  email: string;
  name: string;
}

/**
 * Stored session data
 */
interface SessionData {
  token: string;
  user: UserInfo;
}

/**
 * Securely store session data using Electron's safeStorage
 */
function storeSession(data: SessionData): void {
  try {
    const jsonData = JSON.stringify(data);
    if (safeStorage.isEncryptionAvailable()) {
      const encrypted = safeStorage.encryptString(jsonData);
      fs.writeFileSync(SESSION_FILE_PATH, encrypted);
    } else {
      // Fallback to plain text (not recommended for production)
      fs.writeFileSync(SESSION_FILE_PATH, jsonData);
    }
    console.log('Session stored securely');
  } catch (error) {
    console.error('Failed to store session:', error);
  }
}

/**
 * Load session data from secure storage
 */
function loadSession(): SessionData | null {
  try {
    if (!fs.existsSync(SESSION_FILE_PATH)) {
      return null;
    }

    const fileData = fs.readFileSync(SESSION_FILE_PATH);

    if (safeStorage.isEncryptionAvailable()) {
      const decrypted = safeStorage.decryptString(fileData);
      return JSON.parse(decrypted) as SessionData;
    } else {
      // Fallback to plain text
      return JSON.parse(fileData.toString()) as SessionData;
    }
  } catch (error) {
    console.error('Failed to load session:', error);
    return null;
  }
}

/**
 * Clear stored session data
 */
function clearSession(): void {
  try {
    if (fs.existsSync(SESSION_FILE_PATH)) {
      fs.unlinkSync(SESSION_FILE_PATH);
      console.log('Session cleared');
    }
  } catch (error) {
    console.error('Failed to clear session:', error);
  }
}

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
    mainWindow.loadFile(path.join(__dirname, 'renderer/index.html'));
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

// =============================================================================
// Authentication IPC Handlers
// =============================================================================

/**
 * Handle login request
 * Authenticates user with web app backend and stores session securely
 */
interface LoginResponse {
  user?: {
    id: string;
    email: string;
    name: string;
  };
  token?: string;
  error?: string;
}

interface SessionResponse {
  user?: {
    id: string;
    email: string;
    name: string;
  };
}

ipcMain.handle('login', async (_event, email: string, password: string) => {
  console.log('Attempting login for:', email);

  try {
    // Validate inputs
    if (!email || !password) {
      return { success: false, error: 'Email and password are required' };
    }

    // Call web app login API
    const response = await fetch(`${WEB_APP_URL}/api/auth/login`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ email, password }),
    });

    const data = (await response.json()) as LoginResponse;

    if (!response.ok) {
      console.log('Login failed:', data.error || 'Unknown error');
      return { success: false, error: data.error || 'Invalid email or password' };
    }

    if (!data.user) {
      return { success: false, error: 'Invalid response from server' };
    }

    // Extract user info and token from response
    const user: UserInfo = {
      id: data.user.id,
      email: data.user.email,
      name: data.user.name,
    };

    // Store session securely
    const token = data.token || response.headers.get('set-cookie') || '';
    storeSession({ token, user });

    console.log('Login successful for:', user.email);
    return { success: true, user };
  } catch (error) {
    console.error('Login error:', error);
    return { success: false, error: 'Unable to connect to the server. Please check your internet connection.' };
  }
});

/**
 * Handle logout request
 * Clears stored session data
 */
ipcMain.handle('logout', async () => {
  console.log('Logging out...');
  clearSession();
  return { success: true };
});

/**
 * Check if user is logged in
 * Returns session info if logged in, null otherwise
 */
ipcMain.handle('check-session', async () => {
  console.log('Checking session...');

  const session = loadSession();

  if (!session) {
    return { isLoggedIn: false };
  }

  // Optionally validate session with server
  try {
    const response = await fetch(`${WEB_APP_URL}/api/auth/session`, {
      method: 'GET',
      headers: {
        'Cookie': `novee-session=${session.token}`,
      },
    });

    if (response.ok) {
      const data = (await response.json()) as SessionResponse;
      if (data.user) {
        // Update stored user info
        const updatedUser: UserInfo = {
          id: data.user.id,
          email: data.user.email,
          name: data.user.name,
        };
        return { isLoggedIn: true, user: updatedUser };
      }
    }
  } catch (error) {
    console.log('Session validation failed, using cached session:', error);
  }

  // Return cached session if server validation fails
  return { isLoggedIn: true, user: session.user };
});

/**
 * Get web app URL (for opening in browser)
 */
ipcMain.handle('get-web-app-url', async () => {
  return WEB_APP_URL;
});
