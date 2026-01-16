/**
 * Electron App Launch Tests
 *
 * Tests that verify the desktop app can be launched and basic interactions work.
 */

import { test, expect } from '@playwright/test';
import {
  launchElectronApp,
  closeElectronApp,
  waitForAppReady,
  takeScreenshot,
  getWindowTitle,
  getAppVersion,
  getAppName,
  isVisible,
  ElectronTestContext,
} from './electron-helper';

// Test context shared across tests in this file
let context: ElectronTestContext;

test.describe('Electron App Launch', () => {
  // Launch app before all tests
  test.beforeAll(async () => {
    context = await launchElectronApp({
      timeout: 60000,
      env: {
        NODE_ENV: 'test',
      },
    });
  });

  // Close app after all tests
  test.afterAll(async () => {
    if (context?.app) {
      await closeElectronApp(context.app);
    }
  });

  test('should launch the Electron app successfully', async () => {
    expect(context.app).toBeDefined();
    expect(context.window).toBeDefined();
  });

  test('should have a main window', async () => {
    const { window } = context;

    // Window should exist and be visible
    const isWindowVisible = await window.isVisible('body');
    expect(isWindowVisible).toBe(true);
  });

  test('should get window title', async () => {
    const { window } = context;

    const title = await getWindowTitle(window);
    console.log('Window title:', title);

    // Title should be defined (may vary based on app state)
    expect(title).toBeDefined();
  });

  test('should get app version and name', async () => {
    const { app } = context;

    const version = await getAppVersion(app);
    const name = await getAppName(app);

    console.log('App name:', name);
    console.log('App version:', version);

    expect(name).toBe('Novee');
    expect(version).toMatch(/^\d+\.\d+\.\d+$/);
  });

  test('should show login form when not authenticated', async () => {
    const { window } = context;

    // Wait for app to be ready
    const screen = await waitForAppReady(window, 15000);

    // Should show login screen (since we're not authenticated in test)
    expect(screen).toBe('login');
  });

  test('should have login form elements visible', async () => {
    const { window } = context;

    // Check for email input
    const hasEmailInput = await isVisible(window, 'input[type="email"], input[placeholder*="email"]');
    expect(hasEmailInput).toBe(true);

    // Check for password input
    const hasPasswordInput = await isVisible(window, 'input[type="password"]');
    expect(hasPasswordInput).toBe(true);

    // Check for login button
    const hasLoginButton = await isVisible(window, 'button:has-text("Log In"), button:has-text("Login")');
    expect(hasLoginButton).toBe(true);
  });

  test('should be able to take a screenshot', async () => {
    const { window } = context;

    const screenshotPath = await takeScreenshot(window, 'app-launch-test');
    expect(screenshotPath).toContain('.png');
  });
});

test.describe('Electron App Interactions', () => {
  let ctx: ElectronTestContext;

  test.beforeAll(async () => {
    ctx = await launchElectronApp();
    await waitForAppReady(ctx.window);
  });

  test.afterAll(async () => {
    if (ctx?.app) {
      await closeElectronApp(ctx.app);
    }
  });

  test('should show validation error for empty email', async () => {
    const { window } = ctx;

    // Try to submit without filling fields
    const loginButton = window.locator('button:has-text("Log In"), button:has-text("Login")');
    await loginButton.click();

    // Should show some form of validation or stay on login page
    const isStillOnLogin = await isVisible(window, 'input[type="email"], input[placeholder*="email"]');
    expect(isStillOnLogin).toBe(true);
  });

  test('should allow typing in form fields', async () => {
    const { window } = ctx;

    // Type in email field
    const emailInput = window.locator('input[type="email"], input[placeholder*="email"]');
    await emailInput.fill('test@example.com');

    // Verify value was entered
    const emailValue = await emailInput.inputValue();
    expect(emailValue).toBe('test@example.com');

    // Type in password field
    const passwordInput = window.locator('input[type="password"]');
    await passwordInput.fill('testpassword123');

    // Verify password was entered (can't check value directly, check field is filled)
    const passwordValue = await passwordInput.inputValue();
    expect(passwordValue.length).toBeGreaterThan(0);
  });

  test('should show error for invalid credentials', async () => {
    const { window } = ctx;

    // Fill with invalid credentials
    const emailInput = window.locator('input[type="email"], input[placeholder*="email"]');
    const passwordInput = window.locator('input[type="password"]');
    const loginButton = window.locator('button:has-text("Log In"), button:has-text("Login")');

    await emailInput.fill('invalid@example.com');
    await passwordInput.fill('wrongpassword');
    await loginButton.click();

    // Wait for response (either error or redirect)
    await window.waitForTimeout(2000);

    // Should still be on login page (invalid credentials)
    const isStillOnLogin = await isVisible(window, 'input[type="email"]');
    expect(isStillOnLogin).toBe(true);

    // Take screenshot of error state
    await takeScreenshot(window, 'login-error');
  });
});
