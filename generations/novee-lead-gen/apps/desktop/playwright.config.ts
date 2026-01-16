/**
 * Playwright Configuration for Electron Desktop App Testing
 *
 * This configuration is used to run automated tests against the Novee desktop app.
 * It uses Playwright's Electron support to launch and interact with the app.
 */

import { defineConfig } from '@playwright/test';
import path from 'path';

export default defineConfig({
  // Test directory
  testDir: './tests',

  // Test file matching pattern
  testMatch: '**/*.spec.ts',

  // Maximum time per test (2 minutes for Electron startup + test)
  timeout: 120000,

  // Number of retries for flaky tests
  retries: process.env.CI ? 2 : 0,

  // Maximum parallel workers (1 for Electron to avoid conflicts)
  workers: 1,

  // Reporter configuration
  reporter: [
    ['list'],
    ['html', { open: 'never' }],
  ],

  // Global setup/teardown
  use: {
    // Trace on first retry
    trace: 'on-first-retry',

    // Screenshot on failure
    screenshot: 'only-on-failure',

    // Video on retry
    video: 'on-first-retry',
  },

  // Output directory for test artifacts
  outputDir: './test-results',

  // Project-specific configuration for Electron
  projects: [
    {
      name: 'electron',
      use: {
        // Electron-specific configuration is handled in the test helper
      },
    },
  ],
});
