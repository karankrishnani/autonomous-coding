# 🧱 Security & Architecture Spec — Playwright + Electron Desktop App

This spec outlines the recommended security measures and architectural patterns for a desktop app built using Electron + Playwright, focused on secure, user-consented scraping of platforms like Slack and LinkedIn.

---

## ✅ Current Approach

- Uses `playwright.chromium.launchPersistentContext()` to preserve sessions
- Users manually log in — **no automated sign-in**
- Cache stored in: `app.getPath("userData") + "/playwright-cache"`
- Reuses logged-in sessions for headless scraping
- Node integration disabled in renderer for better isolation

---

## 🔒 Key Risks & Mitigations

### 1. **Automating Login UX (clarified)**

- ✅ User enters credentials manually via visible browser window
- ✅ App saves session data to local persistent context
- ❌ Do NOT use auto-fill, auto-login, or fake form submissions

---

### 2. **Restricting Domains in Playwright**

Block navigation or requests to unintended domains using:

```ts
const allowedDomains = ["linkedin.com", "slack.com"];

await page.route("**/*", (route) => {
  const url = new URL(route.request().url());
  if (allowedDomains.some((domain) => url.hostname.endsWith(domain))) {
    route.continue();
  } else {
    route.abort();
  }
});
```

Use navigation blocker:

```ts
page.on("framenavigated", (frame) => {
  const url = frame.url();
  if (!allowedDomains.some((domain) => url.includes(domain))) {
    page.goBack(); // or warn user
  }
});
```

---

### 3. **Renderer Process Hardening (CSP)**

Use strict CSP meta or headers:

```html
<meta
  http-equiv="Content-Security-Policy"
  content="
  default-src 'self';
  script-src 'self';
  style-src 'self' 'unsafe-inline';
  img-src 'self' data:;
  connect-src 'self';
  object-src 'none';
  frame-ancestors 'none';
"
/>
```

Or apply via Electron:

```ts
session.webRequest.onHeadersReceived((details, callback) => {
  callback({
    responseHeaders: {
      ...details.responseHeaders,
      "Content-Security-Policy": [
        "default-src 'self'; script-src 'self'; style-src 'self' 'unsafe-inline';",
      ],
    },
  });
});
```

---

### 4. **IPC Hardening**

Use `ipcMain.handle` with validation:

✅ Good:

```ts
ipcMain.handle("automate", async (event, args) => {
  if (typeof args.query !== "string") throw new Error("Invalid query");
  return runAutomation(args.query);
});
```

❌ Avoid:

- `ipcMain.on("*")`
- Allowing free-form `eval()` or script injections

---

## 🛡 Deployment Considerations

- Use **Electron code signing** for macOS and Windows
- Secure auto-update using signed artifacts
- Audit logs (local) for all scraping activity (opt-in)

---

## 🧪 MVP Verdict

✅ Valid MVP strategy for user-consented scraping

⚠️ Must be transparent about session handling and ToS limitations

---
