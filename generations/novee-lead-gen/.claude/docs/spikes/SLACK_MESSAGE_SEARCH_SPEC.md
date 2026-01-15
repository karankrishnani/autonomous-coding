# Slack Message Search Specification

## Overview

This document specifies how to automatically search for messages across multiple Slack workspaces using browser automation. The implementation uses Playwright to interact with Slack's web interface, search for keywords, and extract message results with full text content.

The system supports incremental scraping: it tracks the last scrape date/time and only collects messages posted after that date. This enables efficient incremental data collection without re-processing old messages.

## Key Challenges and Solutions

### Challenge 1: Search Modal State Management

**Problem:** The search modal can be left open from previous interactions, preventing new searches from working properly.

**Solution:** Always check if the search modal is open before attempting to interact with it. If open, close it first using the close button.

```typescript
const modalWrapper = page.locator('div.c-search_modal__wrapper');
const closeButton = page.locator('button[data-qa="search_input_close"]');
const isModalOpen = await modalWrapper.isVisible().catch(() => false) || 
                    await closeButton.isVisible().catch(() => false);

if (isModalOpen) {
  await closeButton.click();
  await modalWrapper.waitFor({ state: "hidden", timeout: 5000 });
}
```

### Challenge 2: Search Input is Contenteditable, Not Standard Input

**Problem:** Slack's search input is a contenteditable `div` element, not a standard HTML `<input>` element. Standard `.fill()` methods may not work reliably.

**Solution:** Use Playwright's role-based selectors which handle contenteditable elements properly:

```typescript
await page.getByRole('button', { name: 'Search', exact: true }).click();
await page.getByRole('combobox', { name: 'Query' }).fill(keywords);
```

### Challenge 3: Clearing Previous Searches

**Problem:** Previous search queries may remain in the search input, interfering with new searches.

**Solution:** Check for and click the "Clear search" button before entering new keywords:

```typescript
try {
  const clearButton = page.getByRole('button', { name: 'Clear search' });
  await clearButton.waitFor({ state: 'visible', timeout: 2000 });
  await clearButton.click();
  await new Promise((resolve) => setTimeout(resolve, 500));
} catch (error) {
  // No previous search to clear
}
```

### Challenge 4: Message Text Truncation

**Problem:** Search results show truncated messages with "Show more" buttons that must be clicked to see the full text.

**Solution:** Before extracting message text, find and click all "Show more" buttons in each result:

```typescript
const showMoreButtons = resultItem.locator('button.c-search__expand')
  .filter({ hasText: /Show more/i });
const showMoreCount = await showMoreButtons.count();

for (let k = 0; k < showMoreCount; k++) {
  const button = showMoreButtons.nth(k);
  await button.scrollIntoViewIfNeeded();
  await button.click();
  await new Promise((resolve) => setTimeout(resolve, 300));
}
```

### Challenge 5: Pointer Event Interception

**Problem:** When the search modal is open, other elements may intercept pointer events, causing clicks to fail.

**Solution:** Ensure the modal is properly closed before attempting to click the search button. Use role-based selectors which are more resilient to DOM changes.

### Challenge 6: Empty State Detection

**Problem:** When no search results are found, Slack displays an empty state message. Attempting to extract results from an empty state causes unnecessary processing.

**Solution:** Check for the empty state wrapper before attempting to extract results:

```typescript
const emptyState = page.locator('div[data-qa="empty_state_wrapper"]');
const isEmptyStateVisible = await emptyState.isVisible().catch(() => false);

if (isEmptyStateVisible) {
  const emptyStateTitle = await emptyState.locator('.c-empty_state__title').textContent().catch(() => "");
  if (emptyStateTitle && emptyStateTitle.includes("Nothing turned up")) {
    // Skip result extraction, return empty results
    return [];
  }
}
```

### Challenge 7: Incremental Scraping and Early Stopping

**Problem:** For incremental scraping, we need to only collect messages newer than the last scrape date. Processing all results and filtering client-side is inefficient, especially when most messages are older than the last scrape.

**Solution:** Extract Unix timestamps from message permalinks (`data-ts` attribute) and stop collecting results early when encountering messages older than the last scrape date. This requires results to be sorted by date (newest first). The system tracks the last scrape timestamp and passes it to the search handler to enable early stopping.

## Architecture

### High-Level Flow

