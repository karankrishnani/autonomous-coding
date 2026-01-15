# Slack Workspace Capture Specification

## Overview

This document specifies how to automatically capture all Slack workspace names and URLs associated with a user's email address. The implementation uses Playwright to automate browser interactions and intercept network requests to bypass protocol dialogs.

## Key Challenge: SSB Redirect Protocol Dialogs

The primary challenge encountered was that clicking on workspace links triggers Slack's SSB (Slack Standalone Browser) redirect flow, which attempts to open the Slack desktop app via a `slack://` protocol handler. This triggers a native browser dialog ("Open Slack?") that blocks automation.

### Solution: Route Interception and Workspace Domain Navigation

Instead of trying to suppress or dismiss the protocol dialog, we intercept the SSB redirect requests and redirect directly to the workspace domain. Navigating to the workspace domain (e.g., `workspace.slack.com`) automatically redirects to the web client without triggering protocol dialogs.

## Architecture

### High-Level Flow

1. **Launch Browser Context** - Create a persistent browser context with route interception
2. **Navigate to Slack Signin** - Go to `https://slack.com/signin`
3. **Wait for Workspace Selection** - Wait for user to complete login and workspace selection screen to appear
4. **Expand Workspace List** - Click "Show more workspaces" button if present (may need to click multiple times)
5. **Iterate Through Workspaces** - For each workspace link:
   - Extract workspace name
   - Click the link (opens in new tab)
   - Wait for new page/tab to be created
   - If SSB redirect is detected, navigate directly to workspace domain
   - Wait for redirect to `app.slack.com/client` URL
   - Extract workspace name from page (fallback to extracted name)
   - Capture final URL
   - Close the tab
6. **Collect Results** - Store all captured workspaces and send to renderer

### Data Structures

```typescript
// Workspace data structure
type Workspace = {
  name: string;
  url: string; // Format: https://app.slack.com/client/{WORKSPACE_ID}/{CHANNEL_ID}
};

// Stored as array
let slackWorkspaces: Workspace[] = [];
```

## Implementation Details

### 1. Route Interception Setup

Set up route interception **before** navigating to Slack signin page. This ensures all SSB redirect requests are caught.

```typescript
await currentBrowser.route("**/ssb/redirect**", async (route: any) => {
  const url = route.request().url();
  const urlObj = new URL(url);
  const workspaceDomain = urlObj.hostname; // e.g., "workspace.slack.com"
  
  // Redirect to workspace domain instead of allowing SSB redirect
  await route.fulfill({
    status: 200,
    contentType: 'text/html',
    body: `
      <!DOCTYPE html>
      <html>
        <head>
          <meta http-equiv="refresh" content="0;url=https://${workspaceDomain}">
          <script>
            window.location.href = 'https://${workspaceDomain}';
          </script>
        </head>
        <body>
          <p>Redirecting to Slack web client...</p>
        </body>
      </html>
    `,
  });
});
```

**Key Points:**
- Intercept pattern: `**/ssb/redirect**`
- Extract workspace domain from the request URL's hostname
- Redirect to `https://{workspaceDomain}` (not `app.slack.com/client`)
- Workspace domain automatically redirects to web client

### 2. Workspace Selection Screen Detection

Wait for the workspace selection screen using a specific selector:

```typescript
await page.waitForSelector(
  "div.p-refreshed_page__sub_heading.p-workspaces_view__subheading",
  {
    state: "visible",
    timeout: 3600000, // 1 hour timeout for user to complete login
  }
);
```

### 3. Expanding Workspace List

The workspace list may have a "Show more workspaces" button that needs to be clicked multiple times:

```typescript
let expandButton = page.locator('button[data-qa="expand_workspace_list"]');
let expandButtonVisible = await expandButton.isVisible().catch(() => false);

while (expandButtonVisible) {
  await expandButton.click();
  await new Promise((resolve) => setTimeout(resolve, 1500));
  
  // Re-check for more expand buttons
  expandButton = page.locator('button[data-qa="expand_workspace_list"]');
  expandButtonVisible = await expandButton.isVisible().catch(() => false);
}
```

**Key Points:**
- Button selector: `button[data-qa="expand_workspace_list"]`
- May need to click multiple times (loop until button disappears)
- Wait 1.5 seconds between clicks for DOM to update

### 4. Finding All Workspace Links

After expanding, find all workspace links:

```typescript
const workspaceLinks = await page.locator('a[data-qa="current_workspaces_open_link"]').all();
```

**Selector:** `a[data-qa="current_workspaces_open_link"]`

### 5. Processing Each Workspace

For each workspace link:

#### Extract Workspace Name
```typescript
const workspaceNameElement = workspaceLink.locator('.p-workspace_info__title').first();
const workspaceName = await workspaceNameElement.textContent().catch(() => `Workspace ${i + 1}`);
```

#### Click and Wait for New Tab
```typescript
const newPagePromise = new Promise<any>((resolve) => {
  const pageHandler = async (newPage: any) => {
    currentBrowser.off("page", pageHandler);
    resolve(newPage);
  };
  currentBrowser.on("page", pageHandler);
});

await workspaceLink.click();
const newPage = await Promise.race([
  newPagePromise,
  new Promise<any>((_, reject) => 
    setTimeout(() => reject(new Error("Timeout waiting for new page")), 10000)
  )
]) as any;
```

**Key Points:**
- Use browser context's `page` event to detect new tabs
- Set up listener before clicking
- Remove listener immediately after page is detected
- Use Promise.race with timeout for safety

