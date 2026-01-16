-- Enable RLS on scrape_logs table
ALTER TABLE public.scrape_logs ENABLE ROW LEVEL SECURITY;

-- ========================================
-- SCRAPE_LOGS TABLE
-- ========================================
-- Users can read only their own scrape logs
CREATE POLICY "scrape_logs_select_own" ON public.scrape_logs
  FOR SELECT USING (auth.uid() = user_id);

-- Users can insert their own scrape logs
CREATE POLICY "scrape_logs_insert_own" ON public.scrape_logs
  FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Users can update their own scrape logs
CREATE POLICY "scrape_logs_update_own" ON public.scrape_logs
  FOR UPDATE USING (auth.uid() = user_id);

-- Users can delete their own scrape logs
CREATE POLICY "scrape_logs_delete_own" ON public.scrape_logs
  FOR DELETE USING (auth.uid() = user_id);
