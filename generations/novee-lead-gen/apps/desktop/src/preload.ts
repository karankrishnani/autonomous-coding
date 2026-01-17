/**
 * Novee Desktop App - Preload Script
 *
 * This script runs in a privileged context and exposes safe APIs
 * to the renderer process via contextBridge.
 *
 * Security: This is the ONLY way the renderer can communicate with
 * the main process. All IPC calls must go through this bridge.
 */

import { contextBridge, ipcRenderer } from 'electron';

/**
 * User information returned from login
 */
interface UserInfo {
  id: string;
  email: string;
  name: string;
}

/**
 * Login result
 */
interface LoginResult {
  success: boolean;
  user?: UserInfo;
  error?: string;
}

/**
 * Session check result
 */
interface SessionResult {
  isLoggedIn: boolean;
  user?: UserInfo;
}

/**
 * Workspace information returned from Slack capture
 */
interface WorkspaceInfo {
  name: string;
  url: string;
}

/**
 * Search result item from Slack keyword search
 */
interface SearchResultItem {
  message: string;
  channel: string;
  timestamp: string;
  permalink: string;
  sender?: string;
  timestampUnix?: number;
}

/**
 * Search result grouped by workspace
 */
interface SearchResult {
  workspaceName: string;
  workspaceUrl: string;
  results: SearchResultItem[];
}

/**
 * Manual scrape result
 */
interface ManualScrapeResult {
  success: boolean;
  leadsFound?: number;
  error?: string;
}

/**
 * Platform connection info
 */
interface PlatformConnectionInfo {
  platform: string;
  status: string;
  workspaceCount: number;
  lastCheckedAt: string | null;
}

/**
 * API exposed to the renderer process
 */
interface ElectronAPI {
  // Authentication operations
  login: (email: string, password: string) => Promise<LoginResult>;
  logout: () => Promise<{ success: boolean }>;
  checkSession: () => Promise<SessionResult>;
  getWebAppUrl: () => Promise<string>;

  // Slack operations
  openSlackLogin: () => Promise<{ success: boolean; error?: string }>;
  getSlackWorkspaces: () => Promise<WorkspaceInfo[]>;
  searchSlackKeywords: (keywords: string, lastScrapeDate?: number) => Promise<SearchResult[]>;
  openSlackMessage: (url: string) => Promise<{ success: boolean }>;

  // Platform connection operations
  getPlatformConnectionInfo: (platform: string) => Promise<PlatformConnectionInfo | null>;

  // Scraping operations
  manualScrape: () => Promise<ManualScrapeResult>;

  // Fingerprint operations
  getFingerprint: () => Promise<Record<string, unknown> | null>;

  // Event listeners
  onSlackWorkspaceCaptured: (callback: (workspaces: WorkspaceInfo[]) => void) => void;
  onSearchProgress: (callback: (progress: { current: number; total: number }) => void) => void;
}

// Expose the API to the renderer
contextBridge.exposeInMainWorld('electronAPI', {
  // Authentication operations
  login: (email: string, password: string) => ipcRenderer.invoke('login', email, password),
  logout: () => ipcRenderer.invoke('logout'),
  checkSession: () => ipcRenderer.invoke('check-session'),
  getWebAppUrl: () => ipcRenderer.invoke('get-web-app-url'),

  // Slack operations
  openSlackLogin: () => ipcRenderer.invoke('open-slack-login'),
  getSlackWorkspaces: () => ipcRenderer.invoke('get-slack-workspaces'),
  searchSlackKeywords: (keywords: string, lastScrapeDate?: number) =>
    ipcRenderer.invoke('search-slack-keywords', keywords, lastScrapeDate),
  openSlackMessage: (url: string) => ipcRenderer.invoke('open-slack-message', url),

  // Platform connection operations
  getPlatformConnectionInfo: (platform: string) => ipcRenderer.invoke('get-platform-connection-info', platform),

  // Scraping operations
  manualScrape: () => ipcRenderer.invoke('manual-scrape'),

  // Fingerprint operations
  getFingerprint: () => ipcRenderer.invoke('get-fingerprint'),

  // Event listeners (main -> renderer)
  onSlackWorkspaceCaptured: (callback: (workspaces: WorkspaceInfo[]) => void) => {
    ipcRenderer.on('slack-workspace-captured', (_event, workspaces) => callback(workspaces));
  },
  onSearchProgress: (callback: (progress: { current: number; total: number }) => void) => {
    ipcRenderer.on('search-progress', (_event, progress) => callback(progress));
  },
} as ElectronAPI);

// Declare the type for window.electronAPI
declare global {
  interface Window {
    electronAPI: ElectronAPI;
  }
}