1. **Initialize Search** - Launch browser context (reuse persistent context pattern)
2. **Get Last Scrape Date** - Retrieve the last scrape timestamp (stored from previous runs)
3. **Iterate Through Workspaces** - For each captured workspace:
   - Navigate to workspace URL
   - Wait for Slack interface to load
   - Handle search modal state (close if open)
   - Clear any previous searches
   - Open search modal
   - Enter keywords and execute search
   - Wait for results to load
   - Check for empty state (if found, skip to next workspace)
   - Set sort order to "Newest" (only if results exist)
   - Extract message data (stop early when encountering messages older than last scrape date)
   - Expand all truncated messages
   - Close workspace page
4. **Collect Results** - Return results grouped by workspace
5. **Update Last Scrape Date** - Store the current scrape timestamp for the next incremental run

### Data Structures

```typescript
type SearchResultItem = {
  message: string;      // Full message text (after expanding)
  channel: string;      // Channel name (e.g., "articles", "tools")
  timestamp: string;    // Human-readable timestamp
  permalink: string;    // Direct link to message
  sender?: string;      // Optional sender name
  timestampUnix?: number; // Unix timestamp in seconds (from data-ts attribute)
};

type SearchResult = {
  workspaceName: string;
  workspaceUrl: string;
  results: SearchResultItem[];
};

// Return type
type SearchResults = SearchResult[];
```

## Implementation Details

### 1. Search Modal Interaction

#### Opening the Search Modal

```typescript
// Use role-based selector for reliability
await page.getByRole('button', { name: 'Search', exact: true }).click();
await new Promise((resolve) => setTimeout(resolve, 1500));
```

#### Entering Keywords

```typescript
// The combobox is a contenteditable div, role selector handles it correctly
await page.getByRole('combobox', { name: 'Query' }).fill(keywords);
await new Promise((resolve) => setTimeout(resolve, 1000));
```

#### Executing Search

Two approaches work:

**Option 1: Click search suggestion (preferred)**
```typescript
try {
  await page.getByLabel(`Search for: ${keywords}`)
    .getByText(keywords)
    .click({ timeout: 3000 });
} catch (error) {
  // Fallback to Enter key
  await page.getByRole('combobox', { name: 'Query' }).press("Enter");
}
```

**Option 2: Press Enter**
```typescript
await page.getByRole('combobox', { name: 'Query' }).press("Enter");
```

### 2. Waiting for Search Results

```typescript
// Wait for search results container
await page.waitForSelector('div[data-qa="search_view"]', {
  timeout: 15000,
  state: "visible",
});

// Wait for results list
await page.waitForSelector('div[role="list"][aria-label*="Message results"]', {
  timeout: 10000,
  state: "visible",
}).catch(() => {
  // May have no results
});
```

### 3. Expanding Truncated Messages

**Critical:** Always expand "Show more" buttons before extracting message text to get the complete message.

```typescript
for (let j = 0; j < Math.min(5, resultItems.length); j++) {
  const resultItem = resultItems[j];
  
  // Find all "Show more" buttons in this result
  const showMoreButtons = resultItem.locator('button.c-search__expand')
    .filter({ hasText: /Show more/i });
  const showMoreCount = await showMoreButtons.count();
  
  // Click each "Show more" button
  for (let k = 0; k < showMoreCount; k++) {
    const button = showMoreButtons.nth(k);
    await button.scrollIntoViewIfNeeded();
    await button.click();
    await new Promise((resolve) => setTimeout(resolve, 300));
  }
  
  // Wait for expansion to complete
  await new Promise((resolve) => setTimeout(resolve, 500));
  
  // Now extract the full message text
  const message = await resultItem.locator('div[data-qa="message-text"]')
    .first()
    .textContent();
}
```

### 4. Extracting Message Data

```typescript
// Message text (after expansion)
const messageElement = resultItem.locator('div[data-qa="message-text"]').first();
const message = await messageElement.textContent().catch(() => "") || "";

// Channel name
const channelElement = resultItem.locator('span[data-qa="inline_channel_entity__name"]').first();
const channel = await channelElement.textContent().catch(() => "") || "";

// Timestamp
const timestampElement = resultItem.locator('span[data-qa="timestamp_label"]').first();
const timestamp = await timestampElement.textContent().catch(() => "") || "";

// Permalink and Unix timestamp (from timestamp link)
const permalinkElement = resultItem.locator('a.c-timestamp').first();
const permalink = await permalinkElement.getAttribute("href").catch(() => "") || "";
const timestampUnix = await permalinkElement.getAttribute("data-ts")
  .then((ts: string | null) => ts ? parseFloat(ts) : undefined)
  .catch((): undefined => undefined);

// Sender (optional)
const senderElement = resultItem.locator('button[data-qa="message_sender_name"]').first();
const sender = await senderElement.textContent().catch((): string | undefined => undefined);
```

