/**
 * Electron Test Helper
 *
 * This module provides utilities for launching and interacting with the
 * Novee desktop app using Playwright's Electron support.
 */

import { _electron as electron, ElectronApplication, Page } from 'playwright';
import path from 'path';
import fs from 'fs';

// Path to the built Electron app
const ELECTRON_APP_PATH = path.resolve(__dirname, '..');
const MAIN_JS_PATH = path.join(ELECTRON_APP_PATH, 'dist', 'main.js');

/**
 * Interface for Electron app test context
 */
export interface ElectronTestContext {
  app: ElectronApplication;
  window: Page;
}

/**
 * Options for launching the Electron app
 */
export interface LaunchOptions {
  /** Environment variables to pass to the app */
  env?: Record<string, string>;
  /** Additional command line arguments */
  args?: string[];
  /** Timeout for app launch (default: 30000ms) */
  timeout?: number;
  /** Path to custom Electron executable (defaults to node_modules) */
  electronPath?: string;
}

/**
 * Launch the Novee desktop app for testing
 *
 * @param options - Launch options
 * @returns ElectronTestContext with app and window handles
 *
 * @example
 * ```typescript
 * const { app, window } = await launchElectronApp();
 * await window.click('button:has-text("Log In")');
 * await app.close();
 * ```
 */
export async function launchElectronApp(
  options: LaunchOptions = {}
): Promise<ElectronTestContext> {
  const {
    env = {},
    args = [],
    timeout = 30000,
    electronPath,
  } = options;

  // Verify the built app exists
  if (!fs.existsSync(MAIN_JS_PATH)) {
    throw new Error(
      `Electron app not built. Run 'pnpm build' first.\n` +
      `Expected: ${MAIN_JS_PATH}`
    );
  }

  // Determine Electron executable path
  const electronBinary = electronPath || require('electron') as string;

  console.log('[ElectronHelper] Launching Electron app...');
  console.log('[ElectronHelper] Main JS path:', MAIN_JS_PATH);

  // Launch the Electron app
  const app = await electron.launch({
    args: [MAIN_JS_PATH, ...args],
    executablePath: electronBinary,
    timeout,
    env: {
      ...process.env,
      NODE_ENV: 'test',
      // Disable auto-scheduler in tests
      DISABLE_SCRAPER_SCHEDULER: 'true',
      // Override web app URL for testing
      NOVEE_WEB_URL: process.env.NOVEE_WEB_URL || 'http://localhost:3000',
      ...env,
    },
  });

  console.log('[ElectronHelper] App launched, waiting for main window...');

  // Wait for the first window to appear
  const window = await app.firstWindow();

  console.log('[ElectronHelper] Main window obtained');
  console.log('[ElectronHelper] Window URL:', await window.url());

  return { app, window };
}

/**
 * Close the Electron app gracefully
 *
 * @param app - ElectronApplication instance
 */
export async function closeElectronApp(app: ElectronApplication): Promise<void> {
  console.log('[ElectronHelper] Closing Electron app...');

  try {
    await app.close();
    console.log('[ElectronHelper] App closed successfully');
  } catch (error) {
    console.error('[ElectronHelper] Error closing app:', error);
    throw error;
  }
}

/**
 * Wait for the app to be fully loaded (login or dashboard screen)
 *
 * @param window - Page instance
 * @param timeout - Maximum wait time in ms (default: 15000)
 */
export async function waitForAppReady(
  window: Page,
  timeout: number = 15000
): Promise<'login' | 'dashboard'> {
  console.log('[ElectronHelper] Waiting for app to be ready...');

  // Wait for either login form or dashboard to appear
  const loginSelector = 'input[type="email"], input[placeholder*="email"]';
  const dashboardSelector = '[data-testid="platform-list"], .workspace-list';

  try {
    const result = await Promise.race([
      window.waitForSelector(loginSelector, { timeout }).then(() => 'login' as const),
      window.waitForSelector(dashboardSelector, { timeout }).then(() => 'dashboard' as const),
    ]);

    console.log(`[ElectronHelper] App ready - showing: ${result}`);
    return result;
  } catch {
    // If neither appears, check if loading
    const pageContent = await window.content();
    if (pageContent.includes('Loading') || pageContent.includes('Checking session')) {
      console.log('[ElectronHelper] App is still loading...');
    }
    throw new Error('App did not load within timeout');
  }
}

