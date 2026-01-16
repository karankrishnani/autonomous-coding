-- User keyword groups table
CREATE TABLE IF NOT EXISTS public.user_keyword_groups (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  active BOOLEAN DEFAULT TRUE NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

CREATE TRIGGER update_user_keyword_groups_updated_at
  BEFORE UPDATE ON public.user_keyword_groups
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();
