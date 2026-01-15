# Slack Scraping Spike Results

## Objective
Determine the most reliable way to automate Slack message search without triggering detection or protocol dialogs.

## Key Findings

### ✅ What Works
1. **Playwright Persistent Context**
   - Maintains login state across sessions
   - No re-authentication needed
   - Performance: ~2-3 seconds per workspace

2. **SSB Redirect Interception**
   - Problem: Clicking workspace links triggers `slack://` protocol
   - Solution: Intercept `**/ssb/redirect**` route, redirect to `https://{workspace}.slack.com`
   - Result: No protocol dialogs, seamless navigation

3. **Role-Based Selectors**
   - `getByRole('button', { name: 'Search', exact: true })`
   - More resilient than CSS selectors
   - Works across Slack UI updates

### ❌ What Doesn't Work
1. **Direct Protocol Blocking**: Can't intercept `slack://` URLs
2. **Chrome Flags**: `--disable-features=ExternalProtocolDialog` doesn't work
3. **Static Selectors**: Break when Slack updates UI

## Recommended Implementation

See `docs/SLACK_WORKSPACE_CAPTURE_SPEC.md` for complete implementation guide.

### Critical Code Pattern
```typescript
// Intercept SSB redirects BEFORE navigating
await page.route("**/ssb/redirect**", async (route) => {
  const workspaceDomain = new URL(route.request().url()).hostname;
  await route.fulfill({
    status: 302,
    headers: { Location: `https://${workspaceDomain}` }
  });
});
```

## Performance Benchmarks
- Workspace capture: ~5-8 seconds per workspace
- Message search: ~3-5 seconds per keyword
- Full scrape (10 workspaces, 5 keywords): ~4-6 minutes

## Security Considerations
- Browser fingerprinting reduces detection risk
- Respect rate limits: Max 1 search per 2 seconds
- Persistent context prevents re-login detection

## Next Steps
- [ ] Implement remote scraper config system
- [ ] Add retry logic with exponential backoff
- [ ] Test with 20+ workspaces