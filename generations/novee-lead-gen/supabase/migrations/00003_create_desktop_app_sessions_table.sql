-- Desktop app sessions table for tracking desktop app instances
CREATE TABLE IF NOT EXISTS public.desktop_app_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  device_label TEXT,
  os_type TEXT,
  last_seen_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

CREATE TRIGGER update_desktop_app_sessions_updated_at
  BEFORE UPDATE ON public.desktop_app_sessions
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();
