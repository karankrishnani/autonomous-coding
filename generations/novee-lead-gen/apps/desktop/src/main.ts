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
import * as os from 'os';
import { chromium, BrowserContext, Page, Route } from 'playwright';
import { ScraperScheduler, ScraperSchedulerState } from './scraper';

// Keep a global reference of the window object
let mainWindow: BrowserWindow | null = null;

// Playwright browser contexts
// Login context: visible browser for user authentication
let loginContext: BrowserContext | null = null;
// Scrape context: headless browser for background scraping
let scrapeContext: BrowserContext | null = null;

// Captured Slack workspaces (in-memory cache, fetched from API)
let slackWorkspaces: WorkspaceInfo[] = [];

// 24-hour scheduler for automatic scraping
let scraperScheduler: ScraperScheduler | null = null;

// Scheduler interval: 24 hours in milliseconds
const SCRAPE_INTERVAL_MS = 24 * 60 * 60 * 1000;

// Playwright cache directory for persistent sessions
const PLAYWRIGHT_CACHE_DIR = path.join(app.getPath('userData'), 'playwright-cache');

/**
 * Workspace information captured from Slack
 */
interface WorkspaceInfo {
  name: string;
  url: string;
}

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
 * API response types
 */
interface ApiErrorResponse {
  error?: string;
}

interface PlatformConnection {
  id: string;
  platform: string;
  status: string;
  metadata?: {
    workspaces?: WorkspaceInfo[];
  };
  connected_at?: string;
  last_checked_at?: string;
}

interface ConnectionsResponse extends ApiErrorResponse {
  connections?: PlatformConnection[];
}

interface ConnectionUpdateResponse extends ApiErrorResponse {
  success?: boolean;
  connection?: PlatformConnection;
}

interface ChannelsBulkResponse extends ApiErrorResponse {
  success?: boolean;
  connection_id?: string;
  channels?: Array<{
    id: string;
    name: string;
    type: string;
    metadata: Record<string, unknown>;
  }>;
  count?: number;
}

/**
 * Make authenticated API request to web app backend
 */
async function apiRequest<T>(
  endpoint: string,
  method: 'GET' | 'POST' | 'PUT' | 'DELETE' = 'GET',
  body?: Record<string, unknown>
): Promise<{ ok: boolean; data: T | null; error?: string }> {
  const session = loadSession();

  if (!session) {
    return { ok: false, data: null, error: 'Not logged in' };
  }

  try {
    // The token contains the full cookie string (e.g., "sb-127-auth-token=base64data")
    const options: RequestInit = {
      method,
      headers: {
        'Content-Type': 'application/json',
        'Cookie': session.token,
      },
    };

    if (body && method !== 'GET') {
      options.body = JSON.stringify(body);
    }

    const response = await fetch(`${WEB_APP_URL}${endpoint}`, options);
    const data = await response.json() as T;

    if (!response.ok) {
      const errorData = data as ApiErrorResponse;
      return { ok: false, data: null, error: errorData.error || 'Request failed' };
    }

    return { ok: true, data };
  } catch (error) {
    console.error(`API request failed: ${endpoint}`, error);
    return { ok: false, data: null, error: String(error) };
  }
}

/**
 * Store workspaces to the backend API
 */
async function storeWorkspacesToAPI(workspaces: WorkspaceInfo[]): Promise<{ connectionId: string | null; error?: string }> {
  console.log(`[API] Storing ${workspaces.length} workspaces to backend...`);

  // First, update/create the platform connection with metadata
  const connectionResult = await apiRequest<ConnectionUpdateResponse>(
    '/api/platforms/connections',
    'PUT',
    {
      platform: 'SLACK',
      status: 'CONNECTED',
      metadata: { workspaces },
    }
  );

  if (!connectionResult.ok || !connectionResult.data?.connection) {
    console.error('[API] Failed to update platform connection:', connectionResult.error);
    return { connectionId: null, error: connectionResult.error };
  }

  const connectionId = connectionResult.data.connection.id;
  console.log(`[API] Platform connection updated: ${connectionId}`);

  // Then, store workspaces as channels
  const channelsData = workspaces.map((ws) => ({
    name: ws.name,
    type: 'workspace',
    metadata: { url: ws.url },
  }));

  const channelsResult = await apiRequest<ChannelsBulkResponse>(
    `/api/platforms/connections/${connectionId}/channels`,
    'POST',
    { channels: channelsData }
  );

  if (!channelsResult.ok) {
    console.error('[API] Failed to store channels:', channelsResult.error);
    // Don't fail completely - connection was created, just log the channel error
  } else {
    console.log(`[API] Stored ${channelsResult.data?.count || 0} channels`);
  }

  return { connectionId };
}

/**
 * Fetch workspaces from the backend API
 */
async function fetchWorkspacesFromAPI(): Promise<WorkspaceInfo[]> {
  console.log('[API] Fetching workspaces from backend...');

  const result = await apiRequest<ConnectionsResponse>('/api/platforms/connections', 'GET');

  if (!result.ok || !result.data?.connections) {
    console.log('[API] Failed to fetch connections:', result.error);
    return [];
  }

  // Find SLACK connection
  const slackConnection = result.data.connections.find(
    (c) => c.platform === 'SLACK' && c.status === 'CONNECTED'
  );

  if (!slackConnection) {
    console.log('[API] No connected Slack platform found');
    return [];
  }

  // Get workspaces from metadata
  const workspaces = slackConnection.metadata?.workspaces || [];
  console.log(`[API] Found ${workspaces.length} workspaces in backend`);
  return workspaces;
}

/**
 * Set up SSB redirect interception on a browser context
 * This prevents the "Open Slack?" protocol dialog
 */
async function setupSSBRedirectInterception(context: BrowserContext): Promise<void> {
  await context.route('**/ssb/redirect**', async (route: Route) => {
    const url = route.request().url();
    const urlObj = new URL(url);
    const workspaceDomain = urlObj.hostname;

    console.log(`[Playwright] Intercepting SSB redirect: ${url}`);
    console.log(`[Playwright] Redirecting to: https://${workspaceDomain}`);

    await route.fulfill({
      status: 200,
      contentType: 'text/html',
      body: `
        <!DOCTYPE html>
        <html>
          <head>
            <meta http-equiv="refresh" content="0;url=https://${workspaceDomain}">
            <script>window.location.href = 'https://${workspaceDomain}';</script>
          </head>
          <body><p>Redirecting to Slack web client...</p></body>
        </html>
      `,
    });
  });
}