## DOM Selectors Reference

### Search Interface

| Element | Selector | Notes |
|---------|----------|-------|
| Search button | `button[data-qa="top_nav_search"]` or `getByRole('button', { name: 'Search', exact: true })` | Use role selector for reliability |
| Search modal wrapper | `div.c-search_modal__wrapper` | Check if modal is open |
| Close button | `button[data-qa="search_input_close"]` | Close modal if already open |
| Clear search button | `getByRole('button', { name: 'Clear search' })` | Clear previous search |
| Search input (combobox) | `getByRole('combobox', { name: 'Query' })` | Contenteditable div, not standard input |
| Search suggestion | `getByLabel(\`Search for: ${keywords}\`).getByText(keywords)` | Click to execute search |

### Search Results

| Element | Selector | Notes |
|---------|----------|-------|
| Results container | `div[data-qa="search_view"]` | Main container for search view |
| Results list | `div[role="list"][aria-label*="Message results"]` | List of message results |
| Result item | `div[role="listitem"].message__ziaO0` | Individual message result |
| Message text | `div[data-qa="message-text"]` | Full message content (after expansion) |
| Channel name | `span[data-qa="inline_channel_entity__name"]` | Within `span[data-qa="search_result_channel_name"]` |
| Timestamp | `span[data-qa="timestamp_label"]` | Within `a.c-timestamp` |
| Permalink | `a.c-timestamp[href]` | Direct link to message |
| Unix timestamp | `a.c-timestamp[data-ts]` | Unix timestamp in seconds (for date filtering) |
| Sender | `button[data-qa="message_sender_name"]` | Optional, may not be present |
| Show more button | `button.c-search__expand` with text "Show more" | Must click to expand truncated messages |
| Empty state | `div[data-qa="empty_state_wrapper"]` | Check before extracting results |
| Sort button | `getByRole('button', { name: 'Sort: Most relevant (default)' })` | Change sort order |
| Newest option | `getByText('Newest')` | Select "Newest" sort option |

### Message Expansion

| Element | Selector | Notes |
|---------|----------|-------|
| Show more button | `button.c-search__expand` | Filter by text containing "Show more" |
| Expand ellipsis | `span.c-search__expand_ellipsis` | Contains "... Show more" text |

## Complete Workflow

### Step-by-Step Process

1. **Launch Browser Context**
   ```typescript
   const browser = await chromium.launchPersistentContext(cacheDir, {
     headless: false,
   });
   ```