#### Handle SSB Redirect (Fallback)

Even with route interception, sometimes pages may still load the SSB redirect URL. Handle this case:

```typescript
if (currentUrl.includes("slack.com/ssb/redirect")) {
  const urlObj = new URL(currentUrl);
  const workspaceDomain = urlObj.hostname;
  
  // Navigate directly to workspace domain
  await newPage.goto(`https://${workspaceDomain}`, { 
    waitUntil: "domcontentloaded" 
  });
  await new Promise((resolve) => setTimeout(resolve, 2000));
}
```

#### Wait for Final URL

Wait for redirect to complete and capture the final `app.slack.com/client` URL:

```typescript
const redirectStartTime = Date.now();
const redirectTimeout = 30000;

while (Date.now() - redirectStartTime < redirectTimeout) {
  await new Promise((resolve) => setTimeout(resolve, 500));
  
  currentUrl = newPage.url();
  if (currentUrl.includes("app.slack.com/client")) {
    log("info", "Redirect completed to:", currentUrl);
    break;
  }
}
```

#### Extract Workspace Name from Page (Optional)

Try to extract workspace name from the loaded page as a more accurate source:

```typescript
let finalWorkspaceName = workspaceName || `Workspace ${i + 1}`;
try {
  await newPage.waitForSelector("span.p-ia4_home_header_menu__team_name", {
    timeout: 10000,
    state: "visible",
  });
  const extractedName = await newPage
    .locator("span.p-ia4_home_header_menu__team_name")
    .textContent();
  if (extractedName) {
    finalWorkspaceName = extractedName;
  }
} catch (error) {
  log("warn", "Could not extract workspace name, using fallback:", error);
}
```

**Selector:** `span.p-ia4_home_header_menu__team_name`

#### Capture and Close

```typescript
capturedWorkspaces.push({ 
  name: finalWorkspaceName, 
  url: currentUrl 
});
await newPage.close();
```

### 6. Error Handling

- Wrap each workspace processing in try-catch
- Continue to next workspace if one fails
- Log errors but don't stop the entire process
- Collect partial results

## Selectors Reference

| Element | Selector |
|---------|----------|
| Workspace selection screen | `div.p-refreshed_page__sub_heading.p-workspaces_view__subheading` |
| Expand workspace list button | `button[data-qa="expand_workspace_list"]` |
| Workspace link | `a[data-qa="current_workspaces_open_link"]` |
| Workspace name (in list) | `.p-workspace_info__title` |
| Workspace name (in app) | `span.p-ia4_home_header_menu__team_name` |
| Browser link (not used) | `a[data-qa="ssb_redirect_open_in_browser"]` |

## URL Patterns

- **SSB Redirect:** `https://{workspace}.slack.com/ssb/redirect?...`
- **Workspace Domain:** `https://{workspace}.slack.com`
- **Final URL:** `https://app.slack.com/client/{WORKSPACE_ID}/{CHANNEL_ID}`

## What Didn't Work (Lessons Learned)

### Attempted Solutions That Failed

1. **Launch Argument:** `--disable-features=ExternalProtocolDialog`
   - Did not suppress the protocol dialog

2. **Route Interception for `slack://` Protocol:**
   - Tried to intercept and abort `slack://` protocol requests
   - Did not prevent the dialog from appearing

3. **Chrome Settings Navigation:**
   - Attempted to navigate to `chrome://settings/handlers` and disable protocol handlers
   - Chrome internal pages are difficult to automate
   - Settings changes may not apply immediately

4. **Dialog Handlers:**
   - Tried using Playwright's `page.on("dialog")` to dismiss dialogs
   - Dialogs appear before handlers can be set up
   - Global dialog handlers on browser context didn't catch the protocol dialog

### What Worked

**Route Interception + Workspace Domain Navigation:**
- Intercept `**/ssb/redirect**` requests
- Redirect to workspace domain instead
- Workspace domain automatically redirects to web client
- No protocol dialogs triggered

## IPC Communication

### Main Process → Renderer

Send captured workspaces array:
```typescript
mainWindow.webContents.send("slack-workspace-captured", capturedWorkspaces);
```

### Renderer Interface

```typescript
interface IElectronAPI {
  openSlackLogin: () => void;
  getSlackWorkspace: () => Promise<Array<{ name: string; url: string }>>;
  onSlackWorkspaceCaptured: (
    callback: (workspaces: Array<{ name: string; url: string }>) => void
  ) => void;
}
```

## Testing Considerations

1. **Multiple Workspace Counts:** Test with 1, 5, 10+ workspaces
2. **Workspace List Expansion:** Test accounts that require expansion
3. **Error Scenarios:** Test when workspace fails to load, redirect fails
4. **Timeout Handling:** Ensure reasonable timeouts for each step
5. **Partial Results:** Verify that partial results are collected if some workspaces fail

## Performance Notes

- Process workspaces sequentially to avoid race conditions
- Each workspace takes approximately 5-10 seconds
- Total time scales linearly with number of workspaces
- Consider adding progress feedback for users with many workspaces

## Security Considerations

- Uses persistent browser context (maintains login state)
- No credentials stored in code
- User must manually complete login
- Workspace URLs contain sensitive workspace IDs

## Future Improvements

1. **Parallel Processing:** Process multiple workspaces in parallel (with careful tab management)
2. **Progress Reporting:** Send progress updates to renderer during processing
3. **Retry Logic:** Add retry logic for failed workspace captures
4. **Caching:** Cache workspace URLs to avoid re-capturing on subsequent runs

