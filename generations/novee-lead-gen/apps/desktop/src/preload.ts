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
 * API exposed to the renderer process
 */
interface ElectronAPI {
  // Slack operations
  openSlackLogin: () => Promise<{ success: boolean }>;
  getSlackWorkspaces: () => Promise<WorkspaceInfo[]>;
  searchSlackKeywords: (keywords: string, lastScrapeDate?: number) => Promise<SearchResult[]>;
  openSlackMessage: (url: string) => Promise<{ success: boolean }>;

  // Fingerprint operations
  getFingerprint: () => Promise<Record<string, unknown> | null>;

  // Event listeners
  onSlackWorkspaceCaptured: (callback: (workspaces: WorkspaceInfo[]) => void) => void;
  onSearchProgress: (callback: (progress: { current: number; total: number }) => void) => void;
}

// Expose the API to the renderer
contextBridge.exposeInMainWorld('electronAPI', {
  // Slack operations
  openSlackLogin: () => ipcRenderer.invoke('open-slack-login'),
  getSlackWorkspaces: () => ipcRenderer.invoke('get-slack-workspaces'),
  searchSlackKeywords: (keywords: string, lastScrapeDate?: number) =>
    ipcRenderer.invoke('search-slack-keywords', keywords, lastScrapeDate),
  openSlackMessage: (url: string) => ipcRenderer.invoke('open-slack-message', url),

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
