-- Scraper configs table for remote configuration
CREATE TABLE IF NOT EXISTS public.scraper_configs (
  platform TEXT PRIMARY KEY CHECK (platform IN ('SLACK', 'LINKEDIN', 'REDDIT')),
  version TEXT NOT NULL,
  config JSONB NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

-- Insert default Slack config
INSERT INTO public.scraper_configs (platform, version, config)
VALUES ('SLACK', '1.0.0', '{
  "selectors": {
    "searchInput": "[data-qa=\"search-input\"]",
    "searchButton": "[data-qa=\"search-submit\"]",
    "messageContainer": ".c-search_message__content",
    "showMoreButton": ".c-truncate__show_more_button",
    "messageText": ".p-rich_text_section",
    "messageTimestamp": ".c-timestamp",
    "messagePermalink": ".c-message__actions .c-icon_button"
  },
  "timing": {
    "searchDelay": 2000,
    "pageLoadDelay": 3000,
    "scrollDelay": 1000,
    "showMoreDelay": 500
  },
  "limits": {
    "maxMessagesPerSearch": 50,
    "maxRetries": 3
  }
}'::jsonb)
ON CONFLICT (platform) DO NOTHING;

-- Insert default LinkedIn config
INSERT INTO public.scraper_configs (platform, version, config)
VALUES ('LINKEDIN', '1.0.0', '{
  "selectors": {},
  "timing": {
    "searchDelay": 3000,
    "pageLoadDelay": 5000
  },
  "limits": {
    "maxPostsPerSearch": 25
  }
}'::jsonb)
ON CONFLICT (platform) DO NOTHING;
