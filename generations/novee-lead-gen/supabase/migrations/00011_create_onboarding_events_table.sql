-- Onboarding events table (append-only)
CREATE TABLE IF NOT EXISTS public.onboarding_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  event TEXT NOT NULL CHECK (event IN ('ACCOUNT_CREATED', 'WEB_LOGIN', 'BROWSER_FINGERPRINT_CAPTURED', 'DESKTOP_DOWNLOADED', 'DESKTOP_INSTALLED', 'PLATFORM_CONNECTED', 'KEYWORDS_SELECTED', 'FIRST_LEAD_VIEWED')),
  platform_connection_id UUID REFERENCES public.platform_connections(id) ON DELETE SET NULL,
  occurred_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  metadata JSONB DEFAULT '{}' NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);
-- No updated_at trigger - this is append-only
