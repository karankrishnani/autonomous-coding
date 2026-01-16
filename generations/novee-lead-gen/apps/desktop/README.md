# Novee Desktop App

Electron desktop application for the Novee Lead Generation Platform. This app handles secure, user-consented scraping of Slack workspaces to discover lead opportunities.

## Features

- **Slack Integration**: Connect and monitor multiple Slack workspaces
- **Automated Scraping**: 24-hour scheduled scraping for keywords
- **Manual Scrape**: Trigger immediate scrapes on demand
- **Secure Authentication**: Login synced with web app backend
- **Session Persistence**: Maintains Slack login across app restarts

## Prerequisites

- Node.js 18+
- pnpm 8+
- The web app running at `http://localhost:3000` (or configured `NOVEE_WEB_URL`)

## Development

### Setup

```bash
# Install dependencies (from root)
pnpm install

# Build the desktop app
pnpm --filter @novee/desktop build

# Run in development mode
pnpm --filter @novee/desktop dev

# Start the built app
pnpm --filter @novee/desktop start
```

### Environment Variables

Create a `.env` file in `apps/desktop/`:

```env
# Web app URL (defaults to http://localhost:3000)
NOVEE_WEB_URL=http://localhost:3000
```

## Testing

The desktop app uses Playwright for Electron automation testing.

### Running Tests

```bash
# Run all tests (headless)
pnpm --filter @novee/desktop test

# Run tests with visible browser
pnpm --filter @novee/desktop test:headed

# Run tests in debug mode
pnpm --filter @novee/desktop test:debug

# Or from root:
pnpm desktop:test
pnpm desktop:test:headed
pnpm desktop:test:debug
```

### Test Structure

```
apps/desktop/
├── tests/
│   ├── electron-helper.ts    # Test utilities for Electron
│   ├── app-launch.spec.ts    # Basic app launch tests
│   └── ...                   # Additional test files
├── playwright.config.ts      # Playwright configuration
└── test-results/             # Test artifacts (screenshots, videos)
```

### Writing Tests

Use the `electron-helper.ts` utilities to interact with the app:

```typescript
import { test, expect } from '@playwright/test';
import {
  launchElectronApp,
  closeElectronApp,
  waitForAppReady,
  login,
  takeScreenshot,
} from './electron-helper';

test('should login successfully', async () => {
  const { app, window } = await launchElectronApp();

  try {
    await waitForAppReady(window);
    await login(window, 'test@example.com', 'password123');

    // Verify login succeeded
    const isOnDashboard = await isVisible(window, '.workspace-list');
    expect(isOnDashboard).toBe(true);

    await takeScreenshot(window, 'after-login');
  } finally {
    await closeElectronApp(app);
  }
});
```

### Available Test Helpers

| Function | Description |
|----------|-------------|
| `launchElectronApp(options)` | Launch the Electron app for testing |
| `closeElectronApp(app)` | Close the app gracefully |
| `waitForAppReady(window)` | Wait for login or dashboard screen |
| `login(window, email, password)` | Login with credentials |
| `logout(window)` | Logout from the app |
| `takeScreenshot(window, name)` | Save a screenshot |
| `isVisible(window, selector)` | Check element visibility |
| `clickElement(window, selector)` | Wait for and click element |
| `fillField(window, selector, value)` | Fill form input |
| `getWindowTitle(window)` | Get window title |
| `getAppVersion(app)` | Get app version |
| `getAppName(app)` | Get app name |
| `evaluate(window, fn)` | Evaluate JS in renderer |

### Test Configuration

The `playwright.config.ts` file configures:

- Test timeout: 2 minutes (for Electron startup)
- Single worker (to avoid Electron conflicts)
- Screenshots on failure
- Video recording on retry
- HTML test report generation

## Building

```bash
# Build for current platform
pnpm --filter @novee/desktop dist

# Build for specific platform
pnpm --filter @novee/desktop dist --mac
pnpm --filter @novee/desktop dist --win
pnpm --filter @novee/desktop dist --linux
```

Build outputs are placed in `apps/desktop/release/`.

## Architecture

```
apps/desktop/
├── src/
│   ├── main.ts           # Main process (IPC, Playwright)
│   ├── preload.ts        # Context bridge for renderer
│   ├── scraper.ts        # Scraper scheduler and utilities
│   └── renderer/         # Renderer process (UI)
│       ├── index.html    # App HTML
│       ├── renderer.ts   # UI logic
│       └── styles.css    # Styles
├── dist/                 # Built JavaScript files
├── tests/                # Playwright Electron tests
└── playwright-cache/     # Persistent browser sessions
```

### Security

- Node integration disabled in renderer
- Context isolation enabled
- IPC validation on all handlers
- Secure session storage using Electron's safeStorage API
- No credentials stored in code

## Troubleshooting

### App won't start
1. Ensure the app is built: `pnpm --filter @novee/desktop build`
2. Check for TypeScript errors: `pnpm --filter @novee/desktop typecheck`

### Tests fail to launch
1. Ensure Playwright browsers are installed: `npx playwright install`
2. Build the app first: `pnpm --filter @novee/desktop build`
3. Check that `dist/main.js` exists

### Slack login issues
1. Clear Playwright cache: Delete `apps/desktop/playwright-cache/`
2. Restart the app and try logging into Slack again

### Session not persisting
1. Check that `safeStorage` is available on your system
2. Look for session file in app's user data directory