2. **For Each Workspace:**
   
   a. **Navigate to Workspace**
   ```typescript
   const page = await browser.newPage();
   await page.goto(workspace.url, { waitUntil: "domcontentloaded", timeout: 30000 });
   ```

   b. **Wait for Interface**
   ```typescript
   await page.waitForSelector('button[data-qa="top_nav_search"]', {
     timeout: 15000,
     state: "visible",
   });
   ```

   c. **Check and Clear Previous Search**
   ```typescript
   try {
     const clearButton = page.getByRole('button', { name: 'Clear search' });
     await clearButton.waitFor({ state: 'visible', timeout: 2000 });
     await clearButton.click();
     await new Promise((resolve) => setTimeout(resolve, 500));
   } catch (error) {
     // No previous search
   }
   ```

   d. **Handle Modal State**
   ```typescript
   const modalWrapper = page.locator('div.c-search_modal__wrapper');
   const closeButton = page.locator('button[data-qa="search_input_close"]');
   const isModalOpen = await modalWrapper.isVisible().catch(() => false);
   
   if (isModalOpen) {
     await closeButton.click();
     await modalWrapper.waitFor({ state: "hidden", timeout: 5000 });
     await new Promise((resolve) => setTimeout(resolve, 500));
   }
   ```

   e. **Open Search Modal**
   ```typescript
   await page.getByRole('button', { name: 'Search', exact: true }).click();
   await new Promise((resolve) => setTimeout(resolve, 1500));
   ```

   f. **Enter Keywords and Search**
   ```typescript
   await page.getByRole('combobox', { name: 'Query' }).fill(keywords);
   await new Promise((resolve) => setTimeout(resolve, 1000));
   
   try {
     await page.getByLabel(`Search for: ${keywords}`)
       .getByText(keywords)
       .click({ timeout: 3000 });
   } catch (error) {
     await page.getByRole('combobox', { name: 'Query' }).press("Enter");
   }
   await new Promise((resolve) => setTimeout(resolve, 2000));
   ```

   g. **Wait for Results**
   ```typescript
   await page.waitForSelector('div[data-qa="search_view"]', {
     timeout: 15000,
     state: "visible",
   });
   await new Promise((resolve) => setTimeout(resolve, 2000));
   ```

   h. **Check for Empty State**
   ```typescript
   const emptyState = page.locator('div[data-qa="empty_state_wrapper"]');
   const isEmptyStateVisible = await emptyState.isVisible().catch(() => false);
   
   if (isEmptyStateVisible) {
     const emptyStateTitle = await emptyState.locator('.c-empty_state__title').textContent().catch(() => "");
     if (emptyStateTitle && emptyStateTitle.includes("Nothing turned up")) {
       // Skip to next workspace
       continue;
     }
   }
   ```

   i. **Set Sort Order to "Newest"**
   ```typescript
   // Only set sort order if results exist
   try {
     await page.getByRole('button', { name: 'Sort: Most relevant (default)' }).click();
     await new Promise((resolve) => setTimeout(resolve, 500));
     
     await page.getByText('Newest').click();
     await new Promise((resolve) => setTimeout(resolve, 500));
   } catch (error) {
     // Continue with default sort if unable to change
   }
   ```

   j. **Extract Results with Incremental Scraping**
   ```typescript
   const resultItems = await page.locator('div[role="listitem"].message__ziaO0').all();
   
   for (let j = 0; j < Math.min(5, resultItems.length); j++) {
     const resultItem = resultItems[j];
     
     // Extract timestamp first to check if message is newer than last scrape
     const permalinkElement = resultItem.locator('a.c-timestamp').first();
     const timestampUnix = await permalinkElement.getAttribute("data-ts")
       .then((ts: string | null) => ts ? parseFloat(ts) : undefined)
       .catch((): undefined => undefined);
     
     // Stop collecting if message is older than last scrape date (incremental scraping)
     if (lastScrapeDate && timestampUnix && timestampUnix < lastScrapeDate) {
       break; // Results are sorted newest first, so all remaining are older than last scrape
     }
     
     // Expand all "Show more" buttons
     const showMoreButtons = resultItem.locator('button.c-search__expand')
       .filter({ hasText: /Show more/i });
     const showMoreCount = await showMoreButtons.count();
     
     for (let k = 0; k < showMoreCount; k++) {
       const button = showMoreButtons.nth(k);
       await button.scrollIntoViewIfNeeded();
       await button.click();
       await new Promise((resolve) => setTimeout(resolve, 300));
     }
     await new Promise((resolve) => setTimeout(resolve, 500));
     
     // Extract message data
     const message = await resultItem.locator('div[data-qa="message-text"]')
       .first()
       .textContent();
     // ... extract other fields including timestampUnix
   }
   ```

   k. **Close Page**
   ```typescript
   await page.close();
   await new Promise((resolve) => setTimeout(resolve, 1000));
   ```

3. **Cleanup**
   ```typescript
   await browser.close();
   ```

## Error Handling

### Workspace-Level Errors

If a workspace search fails, continue to the next workspace:

```typescript
for (let i = 0; i < slackWorkspaces.length; i++) {
  try {
    // ... search logic
  } catch (error) {
    log("error", `Error searching workspace ${workspace.name}:`, error);
    searchResults.push({
      workspaceName: workspace.name,
      workspaceUrl: workspace.url,
      results: [],
    });
  }
}
```

### Result-Level Errors

If extracting a single result fails, continue to the next result:

```typescript
for (let j = 0; j < Math.min(5, resultItems.length); j++) {
  try {
    // ... extraction logic
  } catch (error) {
    log("warn", `Error extracting result ${j + 1}:`, error);
  }
}
```

### Expansion Errors

