# 📄 Scraper Logic Configuration Spec — Novee MVP

> Enable patchable and maintainable scraping logic for platforms like Slack, LinkedIn, and Reddit by decoupling extraction logic from hardcoded selectors.

---

## 🧠 Overview

This spec outlines the architecture and implementation for a **remotely updateable scraper system** in the Novee desktop app. The goal is to allow scraping rules (DOM selectors, filters, transformations) to be updated without requiring users to download a new app version.

---

## 🧱 Architecture Goals

- ✅ Decouple scraping logic (selectors, filters) from code
- ✅ Support hot patching of broken scrapers
- ✅ Allow remote config delivery via Supabase or Vercel
- ✅ Enable platform-specific logic via pluggable modules

---

## 🗂️ Folder Structure (Example)

```
scrapers/
  ├─ SlackScraper.ts
  ├─ LinkedInScraper.ts
  ├─ RedditScraper.ts
  └─ configLoader.ts
```

---

## 🔌 Scraper Module Interface

Each scraper is a standalone module that accepts a config object and returns extracted leads in a consistent format.

```ts
// SlackScraper.ts

type ScraperConfig = {
  containerSelector: string;
  postSelector: string;
  timeSelector?: string;
  filters: {
    keywords: string[];
    excludeUsers?: string[];
  };
};

export const SlackScraper = async (config: ScraperConfig) => {
  const posts = await scrapeDOM({
    containerSelector: config.containerSelector,
    postSelector: config.postSelector,
    timeSelector: config.timeSelector,
    filters: config.filters,
  });

  return posts.map(post => ({
    message: post.text,
    timestamp: post.time,
    source_url: post.link,
  }));
};
```

---

## 🌐 Remote Config Fetching

Scraper configs are pulled from the backend via HTTPS on app launch and optionally on a regular interval or on scraping failure.

```ts
// configLoader.ts

export const fetchScraperConfig = async (platform: 'slack' | 'linkedin' | 'reddit') => {
  const res = await fetch(`https://yourbackend.com/scraper-config/${platform}`);
  return await res.json(); // Expected to match ScraperConfig type
};
```

---

## 💾 Supabase DB Schema

```sql
CREATE TABLE scraper_configs (
  platform TEXT PRIMARY KEY,
  version TEXT,
  config JSONB,
  updated_at TIMESTAMP DEFAULT NOW()
);
```

---

## 🔄 JSON Config Example

```json
{
  "containerSelector": ".p-workspace__primary_view",
  "postSelector": ".c-message__content",
  "timeSelector": "time",
  "filters": {
    "keywords": ["hiring", "freelancer", "contract", "agency"],
    "excludeUsers": ["bot", "recruiter"]
  }
}
```

---

## ⚠️ Fallback + Error Strategy

- If config fetch fails, use last-known-good local config file
- On scrape failure:
  - Retry with freshly fetched config
  - If still broken, log + report to backend
- Optionally show a “Scraper update in progress” toast to user

---

## 🧪 DevTool Ideas (Optional)

Build a hidden admin/dev panel that:
- Loads current DOM
- Allows testing new selectors live
- Preview output post-transformation
- Sends tested config to backend for promotion

---

## ✅ Benefits

- React quickly to DOM or layout changes on Slack/LinkedIn
- Centralized control of all scraper logic
- Reduced app rebuilds and user update churn
- Unlocks A/B testing of scraper filters in the future

---

## 🔮 Future Extensions

- Versioned configs with rollback support
- Platform-specific scraping agents dispatched dynamically
- Store logs of config performance (posts matched, error rate)