/**
 * Get or create a visible Playwright browser context for login
 * This context shows a visible browser window so users can enter credentials
 */
async function getLoginContext(): Promise<BrowserContext> {
  // Close scrape context if open (only one persistent context can use the directory)
  if (scrapeContext) {
    console.log('[Playwright] Closing scrape context to open login context...');
    await scrapeContext.close().catch(() => {});
    scrapeContext = null;
  }

  if (loginContext) {
    return loginContext;
  }

  // Ensure cache directory exists
  if (!fs.existsSync(PLAYWRIGHT_CACHE_DIR)) {
    fs.mkdirSync(PLAYWRIGHT_CACHE_DIR, { recursive: true });
  }

  console.log('[Playwright] Launching visible browser context for login...');

  // Launch persistent context with visible browser for login
  loginContext = await chromium.launchPersistentContext(PLAYWRIGHT_CACHE_DIR, {
    headless: false,
    viewport: { width: 1280, height: 800 },
  });

  // Set up SSB redirect interception
  await setupSSBRedirectInterception(loginContext);

  console.log('[Playwright] Login context created');
  return loginContext;
}

/**
 * Get or create a headless Playwright browser context for scraping
 * This context runs in the background without showing a window
 */
async function getScrapeContext(): Promise<BrowserContext> {
  // Close login context if open (only one persistent context can use the directory)
  if (loginContext) {
    console.log('[Playwright] Closing login context to open scrape context...');
    await loginContext.close().catch(() => {});
    loginContext = null;
  }

  if (scrapeContext) {
    return scrapeContext;
  }

  // Ensure cache directory exists
  if (!fs.existsSync(PLAYWRIGHT_CACHE_DIR)) {
    fs.mkdirSync(PLAYWRIGHT_CACHE_DIR, { recursive: true });
  }

  console.log('[Playwright] Launching headless browser context for scraping...');

  // Launch persistent context in headless mode for scraping
  scrapeContext = await chromium.launchPersistentContext(PLAYWRIGHT_CACHE_DIR, {
    headless: true,
    viewport: { width: 1280, height: 800 },
  });

  // Set up SSB redirect interception
  await setupSSBRedirectInterception(scrapeContext);

  console.log('[Playwright] Scrape context created');
  return scrapeContext;
}

/**
 * Close the login context after login is complete
 */
