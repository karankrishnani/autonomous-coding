-- Platform connections table for social platform integrations
CREATE TABLE IF NOT EXISTS public.platform_connections (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  platform TEXT NOT NULL CHECK (platform IN ('SLACK', 'LINKEDIN')),
  status TEXT NOT NULL CHECK (status IN ('PENDING', 'CONNECTED', 'DEGRADED', 'DISCONNECTED')),
  metadata JSONB DEFAULT '{}' NOT NULL,
  last_checked_at TIMESTAMPTZ,
  last_error TEXT,
  connected_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  UNIQUE(user_id, platform)
);

CREATE TRIGGER update_platform_connections_updated_at
  BEFORE UPDATE ON public.platform_connections
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();
