-- Enable RLS on all tables
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_fingerprints ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.desktop_app_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.platform_connections ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.channels ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_keyword_groups ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.keywords ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.posts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.leads ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.lead_interactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.onboarding_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.scraper_configs ENABLE ROW LEVEL SECURITY;

-- ========================================
-- USERS TABLE
-- ========================================
-- Users can only read/update their own profile
CREATE POLICY "users_select_own" ON public.users
  FOR SELECT USING (auth.uid() = id);

CREATE POLICY "users_update_own" ON public.users
  FOR UPDATE USING (auth.uid() = id);

-- ========================================
-- USER_FINGERPRINTS TABLE
-- ========================================
CREATE POLICY "fingerprints_select_own" ON public.user_fingerprints
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "fingerprints_insert_own" ON public.user_fingerprints
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "fingerprints_update_own" ON public.user_fingerprints
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "fingerprints_delete_own" ON public.user_fingerprints
  FOR DELETE USING (auth.uid() = user_id);

-- ========================================
-- DESKTOP_APP_SESSIONS TABLE
-- ========================================
CREATE POLICY "sessions_select_own" ON public.desktop_app_sessions
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "sessions_insert_own" ON public.desktop_app_sessions
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "sessions_update_own" ON public.desktop_app_sessions
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "sessions_delete_own" ON public.desktop_app_sessions
  FOR DELETE USING (auth.uid() = user_id);

-- ========================================
-- PLATFORM_CONNECTIONS TABLE
-- ========================================
CREATE POLICY "connections_select_own" ON public.platform_connections
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "connections_insert_own" ON public.platform_connections
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "connections_update_own" ON public.platform_connections
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "connections_delete_own" ON public.platform_connections
  FOR DELETE USING (auth.uid() = user_id);

-- ========================================
-- CHANNELS TABLE
-- ========================================
-- Users can access channels through their platform connections
CREATE POLICY "channels_select_own" ON public.channels
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.platform_connections pc
      WHERE pc.id = platform_connection_id AND pc.user_id = auth.uid()
    )
  );

CREATE POLICY "channels_insert_own" ON public.channels
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.platform_connections pc
      WHERE pc.id = platform_connection_id AND pc.user_id = auth.uid()
    )
  );

CREATE POLICY "channels_update_own" ON public.channels
  FOR UPDATE USING (
    EXISTS (
      SELECT 1 FROM public.platform_connections pc
      WHERE pc.id = platform_connection_id AND pc.user_id = auth.uid()
    )
  );

CREATE POLICY "channels_delete_own" ON public.channels
  FOR DELETE USING (
    EXISTS (
      SELECT 1 FROM public.platform_connections pc
      WHERE pc.id = platform_connection_id AND pc.user_id = auth.uid()
    )
  );

-- ========================================
-- USER_KEYWORD_GROUPS TABLE
-- ========================================
CREATE POLICY "keyword_groups_select_own" ON public.user_keyword_groups
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "keyword_groups_insert_own" ON public.user_keyword_groups
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "keyword_groups_update_own" ON public.user_keyword_groups
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "keyword_groups_delete_own" ON public.user_keyword_groups
  FOR DELETE USING (auth.uid() = user_id);

-- ========================================
-- KEYWORDS TABLE
-- ========================================
CREATE POLICY "keywords_select_own" ON public.keywords
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.user_keyword_groups ukg
      WHERE ukg.id = user_keyword_group_id AND ukg.user_id = auth.uid()
    )
  );

CREATE POLICY "keywords_insert_own" ON public.keywords
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.user_keyword_groups ukg
      WHERE ukg.id = user_keyword_group_id AND ukg.user_id = auth.uid()
    )
  );

CREATE POLICY "keywords_update_own" ON public.keywords
  FOR UPDATE USING (
    EXISTS (
      SELECT 1 FROM public.user_keyword_groups ukg
      WHERE ukg.id = user_keyword_group_id AND ukg.user_id = auth.uid()
    )
  );

CREATE POLICY "keywords_delete_own" ON public.keywords
  FOR DELETE USING (
    EXISTS (
      SELECT 1 FROM public.user_keyword_groups ukg
      WHERE ukg.id = user_keyword_group_id AND ukg.user_id = auth.uid()
    )
  );

-- ========================================
-- POSTS TABLE
-- ========================================
-- Users can access posts through their channels
CREATE POLICY "posts_select_own" ON public.posts
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.channels c
      JOIN public.platform_connections pc ON pc.id = c.platform_connection_id
      WHERE c.id = channel_id AND pc.user_id = auth.uid()
    )
  );

CREATE POLICY "posts_insert_own" ON public.posts
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.channels c
      JOIN public.platform_connections pc ON pc.id = c.platform_connection_id
      WHERE c.id = channel_id AND pc.user_id = auth.uid()
    )
  );

CREATE POLICY "posts_update_own" ON public.posts
  FOR UPDATE USING (
    EXISTS (
      SELECT 1 FROM public.channels c
      JOIN public.platform_connections pc ON pc.id = c.platform_connection_id
      WHERE c.id = channel_id AND pc.user_id = auth.uid()
    )
  );

CREATE POLICY "posts_delete_own" ON public.posts
  FOR DELETE USING (
    EXISTS (
      SELECT 1 FROM public.channels c
      JOIN public.platform_connections pc ON pc.id = c.platform_connection_id
      WHERE c.id = channel_id AND pc.user_id = auth.uid()
    )
  );

-- ========================================
-- LEADS TABLE
-- ========================================
CREATE POLICY "leads_select_own" ON public.leads
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "leads_insert_own" ON public.leads
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "leads_update_own" ON public.leads
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "leads_delete_own" ON public.leads
  FOR DELETE USING (auth.uid() = user_id);

-- ========================================
-- LEAD_INTERACTIONS TABLE
-- ========================================
CREATE POLICY "interactions_select_own" ON public.lead_interactions
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "interactions_insert_own" ON public.lead_interactions
  FOR INSERT WITH CHECK (auth.uid() = user_id);
-- No update/delete - append-only

-- ========================================
-- ONBOARDING_EVENTS TABLE
-- ========================================
CREATE POLICY "onboarding_select_own" ON public.onboarding_events
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "onboarding_insert_own" ON public.onboarding_events
  FOR INSERT WITH CHECK (auth.uid() = user_id);
-- No update/delete - append-only

-- ========================================
-- SCRAPER_CONFIGS TABLE
-- ========================================
-- Public read-only access for all authenticated users
CREATE POLICY "scraper_configs_select_all" ON public.scraper_configs
  FOR SELECT USING (auth.role() = 'authenticated');
-- Only service role can modify (no INSERT/UPDATE policies for anon/authenticated)
