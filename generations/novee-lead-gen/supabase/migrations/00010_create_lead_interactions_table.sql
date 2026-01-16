-- Lead interactions table (append-only)
CREATE TABLE IF NOT EXISTS public.lead_interactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  lead_id UUID NOT NULL REFERENCES public.leads(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  action TEXT NOT NULL CHECK (action IN ('INTERESTED', 'NOT_INTERESTED', 'MARKED_LATER', 'OPENED_SOURCE')),
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);
-- No updated_at trigger - this is append-only
