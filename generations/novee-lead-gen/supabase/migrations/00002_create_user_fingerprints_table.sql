-- User fingerprints table for browser fingerprinting
CREATE TABLE IF NOT EXISTS public.user_fingerprints (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  fingerprint JSONB NOT NULL,
  collected_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

CREATE TRIGGER update_user_fingerprints_updated_at
  BEFORE UPDATE ON public.user_fingerprints
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();