async function closeLoginContext(): Promise<void> {
  if (loginContext) {
    console.log('[Playwright] Closing login context...');
    await loginContext.close().catch(() => {});
    loginContext = null;
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
app.whenReady().then(async () => {
  createWindow();

  // Start scheduler if user is already logged in
  const session = loadSession();
  if (session) {
    console.log('[Startup] Valid session found, starting scheduler...');
    startScraperScheduler();

    // Register/update desktop session on startup
    const sessionResult = await registerDesktopSession(session.token);
    if (!sessionResult.success) {
      console.warn('[Startup] Desktop session registration failed (non-blocking):', sessionResult.error);
    }
  } else {
    console.log('[Startup] No session found, scheduler will start after login');
  }
});

// Clean up Playwright contexts and scheduler when app quits
app.on('before-quit', async () => {
  // Stop the scraper scheduler
  stopScraperScheduler();

  if (loginContext) {
    console.log('[Playwright] Closing login context...');
    await loginContext.close().catch(() => {});
    loginContext = null;
  }
  if (scrapeContext) {
    console.log('[Playwright] Closing scrape context...');
    await scrapeContext.close().catch(() => {});
    scrapeContext = null;
  }
});

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
 * Then captures all workspace names and URLs
 *
 * Security: Requires valid login session before allowing Slack connection
 */
ipcMain.handle('open-slack-login', async () => {
  console.log('[Slack] Opening Slack login...');

  // Security check: Verify user is logged in before allowing Slack connection
  const session = loadSession();
  if (!session) {
    console.log('[Slack] Connection rejected - no valid session');
    return { success: false, error: 'Please log in first to connect your Slack account' };
  }

  try {
    // Use visible login context for user authentication
    const context = await getLoginContext();
    const page = await context.newPage();

    // Navigate to Slack signin
    await page.goto('https://slack.com/signin', { waitUntil: 'domcontentloaded' });
    console.log('[Slack] Navigated to signin page');

    // Wait for user to complete login (1 hour timeout)
    // The workspace selection screen has this specific selector
    console.log('[Slack] Waiting for user to complete login...');
    await page.waitForSelector(
      'div.p-refreshed_page__sub_heading.p-workspaces_view__subheading',
      {
        state: 'visible',
        timeout: 3600000, // 1 hour
      }
    );
    console.log('[Slack] User login complete, workspace selection screen detected');

    // Expand workspace list (click "Show more" button until it disappears)
    let expandButton = page.locator('button[data-qa="expand_workspace_list"]');
    let expandButtonVisible = await expandButton.isVisible().catch(() => false);

    while (expandButtonVisible) {
      console.log('[Slack] Expanding workspace list...');
      await expandButton.click();
      await new Promise((resolve) => setTimeout(resolve, 1500));

      expandButton = page.locator('button[data-qa="expand_workspace_list"]');
      expandButtonVisible = await expandButton.isVisible().catch(() => false);
    }
    console.log('[Slack] Workspace list fully expanded');

    // Find all workspace links
    const workspaceLinks = await page.locator('a[data-qa="current_workspaces_open_link"]').all();
    console.log(`[Slack] Found ${workspaceLinks.length} workspaces`);

    const capturedWorkspaces: WorkspaceInfo[] = [];

    // Process each workspace
    for (let i = 0; i < workspaceLinks.length; i++) {
      console.log(`[Slack] Processing workspace ${i + 1}/${workspaceLinks.length}...`);

      try {
        const workspaceLink = workspaceLinks[i];

        // Extract workspace name from the list
        const workspaceNameElement = workspaceLink.locator('.p-workspace_info__title').first();
        let workspaceName = await workspaceNameElement.textContent().catch(() => null);
        workspaceName = workspaceName || `Workspace ${i + 1}`;

        // Set up listener for new page before clicking
        const newPagePromise = new Promise<Page>((resolve) => {
          const pageHandler = (newPage: Page) => {
            context.off('page', pageHandler);
            resolve(newPage);
          };
          context.on('page', pageHandler);
        });

        // Click workspace link
        await workspaceLink.click();

        // Wait for new page with timeout
        const newPage = await Promise.race([
          newPagePromise,
          new Promise<never>((_, reject) =>
            setTimeout(() => reject(new Error('Timeout waiting for new page')), 10000)
          ),
        ]);

        console.log(`[Slack] New page opened for workspace: ${workspaceName}`);

        // Wait for page to load
        await newPage.waitForLoadState('domcontentloaded');
        await new Promise((resolve) => setTimeout(resolve, 2000));

        // Check if we hit an SSB redirect (fallback handling)
        let currentUrl = newPage.url();
        if (currentUrl.includes('slack.com/ssb/redirect')) {
          console.log('[Slack] Detected SSB redirect, navigating to workspace domain...');
          const urlObj = new URL(currentUrl);
          const workspaceDomain = urlObj.hostname;

          await newPage.goto(`https://${workspaceDomain}`, {
            waitUntil: 'domcontentloaded',
          });
          await new Promise((resolve) => setTimeout(resolve, 2000));
        }

        // Wait for redirect to app.slack.com/client
        const redirectStartTime = Date.now();
        const redirectTimeout = 30000;

        while (Date.now() - redirectStartTime < redirectTimeout) {
          await new Promise((resolve) => setTimeout(resolve, 500));
          currentUrl = newPage.url();

          if (currentUrl.includes('app.slack.com/client')) {
            console.log(`[Slack] Redirect complete: ${currentUrl}`);
            break;
          }
        }

        // Try to extract workspace name from the loaded page (more accurate)
        try {
          await newPage.waitForSelector('span.p-ia4_home_header_menu__team_name', {
            timeout: 10000,
            state: 'visible',
          });
          const extractedName = await newPage
            .locator('span.p-ia4_home_header_menu__team_name')
            .textContent();
          if (extractedName) {
            workspaceName = extractedName;
          }
        } catch {
          console.log(`[Slack] Using name from list: ${workspaceName}`);
        }

        // Capture workspace info
        capturedWorkspaces.push({
          name: workspaceName,
          url: currentUrl,
        });
        console.log(`[Slack] Captured workspace: ${workspaceName} -> ${currentUrl}`);

        // Close the workspace page
        await newPage.close();
        await new Promise((resolve) => setTimeout(resolve, 1000));

      } catch (error) {
        console.error(`[Slack] Error processing workspace ${i + 1}:`, error);
        // Continue to next workspace
      }
    }

    // Store workspaces in memory
    slackWorkspaces = capturedWorkspaces;

    // Store workspaces to backend API
    const apiResult = await storeWorkspacesToAPI(capturedWorkspaces);
    if (apiResult.error) {
      console.warn('[Slack] API storage failed, workspaces available in memory:', apiResult.error);
    }

    // Send results to renderer
    if (mainWindow) {
      mainWindow.webContents.send('slack-workspace-captured', capturedWorkspaces);
    }

    console.log(`[Slack] Capture complete. ${capturedWorkspaces.length} workspaces captured.`);

    // Close the signin page
    await page.close();

    // Close the login context - scraping will use headless context
    await closeLoginContext();

    return { success: true };

  } catch (error) {
    console.error('[Slack] Login/capture failed:', error);
    return { success: false, error: String(error) };
  }
});

/**
 * Get Slack workspaces from memory cache or API
 * Returns array of captured workspace info
 */
async function getSlackWorkspaces(): Promise<WorkspaceInfo[]> {
  // Try to load from memory first
  if (slackWorkspaces.length > 0) {
    console.log(`[Slack] Returning ${slackWorkspaces.length} workspaces from memory`);
    return slackWorkspaces;
  }

  // Fetch from API
  const apiWorkspaces = await fetchWorkspacesFromAPI();
  if (apiWorkspaces.length > 0) {
    slackWorkspaces = apiWorkspaces;
    console.log(`[Slack] Returning ${slackWorkspaces.length} workspaces from API`);
    return slackWorkspaces;
  }

  console.log('[Slack] No workspaces found');
  return [];
}

/**
 * Handle Slack workspace retrieval
 * Returns array of captured workspace info from API or memory cache
 */
ipcMain.handle('get-slack-workspaces', async () => {
  console.log('[Slack] Getting workspaces...');
  return getSlackWorkspaces();
});

/**
 * Search result item from Slack
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
 * Search result for a workspace
 */
interface SearchResult {
  workspaceName: string;
  workspaceUrl: string;
  results: SearchResultItem[];
}

/**
 * Search a single workspace for a keyword
 */
async function searchSlackWorkspace(
  workspace: WorkspaceInfo,
  keyword: string,
  lastScrapeDate?: number
): Promise<SearchResultItem[]> {
  const results: SearchResultItem[] = [];
  let page: Page | null = null;

  try {
    // Use headless scrape context for background scraping
    const context = await getScrapeContext();
    page = await context.newPage();

    console.log(`[Slack Search] Navigating to workspace: ${workspace.name}`);
    await page.goto(workspace.url, { waitUntil: 'domcontentloaded', timeout: 30000 });

    // Wait for Slack interface to load
    console.log('[Slack Search] Waiting for Slack interface...');
    await page.waitForSelector('button[data-qa="top_nav_search"]', {
      timeout: 15000,
      state: 'visible',
    });
    await new Promise((resolve) => setTimeout(resolve, 2000));

    // Check for and clear any previous search
    try {
      const clearButton = page.getByRole('button', { name: 'Clear search' });
      await clearButton.waitFor({ state: 'visible', timeout: 2000 });
      await clearButton.click();
      await new Promise((resolve) => setTimeout(resolve, 500));
      console.log('[Slack Search] Cleared previous search');
    } catch {
      // No previous search to clear
    }

    // Check if search modal is already open and close it
    const modalWrapper = page.locator('div.c-search_modal__wrapper');
    const closeButton = page.locator('button[data-qa="search_input_close"]');
    const isModalOpen = await modalWrapper.isVisible().catch(() => false) ||
                        await closeButton.isVisible().catch(() => false);

    if (isModalOpen) {
      console.log('[Slack Search] Closing existing search modal...');
      await closeButton.click();
      await modalWrapper.waitFor({ state: 'hidden', timeout: 5000 });
      await new Promise((resolve) => setTimeout(resolve, 500));
    }

    // Open search modal
    console.log('[Slack Search] Opening search modal...');
    await page.getByRole('button', { name: 'Search', exact: true }).click();
    await new Promise((resolve) => setTimeout(resolve, 1500));

    // Enter keyword
    console.log(`[Slack Search] Searching for keyword: "${keyword}"`);
    await page.getByRole('combobox', { name: 'Query' }).fill(keyword);
    await new Promise((resolve) => setTimeout(resolve, 1000));

    // Execute search (try clicking suggestion first, then fallback to Enter)
    try {
      await page.getByLabel(`Search for: ${keyword}`)
        .getByText(keyword)
        .click({ timeout: 3000 });
    } catch {
      console.log('[Slack Search] Using Enter key to execute search');
      await page.getByRole('combobox', { name: 'Query' }).press('Enter');
    }
    await new Promise((resolve) => setTimeout(resolve, 2000));

    // Wait for search results
    console.log('[Slack Search] Waiting for search results...');
    await page.waitForSelector('div[data-qa="search_view"]', {
      timeout: 15000,
      state: 'visible',
    });
    await new Promise((resolve) => setTimeout(resolve, 2000));

    // Check for empty state
    const emptyState = page.locator('div[data-qa="empty_state_wrapper"]');
    const isEmptyStateVisible = await emptyState.isVisible().catch(() => false);

    if (isEmptyStateVisible) {
      const emptyStateTitle = await emptyState.locator('.c-empty_state__title').textContent().catch(() => '');
      if (emptyStateTitle && emptyStateTitle.includes('Nothing turned up')) {
        console.log(`[Slack Search] No results found for keyword "${keyword}"`);
        // Page will be closed in finally block
        return [];
      }
    }

    // Set sort order to "Newest" for incremental scraping
    try {
      const sortButton = page.getByRole('button', { name: /Sort:/i });
      const isSortVisible = await sortButton.isVisible().catch(() => false);
      if (isSortVisible) {
        await sortButton.click();
        await new Promise((resolve) => setTimeout(resolve, 500));
        await page.getByText('Newest').click();
        await new Promise((resolve) => setTimeout(resolve, 500));
        console.log('[Slack Search] Sort order set to Newest');
      }
    } catch {
      console.log('[Slack Search] Could not change sort order, using default');
    }

    // Extract results
    const resultItems = await page.locator('div[role="listitem"].message__ziaO0').all();
    console.log(`[Slack Search] Found ${resultItems.length} results`);

    const maxResults = Math.min(10, resultItems.length);
    for (let j = 0; j < maxResults; j++) {
      try {
        const resultItem = resultItems[j];

        // Extract timestamp first to check if message is newer than last scrape
        const permalinkElement = resultItem.locator('a.c-timestamp').first();
        const timestampUnix = await permalinkElement.getAttribute('data-ts')
          .then((ts: string | null) => ts ? parseFloat(ts) : undefined)
          .catch((): undefined => undefined);

        // Stop collecting if message is older than last scrape date (incremental scraping)
        if (lastScrapeDate && timestampUnix && timestampUnix < lastScrapeDate) {
          console.log(`[Slack Search] Message older than last scrape, stopping (${timestampUnix} < ${lastScrapeDate})`);
          break;
        }

        // Expand all "Show more" buttons
        const showMoreButtons = resultItem.locator('button.c-search__expand')
          .filter({ hasText: /Show more/i });
        const showMoreCount = await showMoreButtons.count();

        for (let k = 0; k < showMoreCount; k++) {
          try {
            const button = showMoreButtons.nth(k);
            await button.scrollIntoViewIfNeeded();
            await button.click();
            await new Promise((resolve) => setTimeout(resolve, 300));
          } catch {
            // Continue if button click fails
          }
        }
        await new Promise((resolve) => setTimeout(resolve, 500));

        // Extract message text
        const messageElement = resultItem.locator('div[data-qa="message-text"]').first();
        const message = await messageElement.textContent().catch(() => '') || '';

        // Extract channel name
        const channelElement = resultItem.locator('span[data-qa="inline_channel_entity__name"]').first();
        const channel = await channelElement.textContent().catch(() => '') || 'Unknown';

        // Extract timestamp
        const timestampElement = resultItem.locator('span[data-qa="timestamp_label"]').first();
        const timestamp = await timestampElement.textContent().catch(() => '') || '';

        // Extract permalink - try multiple approaches
        let permalink = '';

        // First try: get href from the timestamp link element
        permalink = await permalinkElement.getAttribute('href').catch(() => '') || '';

        // Second try: if empty, look for any link with a Slack message URL pattern
        if (!permalink) {
          const archiveLink = resultItem.locator('a[href*="/archives/"]').first();
          permalink = await archiveLink.getAttribute('href').catch(() => '') || '';
        }

        // Third try: check for data-href attribute
        if (!permalink) {
          permalink = await permalinkElement.getAttribute('data-href').catch(() => '') || '';
        }

        // Log if we still couldn't find a permalink
        if (!permalink) {
          console.warn(`[Slack Search] Could not extract permalink for result ${j + 1}`);
        } else {
          console.log(`[Slack Search] Extracted permalink: ${permalink}`);
        }

        // Extract sender
        const senderElement = resultItem.locator('button[data-qa="message_sender_name"]').first();
        const sender = await senderElement.textContent().catch(() => undefined) ?? undefined;

        results.push({
          message,
          channel,
          timestamp,
          permalink,
          sender,
          timestampUnix,
        });

        console.log(`[Slack Search] Extracted result ${j + 1}: "${message.substring(0, 50)}..." from #${channel}, permalink: ${permalink ? 'yes' : 'NO'}`);
      } catch (error) {
        console.warn(`[Slack Search] Error extracting result ${j + 1}:`, error);
      }
    }

    console.log(`[Slack Search] Workspace ${workspace.name} complete: ${results.length} results`);
    return results;

  } catch (error) {
    console.error(`[Slack Search] Error searching workspace ${workspace.name}:`, error);
    return results;
  } finally {
    // Always close the page to prevent lingering browser windows
    if (page) {
      try {
        await page.close();
        console.log('[Slack Search] Page closed');
      } catch (closeError) {
        console.warn('[Slack Search] Failed to close page:', closeError);
      }
    }
  }
}

/**
 * Handle Slack keyword search
 * Searches all connected workspaces for matching messages
 */
ipcMain.handle('search-slack-keywords', async (_event, keyword: string, lastScrapeDate?: number) => {
  console.log(`[Slack Search] Searching for keyword: "${keyword}", since: ${lastScrapeDate || 'beginning'}`);

  const session = loadSession();
  if (!session) {
    console.log('[Slack Search] No session, cannot search');
    return [];
  }

  const workspaces = await getSlackWorkspaces();
  if (workspaces.length === 0) {
    console.log('[Slack Search] No workspaces connected');
    return [];
  }

  const searchResults: SearchResult[] = [];

  for (const workspace of workspaces) {
    console.log(`[Slack Search] Searching workspace: ${workspace.name}`);
    const results = await searchSlackWorkspace(workspace, keyword, lastScrapeDate);

    searchResults.push({
      workspaceName: workspace.name,
      workspaceUrl: workspace.url,
      results,
    });
  }

  const totalResults = searchResults.reduce((sum, r) => sum + r.results.length, 0);
  console.log(`[Slack Search] Search complete: ${totalResults} total results from ${workspaces.length} workspace(s)`);

  return searchResults;
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
// Manual Scrape IPC Handler
// =============================================================================

/**
 * Scrape result for a single workspace
 */
interface WorkspaceScrapeResult {
  workspaceName: string;
  workspaceUrl: string;
  success: boolean;
  messagesFound: number;
  leadsCreated: number;
  keywordsSearched: string[];
  error?: string;
  scrapeLogId?: string;
}

/**
 * Fetch user's keywords from the API
 */
async function fetchUserKeywords(session: SessionData): Promise<string[]> {
  try {
    console.log('[Keywords] Fetching user keywords from API...');

    const response = await fetch(`${WEB_APP_URL}/api/keywords`, {
      method: 'GET',
      headers: {
        Cookie: session.token,
      },
    });

    if (!response.ok) {
      console.error('[Keywords] Failed to fetch keywords:', response.status);
      return [];
    }

    const data = (await response.json()) as { all_keywords?: string[] };
    const keywords = data.all_keywords || [];

    console.log(`[Keywords] Fetched ${keywords.length} keywords:`, keywords);
    return keywords;
  } catch (error) {
    console.error('[Keywords] Error fetching keywords:', error);
    return [];
  }
}

/**
 * Scrape a single workspace for all keywords and log results to the API
 */
async function scrapeWorkspace(
  workspace: WorkspaceInfo,
  keywords: string[],
  session: SessionData
): Promise<WorkspaceScrapeResult> {
  const result: WorkspaceScrapeResult = {
    workspaceName: workspace.name,
    workspaceUrl: workspace.url,
    success: false,
    messagesFound: 0,
    leadsCreated: 0,
    keywordsSearched: [],
  };

  try {
    console.log(`[Scrape] Starting scrape for workspace: ${workspace.name}`);
    console.log(`[Scrape] Will search for ${keywords.length} keywords`);

    // Create scrape log via API
    // First, we need to get the connection ID for this workspace
    const connectionsResponse = await fetch(`${WEB_APP_URL}/api/platforms/connections`, {
      method: 'GET',
      headers: {
        Cookie: session.token,
      },
    });

    if (!connectionsResponse.ok) {
      throw new Error('Failed to get platform connections');
    }

    const connectionsData = (await connectionsResponse.json()) as {
      connections: Array<{
        id: string;
        platform: string;
        metadata?: { workspaces?: Array<{ url: string }> };
        last_checked_at?: string;
      }>;
    };

    // Find the Slack connection that contains this workspace
    let slackConnection = connectionsData.connections.find(
      (conn) =>
        conn.platform === 'SLACK' &&
        conn.metadata?.workspaces?.some(
          (w: { url: string }) => w.url === workspace.url
        )
    );

    if (!slackConnection) {
      // Try to find any Slack connection
      slackConnection = connectionsData.connections.find(
        (conn) => conn.platform === 'SLACK'
      );
      if (!slackConnection) {
        throw new Error('No Slack connection found');
      }
    }

    result.scrapeLogId = slackConnection.id;

    // Get last_checked_at for incremental scraping
    const lastCheckedAt = slackConnection.last_checked_at;
    const lastScrapeDate = lastCheckedAt ? new Date(lastCheckedAt).getTime() / 1000 : undefined;

    if (lastScrapeDate) {
      console.log(`[Scrape] Incremental scrape - ignoring messages before ${new Date(lastScrapeDate * 1000).toISOString()}`);
    } else {
      console.log('[Scrape] Full scrape - no previous last_checked_at found');
    }

    // Create scrape log
    const createLogResponse = await fetch(`${WEB_APP_URL}/api/scrape-logs`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Cookie: session.token,
      },
      body: JSON.stringify({
        connectionId: result.scrapeLogId,
        status: 'RUNNING',
      }),
    });

    let logId: string | undefined;
    if (createLogResponse.ok) {
      const logData = (await createLogResponse.json()) as { log: { id: string } };
      logId = logData.log.id;
    }

    // Search for each keyword sequentially using real Playwright scraping
    for (const keyword of keywords) {
      console.log(`[Scrape] Searching workspace ${workspace.name} for keyword: "${keyword}"`);
      result.keywordsSearched.push(keyword);

      try {
        // Use real Playwright search with incremental scraping
        const searchResults = await searchSlackWorkspace(workspace, keyword, lastScrapeDate);
        const messagesForKeyword = searchResults.length;
        result.messagesFound += messagesForKeyword;

        console.log(`[Scrape] Found ${messagesForKeyword} new messages for keyword "${keyword}"`);

        // Create leads for each matching message
        for (const searchResult of searchResults) {
          try {
            const createLeadResponse = await fetch(`${WEB_APP_URL}/api/leads`, {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
                Cookie: session.token,
              },
              body: JSON.stringify({
                content: searchResult.message,
                keywords: [keyword],
                platform: 'SLACK',
                channelName: searchResult.channel,
                senderName: searchResult.sender || 'Unknown User',
                sourceUrl: searchResult.permalink,
              }),
            });

            if (createLeadResponse.ok) {
              result.leadsCreated++;
              console.log(`[Scrape] Created lead from message in #${searchResult.channel}`);
            } else {
              const errorData = await createLeadResponse.json().catch(() => ({}));
              console.warn(`[Scrape] Failed to create lead: ${JSON.stringify(errorData)}`);
            }
          } catch (leadError) {
            console.warn(`[Scrape] Error creating lead:`, leadError);
          }
        }

        console.log(
          `[Scrape] Keyword "${keyword}": Found ${messagesForKeyword} messages, created ${result.leadsCreated} leads so far`
        );
      } catch (searchError) {
        console.error(`[Scrape] Error searching for keyword "${keyword}":`, searchError);
      }
    }

    result.success = true;

    console.log(
      `[Scrape] Workspace ${workspace.name} complete: ` +
        `${result.messagesFound} total messages, ${result.leadsCreated} total leads ` +
        `from ${result.keywordsSearched.length} keywords`
    );

    // Update scrape log with completion
    if (logId) {
      await fetch(`${WEB_APP_URL}/api/scrape-logs/${logId}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          Cookie: session.token,
        },
        body: JSON.stringify({
          action: 'complete',
          messagesFound: result.messagesFound,
          leadsCreated: result.leadsCreated,
          metadata: {
            workspaceName: workspace.name,
            workspaceUrl: workspace.url,
            keywordsSearched: result.keywordsSearched,
            keywordCount: result.keywordsSearched.length,
          },
        }),
      });
    }

    // Update platform connection with successful scrape timestamp
    try {
      await fetch(`${WEB_APP_URL}/api/scraper/success`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Cookie: session.token,
        },
        body: JSON.stringify({
          platform: 'SLACK',
        }),
      });
      console.log('[Scrape] Updated platform connection last_checked_at');
    } catch (updateError) {
      console.warn('[Scrape] Failed to update platform connection:', updateError);
    }

    return result;
  } catch (error) {
    result.error = error instanceof Error ? error.message : String(error);
    console.error(`[Scrape] Error scraping workspace ${workspace.name}:`, result.error);

    // Update platform connection with error (updates last_error and last_checked_at)
    try {
      await fetch(`${WEB_APP_URL}/api/scraper/error`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Cookie: session.token,
        },
        body: JSON.stringify({
          platform: 'SLACK',
          error: result.error,
        }),
      });
      console.log('[Scrape] Updated platform connection with error');
    } catch (updateError) {
      console.warn('[Scrape] Failed to update platform connection with error:', updateError);
    }

    // Try to update scrape log with failure
    if (result.scrapeLogId) {
      try {
        const createLogResponse = await fetch(`${WEB_APP_URL}/api/scrape-logs`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Cookie: session.token,
          },
          body: JSON.stringify({
            connectionId: result.scrapeLogId,
            status: 'RUNNING',
          }),
        });

        if (createLogResponse.ok) {
          const logData = (await createLogResponse.json()) as { log: { id: string } };
          await fetch(`${WEB_APP_URL}/api/scrape-logs/${logData.log.id}`, {
            method: 'PATCH',
            headers: {
              'Content-Type': 'application/json',
              Cookie: session.token,
            },
            body: JSON.stringify({
              action: 'fail',
              errorMessage: result.error,
              metadata: {
                workspaceName: workspace.name,
                workspaceUrl: workspace.url,
                keywordsSearched: result.keywordsSearched,
              },
            }),
          });
        }
      } catch {
        // Ignore errors when logging failures
      }
    }

    return result;
  }
}

/**
 * Handle manual scrape request
 * Triggers an immediate scrape of all connected workspaces for all keywords
 */
ipcMain.handle('manual-scrape', async () => {
  console.log('[Scrape] Manual scrape requested...');

  // Check session first
  const session = loadSession();
  if (!session) {
    console.log('[Scrape] Manual scrape rejected - no valid session');
    return { success: false, error: 'Please log in first' };
  }

  try {
    // Fetch user's keywords first
    const keywords = await fetchUserKeywords(session);
    if (keywords.length === 0) {
      console.log('[Scrape] Manual scrape rejected - no keywords configured');
      return { success: false, error: 'No keywords configured. Please add keywords in the web app first.' };
    }

    console.log(`[Scrape] Will search for ${keywords.length} keywords: ${keywords.join(', ')}`);

    // Get connected workspaces
    const workspaces = await getSlackWorkspaces();
    if (workspaces.length === 0) {
      console.log('[Scrape] Manual scrape rejected - no connected workspaces');
      return { success: false, error: 'No workspaces connected. Please connect Slack first.' };
    }

    console.log(`[Scrape] Starting manual scrape of ${workspaces.length} workspace(s)...`);

    // Emit progress update to renderer
    if (mainWindow) {
      mainWindow.webContents.send('search-progress', {
        current: 0,
        total: workspaces.length,
      });
    }

    // Scrape each workspace individually with all keywords
    const results: WorkspaceScrapeResult[] = [];
    for (let i = 0; i < workspaces.length; i++) {
      const workspace = workspaces[i];
      const result = await scrapeWorkspace(workspace, keywords, session);
      results.push(result);

      // Emit progress update
      if (mainWindow) {
        mainWindow.webContents.send('search-progress', {
          current: i + 1,
          total: workspaces.length,
        });
      }
    }

    // Calculate totals
    const successCount = results.filter((r) => r.success).length;
    const totalLeads = results.reduce((sum, r) => sum + r.leadsCreated, 0);
    const totalMessages = results.reduce((sum, r) => sum + r.messagesFound, 0);
    const allKeywordsSearched = results.flatMap((r) => r.keywordsSearched);
    const uniqueKeywords = [...new Set(allKeywordsSearched)];

    console.log(
      `[Scrape] Manual scrape completed. ${successCount}/${workspaces.length} workspaces, ` +
        `${totalMessages} messages, ${totalLeads} leads from ${uniqueKeywords.length} keywords`
    );

    return {
      success: successCount > 0,
      leadsFound: totalLeads,
      messagesFound: totalMessages,
      workspacesScraped: successCount,
      totalWorkspaces: workspaces.length,
      keywordsSearched: uniqueKeywords,
      results,
    };
  } catch (error) {
    console.error('[Scrape] Manual scrape error:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'An unexpected error occurred',
    };
  }
});

// =============================================================================
// Scheduler Functions
// =============================================================================

/**
 * Start the 24-hour scraper scheduler
 * Called when user logs in or app starts with valid session
 */
function startScraperScheduler(): void {
  // Stop any existing scheduler
  stopScraperScheduler();

  const session = loadSession();
  if (!session) {
    console.log('[Scheduler] Cannot start - no valid session');
    return;
  }

  console.log('[Scheduler] Starting 24-hour scraper scheduler...');
  console.log(`[Scheduler] Interval: ${SCRAPE_INTERVAL_MS}ms (${SCRAPE_INTERVAL_MS / 1000 / 60 / 60} hours)`);

  scraperScheduler = new ScraperScheduler({
    apiBaseUrl: WEB_APP_URL,
    authToken: session.token,
    platform: 'SLACK',
    intervalMs: SCRAPE_INTERVAL_MS,
    scrapeFunction: async () => {
      console.log('[Scheduler] Running scheduled scrape...');

      // Fetch user's keywords
      const currentSession = loadSession();
      if (!currentSession) {
        console.log('[Scheduler] No session, skipping scrape');
        return { success: false, leadsFound: 0, error: 'Not logged in' };
      }

      const keywords = await fetchUserKeywords(currentSession);
      if (keywords.length === 0) {
        console.log('[Scheduler] No keywords configured, skipping scrape');
        return { success: true, leadsFound: 0, error: undefined };
      }

      console.log(`[Scheduler] Will search for ${keywords.length} keywords`);

      // Get workspaces
      const workspaces = await getSlackWorkspaces();
      if (workspaces.length === 0) {
        console.log('[Scheduler] No workspaces connected, skipping scrape');
        return { success: true, leadsFound: 0, error: undefined };
      }

      console.log(`[Scheduler] Scraping ${workspaces.length} workspace(s) for ${keywords.length} keywords...`);

      try {
        // Scrape each workspace with all keywords
        let totalLeads = 0;
        let totalMessages = 0;
        let successCount = 0;

        for (const workspace of workspaces) {
          const result = await scrapeWorkspace(workspace, keywords, currentSession);
          if (result.success) {
            successCount++;
            totalLeads += result.leadsCreated;
            totalMessages += result.messagesFound;
          }
        }

        console.log(
          `[Scheduler] Scheduled scrape completed. ${successCount}/${workspaces.length} workspaces, ` +
            `${totalMessages} messages, ${totalLeads} leads`
        );

        return { success: successCount > 0, leadsFound: totalLeads };
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : String(error);
        console.error('[Scheduler] Scheduled scrape error:', errorMessage);
        return { success: false, leadsFound: 0, error: errorMessage };
      }
    },
    onStateChange: (state: ScraperSchedulerState) => {
      console.log('[Scheduler] State changed:', {
        isRunning: state.isRunning,
        nextRun: state.nextScheduledRun?.toISOString(),
        lastSuccess: state.lastRunResult?.success,
      });
    },
  });

  scraperScheduler.start();
}

/**
 * Stop the scraper scheduler
 * Called when user logs out or app quits
 */
function stopScraperScheduler(): void {
  if (scraperScheduler) {
    console.log('[Scheduler] Stopping scraper scheduler...');
    scraperScheduler.stop();
    scraperScheduler = null;
  }
}

/**
 * Get current scheduler state
 */
function getSchedulerState(): ScraperSchedulerState | null {
  return scraperScheduler?.getState() || null;
}

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

/**
 * Detect the operating system type
 */
function detectOsType(): 'Windows' | 'Mac' | 'Linux' {
  switch (process.platform) {
    case 'win32':
      return 'Windows';
    case 'darwin':
      return 'Mac';
    default:
      return 'Linux';
  }
}

/**
 * Generate a unique device label for this desktop session
 */
function generateDeviceLabel(): string {
  const osType = detectOsType();
  const hostname = os.hostname() || 'Unknown';
  return `${osType} - ${hostname}`;
}

/**
 * Track an onboarding event via the web app API
 */
async function trackOnboardingEvent(
  authToken: string,
  event: string,
  metadata: Record<string, unknown> = {}
): Promise<{ success: boolean; error?: string }> {
  try {
    console.log(`[Onboarding] Tracking event: ${event}`);

    const response = await fetch(`${WEB_APP_URL}/api/onboarding/events`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Cookie': authToken,
      },
      body: JSON.stringify({
        event,
        metadata,
      }),
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({})) as { error?: string };
      console.error(`[Onboarding] Failed to track event ${event}:`, errorData.error || response.status);
      return { success: false, error: errorData.error || 'Failed to track event' };
    }

    console.log(`[Onboarding] Event ${event} tracked successfully`);
    return { success: true };
  } catch (error) {
    console.error(`[Onboarding] Error tracking event ${event}:`, error);
    return { success: false, error: String(error) };
  }
}

/**
 * Check if DESKTOP_INSTALLED event has already been tracked for this user
 */
async function hasDesktopInstalledEvent(authToken: string): Promise<boolean> {
  try {
    const response = await fetch(`${WEB_APP_URL}/api/onboarding/events`, {
      method: 'GET',
      headers: {
        'Cookie': authToken,
      },
    });

    if (!response.ok) {
      return false;
    }

    const data = await response.json() as { events?: Array<{ event: string }> };
    const events = data.events || [];
    return events.some((e) => e.event === 'DESKTOP_INSTALLED');
  } catch (error) {
    console.error('[Onboarding] Error checking DESKTOP_INSTALLED event:', error);
    return false;
  }
}

/**
 * Register desktop session with the backend
 * Creates a new session entry in desktop_app_sessions table
 */
async function registerDesktopSession(authToken: string): Promise<{ success: boolean; sessionId?: string; error?: string }> {
  try {
    const deviceLabel = generateDeviceLabel();
    const osType = detectOsType();

    console.log(`[Session] Registering desktop session: ${deviceLabel} (${osType})`);

    const response = await fetch(`${WEB_APP_URL}/api/desktop/session`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Cookie': authToken,
      },
      body: JSON.stringify({
        device_label: deviceLabel,
        os_type: osType,
      }),
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({})) as { error?: string };
      console.error('[Session] Failed to register session:', errorData.error || response.status);
      return { success: false, error: errorData.error || 'Failed to register session' };
    }

    const data = await response.json() as { session: { id: string } };
    console.log('[Session] Desktop session registered successfully:', data.session.id);
    return { success: true, sessionId: data.session.id };
  } catch (error) {
    console.error('[Session] Error registering desktop session:', error);
    return { success: false, error: String(error) };
  }
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

    // Extract auth cookie from set-cookie header
    // The header format is: "sb-127-auth-token=base64value; Path=/; ..."
    const setCookieHeader = response.headers.get('set-cookie') || '';
    console.log('Raw set-cookie header length:', setCookieHeader.length);

    let authCookie = '';

    // Parse the set-cookie header to extract the auth token cookie
    // Try splitting by comma first, but be careful about commas in cookie values
    const cookieParts = setCookieHeader.split(/,(?=[^;]*=)/);

    for (const part of cookieParts) {
      const trimmed = part.trim();
      // Look for the Supabase auth cookie (contains "sb-" and "auth-token")
      if (trimmed.includes('sb-') && trimmed.includes('auth-token')) {
        // Extract just the cookie name=value part (before any semicolon)
        const cookiePart = trimmed.split(';')[0].trim();
        authCookie = cookiePart;
        console.log('Found auth cookie:', authCookie.substring(0, 60) + '...');
        break;
      }
    }

    // Fallback: try to find any cookie that looks like a session token
    if (!authCookie) {
      // Try to extract the first name=value pair that looks like a token
      const match = setCookieHeader.match(/([a-zA-Z0-9_-]+=[\w%+/=-]+)/);
      if (match) {
        authCookie = match[1];
        console.log('Using fallback cookie extraction:', authCookie.substring(0, 60) + '...');
      }
    }

    if (!authCookie) {
      console.warn('No auth cookie found in response');
      return { success: false, error: 'No authentication cookie received from server' };
    }

    console.log('Storing auth cookie:', authCookie.substring(0, 50) + '...');
    storeSession({ token: authCookie, user });

    console.log('Login successful for:', user.email);

    // Register the desktop session in the database
    const sessionResult = await registerDesktopSession(authCookie);
    if (!sessionResult.success) {
      console.warn('[Login] Desktop session registration failed (non-blocking):', sessionResult.error);
      // Note: We don't fail login if session registration fails - it's a secondary concern
    }

    // Track DESKTOP_INSTALLED event on first login only
    const alreadyInstalled = await hasDesktopInstalledEvent(authCookie);
    if (!alreadyInstalled) {
      const osType = detectOsType();
      const deviceLabel = generateDeviceLabel();
      await trackOnboardingEvent(authCookie, 'DESKTOP_INSTALLED', {
        os_type: osType,
        device_label: deviceLabel,
        app_version: app.getVersion(),
        timestamp: new Date().toISOString(),
      });
    } else {
      console.log('[Login] DESKTOP_INSTALLED event already tracked, skipping');
    }

    // Start the 24-hour scraper scheduler
    startScraperScheduler();

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

  // Stop the scraper scheduler
  stopScraperScheduler();

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
        'Cookie': session.token,
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
    // Server returned non-OK response, session is invalid
    console.log('Session validation failed, clearing invalid session');
    clearSession();
    return { isLoggedIn: false };
  } catch (error) {
    console.log('Session validation error, clearing session:', error);
    clearSession();
    return { isLoggedIn: false };
  }
});

/**
 * Get web app URL (for opening in browser)
 */
ipcMain.handle('get-web-app-url', async () => {
  return WEB_APP_URL;
});

/**
 * Get platform connection info including last_checked_at
 */
ipcMain.handle('get-platform-connection-info', async (_event, platform: string) => {
  const session = loadSession();
  if (!session) {
    return null;
  }

  try {
    const response = await fetch(`${WEB_APP_URL}/api/platforms/connections`, {
      method: 'GET',
      headers: {
        Cookie: session.token,
      },
    });

    if (!response.ok) {
      return null;
    }

    const data = (await response.json()) as {
      connections: Array<{
        id: string;
        platform: string;
        status: string;
        metadata?: { workspaces?: Array<{ url: string }> };
        last_checked_at?: string;
      }>;
    };

    const connection = data.connections.find(
      (c) => c.platform === platform.toUpperCase()
    );

    if (!connection) {
      return null;
    }

    return {
      platform: connection.platform,
      status: connection.status,
      workspaceCount: connection.metadata?.workspaces?.length || 0,
      lastCheckedAt: connection.last_checked_at || null,
    };
  } catch (error) {
    console.error('Failed to get platform connection info:', error);
    return null;
  }
});

/**
 * Get scheduler state (for UI display)
 */
ipcMain.handle('get-scheduler-state', async () => {
  const state = getSchedulerState();
  if (!state) {
    return {
      isRunning: false,
      nextScheduledRun: null,
      lastRunResult: null,
      intervalMs: SCRAPE_INTERVAL_MS,
    };
  }
  return {
    ...state,
    nextScheduledRun: state.nextScheduledRun?.toISOString() || null,
    lastRunResult: state.lastRunResult ? {
      ...state.lastRunResult,
      startTime: state.lastRunResult.startTime.toISOString(),
      endTime: state.lastRunResult.endTime.toISOString(),
    } : null,
  };
});