If a "Show more" button fails to click, continue to the next:

```typescript
for (let k = 0; k < showMoreCount; k++) {
  try {
    const button = showMoreButtons.nth(k);
    await button.scrollIntoViewIfNeeded();
    await button.click();
  } catch (error) {
    log("warn", `Error clicking "Show more" button ${k + 1}:`, error);
  }
}
```

## Timing Considerations

### Required Delays

- **After clicking search button:** 1500ms (allows modal to fully open)
- **After clearing search:** 500ms (allows UI to update)
- **After closing modal:** 500ms (allows modal to fully close)
- **After filling search input:** 1000ms (allows autocomplete to appear)
- **After executing search:** 2000ms (allows results to load)
- **After clicking "Show more":** 300ms per button (allows content to expand)
- **After all expansions:** 500ms (ensures all content is expanded)
- **After setting sort order:** 500ms (allows sort to apply)
- **Between workspace searches:** 1000ms (prevents overwhelming Slack)

### Timeout Values

- **Search button visibility:** 15000ms
- **Modal close:** 5000ms
- **Clear button:** 2000ms
- **Search results container:** 15000ms
- **Results list:** 10000ms
- **Search suggestion click:** 3000ms

## Best Practices

### 1. Use Role-Based Selectors

Prefer Playwright's role-based selectors over CSS selectors for better reliability:

```typescript
// Good
await page.getByRole('button', { name: 'Search', exact: true }).click();
await page.getByRole('combobox', { name: 'Query' }).fill(keywords);

// Avoid
await page.click('button[data-qa="top_nav_search"]');
```

### 2. Always Expand Messages

Never extract message text without first expanding all "Show more" buttons. Truncated messages are incomplete.

### 3. Handle Modal State

Always check if the search modal is open before attempting to interact with it. Close it if necessary.

### 4. Clear Previous Searches

Always clear previous searches before entering new keywords to avoid interference.

### 5. Graceful Error Handling

Continue processing other workspaces/results even if one fails. Return partial results rather than failing completely.

### 6. Scroll Into View

When clicking "Show more" buttons, scroll them into view first to ensure they're clickable:

```typescript
await button.scrollIntoViewIfNeeded();
await button.click();
```

## IPC Communication

### Main Process → Renderer

**Search Results with Incremental Scraping:**
```typescript
// In main process
ipcMain.handle("search-slack-keywords", async (_event, keywords: string, lastScrapeDate?: number) => {
  // lastScrapeDate is Unix timestamp in seconds from the last successful scrape
  // If provided, only collect messages newer than this date (early stopping)
  // ... search logic with early stopping
  return searchResults; // Array<SearchResult>
});

// In renderer
// Retrieve last scrape date from storage (e.g., localStorage, database, or file)
const lastScrapeDate = getLastScrapeDate(); // Unix timestamp in seconds
const results = await window.electronAPI.searchSlackKeywords(keywords, lastScrapeDate);

// After successful scrape, update last scrape date
if (results.length > 0) {
  const currentTimestamp = Math.floor(Date.now() / 1000);
  saveLastScrapeDate(currentTimestamp);
}
```

**Open Message:**
```typescript
// In main process
ipcMain.handle("open-slack-message", async (_event, url: string) => {
  // Open URL in Playwright browser
});

// In renderer
await window.electronAPI.openSlackMessage(permalink);
```

### Renderer Interface

```typescript
interface IElectronAPI {
  searchSlackKeywords: (keywords: string, lastScrapeDate?: number) => Promise<SearchResult[]>;
  openSlackMessage: (url: string) => Promise<void>;
}
```

**Incremental Scraping:**
- `lastScrapeDate` parameter is optional Unix timestamp in seconds representing the last successful scrape
- If provided, only messages posted after this date are collected (incremental scraping)
- Early stopping is used: when a message older than the last scrape date is encountered, collection stops (assumes results are sorted newest first)
- The system should persist the last scrape timestamp (e.g., in localStorage, database, or file) and retrieve it at the start of each scrape
- After a successful scrape, update the stored timestamp to the current time

## Testing Considerations

### Test Scenarios

1. **Single Workspace Search**
   - Search with keywords that return results
   - Search with keywords that return no results
   - Search with special characters

2. **Multiple Workspace Search**
   - Search across 2+ workspaces
   - Handle workspace that fails to load
   - Handle workspace with no results