/**
 * Login to the app using test credentials
 *
 * @param window - Page instance
 * @param email - Test user email
 * @param password - Test user password
 */
export async function login(
  window: Page,
  email: string,
  password: string
): Promise<void> {
  console.log(`[ElectronHelper] Logging in as: ${email}`);

  // Fill email
  const emailInput = window.locator('input[type="email"], input[placeholder*="email"]');
  await emailInput.fill(email);

  // Fill password
  const passwordInput = window.locator('input[type="password"], input[placeholder*="password"]');
  await passwordInput.fill(password);

  // Click login button
  const loginButton = window.locator('button:has-text("Log In"), button:has-text("Login")');
  await loginButton.click();

  // Wait for navigation away from login
  await window.waitForSelector('[data-testid="platform-list"], .workspace-list', {
    timeout: 10000,
  });

  console.log('[ElectronHelper] Login successful');
}

/**
 * Logout from the app
 *
 * @param window - Page instance
 */
export async function logout(window: Page): Promise<void> {
  console.log('[ElectronHelper] Logging out...');

  // Click logout button
  const logoutButton = window.locator('button:has-text("Log Out"), button:has-text("Logout")');
  await logoutButton.click();

  // Wait for login screen
  await window.waitForSelector('input[type="email"]', { timeout: 5000 });

  console.log('[ElectronHelper] Logout successful');
}

/**
 * Take a screenshot of the current window state
 *
 * @param window - Page instance
 * @param name - Screenshot name (without extension)
 * @returns Path to the saved screenshot
 */
export async function takeScreenshot(
  window: Page,
  name: string
): Promise<string> {
  const screenshotPath = path.join(
    ELECTRON_APP_PATH,
    'test-results',
    `${name}-${Date.now()}.png`
  );

  // Ensure directory exists
  fs.mkdirSync(path.dirname(screenshotPath), { recursive: true });

  await window.screenshot({ path: screenshotPath });
  console.log(`[ElectronHelper] Screenshot saved: ${screenshotPath}`);

  return screenshotPath;
}

/**
 * Get text content from an element
 *
 * @param window - Page instance
 * @param selector - CSS selector
 * @returns Text content of the element
 */
export async function getTextContent(
  window: Page,
  selector: string
): Promise<string | null> {
  const element = window.locator(selector);
  return element.textContent();
}

/**
 * Check if an element is visible
 *
 * @param window - Page instance
 * @param selector - CSS selector
 * @returns True if element is visible
 */
export async function isVisible(
  window: Page,
  selector: string
): Promise<boolean> {
  const element = window.locator(selector);
  return element.isVisible();
}

/**
 * Wait for and click an element
 *
 * @param window - Page instance
 * @param selector - CSS selector
 * @param timeout - Maximum wait time
 */
export async function clickElement(
  window: Page,
  selector: string,
  timeout: number = 5000
): Promise<void> {
  const element = window.locator(selector);
  await element.waitFor({ state: 'visible', timeout });
  await element.click();
}

/**
 * Fill a form field
 *
 * @param window - Page instance
 * @param selector - CSS selector for input
 * @param value - Value to fill
 */
export async function fillField(
  window: Page,
  selector: string,
  value: string
): Promise<void> {
  const element = window.locator(selector);
  await element.fill(value);
}

/**
 * Get the window title
 *
 * @param window - Page instance
 * @returns Window title
 */
export async function getWindowTitle(window: Page): Promise<string> {
  return window.title();
}

/**
 * Evaluate JavaScript in the renderer process
 *
 * @param window - Page instance
 * @param fn - Function to evaluate
 * @returns Result of the evaluation
 */
export async function evaluate<T>(
  window: Page,
  fn: () => T | Promise<T>
): Promise<T> {
  return window.evaluate(fn);
}

/**
 * Get the Electron app version
 *
 * @param app - ElectronApplication instance
 * @returns App version string
 */
export async function getAppVersion(app: ElectronApplication): Promise<string> {
  return app.evaluate(async ({ app }) => app.getVersion());
}

/**
 * Get the app name
 *
 * @param app - ElectronApplication instance
 * @returns App name string
 */
export async function getAppName(app: ElectronApplication): Promise<string> {
  return app.evaluate(async ({ app }) => app.getName());
}
