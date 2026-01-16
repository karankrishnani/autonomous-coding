-- Scrape logs table for tracking scraper operations
CREATE TABLE IF NOT EXISTS public.scrape_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  platform_connection_id UUID NOT NULL REFERENCES public.platform_connections(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  status TEXT NOT NULL CHECK (status IN ('RUNNING', 'COMPLETED', 'FAILED')),
  started_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  completed_at TIMESTAMPTZ,
  messages_found INTEGER DEFAULT 0 NOT NULL,
  leads_created INTEGER DEFAULT 0 NOT NULL,
  error_message TEXT,
  metadata JSONB DEFAULT '{}' NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

-- Trigger for updated_at
CREATE TRIGGER update_scrape_logs_updated_at
  BEFORE UPDATE ON public.scrape_logs
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Index for efficient querying by connection and time
CREATE INDEX idx_scrape_logs_connection_time ON public.scrape_logs(platform_connection_id, started_at DESC);
CREATE INDEX idx_scrape_logs_user_time ON public.scrape_logs(user_id, started_at DESC);