3. **Message Expansion**
   - Messages with single "Show more" button
   - Messages with multiple "Show more" buttons
   - Messages with no "Show more" buttons

4. **Modal State**
   - Search when modal is closed
   - Search when modal is already open
   - Search with previous search still active

5. **Edge Cases**
   - Empty keywords
   - Very long keywords
   - Keywords with special characters
   - Network timeouts
   - Workspace access denied
   - Empty search results (nothing turned up)
   - Incremental scraping with no new messages since last scrape
   - Messages without timestamp data (data-ts attribute missing)
   - First scrape (no last scrape date available)

### Performance Notes

- Each workspace search takes approximately 10-15 seconds
- Message expansion adds ~500ms per "Show more" button
- Total time scales linearly with number of workspaces
- Consider adding progress feedback for users with many workspaces

## Security Considerations

- Uses persistent browser context (maintains login state)
- No credentials stored in code
- User must manually complete login
- Message permalinks contain sensitive workspace/channel IDs
- Search results may contain sensitive information

## Future Improvements

1. **Parallel Processing:** Process multiple workspaces in parallel (with careful tab management)
2. **Progress Reporting:** Send progress updates to renderer during search
3. **Retry Logic:** Add retry logic for failed workspace searches
4. **Caching:** Cache search results to avoid re-searching
5. **Pagination:** Handle search results that span multiple pages
6. **Additional Filters:** Support other Slack search filters (channel, sender, etc.)
7. **Last Scrape Date Persistence:** Implement robust storage for last scrape timestamps (database, file system, etc.)
8. **Per-Workspace Last Scrape Dates:** Track last scrape date per workspace to handle workspaces that are scraped at different times

## Common Pitfalls

### 1. Not Expanding Messages

**Problem:** Extracting message text without clicking "Show more" buttons results in truncated messages.

**Solution:** Always find and click all "Show more" buttons before extracting text.

### 2. Modal State Assumptions

**Problem:** Assuming the modal is always closed can cause clicks to fail.

**Solution:** Always check modal state and close if necessary.

### 3. Using CSS Selectors for Contenteditable

**Problem:** Standard input selectors don't work for contenteditable divs.

**Solution:** Use role-based selectors (`getByRole('combobox', { name: 'Query' })`).

### 4. Insufficient Delays

**Problem:** Not waiting long enough for UI to update causes race conditions.

**Solution:** Add appropriate delays after each interaction, especially after modal operations.

### 5. Not Clearing Previous Searches

**Problem:** Previous search queries interfere with new searches.

**Solution:** Always check for and click "Clear search" button before entering new keywords.

### 6. Not Checking for Empty State

**Problem:** Attempting to extract results when no results exist wastes time and may cause errors.

**Solution:** Always check for the empty state wrapper before attempting to extract results. Skip result extraction if "Nothing turned up" is detected.

### 7. Not Setting Sort Order

**Problem:** Default search results are sorted by relevance, not by date. This prevents efficient early stopping for incremental scraping.

**Solution:** After confirming results exist, set sort order to "Newest" to ensure chronological ordering (newest first). This enables early stopping when incremental scraping (only collecting messages newer than last scrape date).

### 8. Not Extracting Unix Timestamps

**Problem:** Human-readable timestamps like "2 hours ago" cannot be reliably used for incremental scraping comparisons.

**Solution:** Extract the `data-ts` attribute from the timestamp link element, which contains a Unix timestamp in seconds. Use this for accurate date comparisons to determine if a message is newer than the last scrape date.

### 9. Not Persisting Last Scrape Date

**Problem:** Without tracking the last scrape date, the system cannot perform incremental scraping and will re-process all messages on each run.

**Solution:** Persist the last successful scrape timestamp (e.g., in localStorage, database, or file). Retrieve it at the start of each scrape and update it after successful completion. This enables efficient incremental data collection.

## Related Documentation

- [Slack Workspace Capture Specification](./SLACK_WORKSPACE_CAPTURE_SPEC.md) - How to capture workspace URLs
- Playwright Documentation - Browser automation framework
- Electron IPC Documentation - Inter-process communication

## Code Examples

### Complete Search Implementation

See `src/main.ts` for the complete implementation of the `search-slack-keywords` IPC handler.

### UI Integration

See `src/renderer.ts` for how search results are displayed and how "View message" links open in Playwright browsers.

