-- Performance indexes as specified in app_spec.txt
CREATE INDEX IF NOT EXISTS idx_leads_user_status ON public.leads(user_id, status);
CREATE INDEX IF NOT EXISTS idx_leads_created ON public.leads(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_posts_channel ON public.posts(channel_id, timestamp DESC);
CREATE INDEX IF NOT EXISTS idx_platform_connections_user ON public.platform_connections(user_id);
CREATE INDEX IF NOT EXISTS idx_channels_platform ON public.channels(platform_connection_id);

-- Additional useful indexes
CREATE INDEX IF NOT EXISTS idx_user_fingerprints_user ON public.user_fingerprints(user_id);
CREATE INDEX IF NOT EXISTS idx_desktop_sessions_user ON public.desktop_app_sessions(user_id);
CREATE INDEX IF NOT EXISTS idx_keywords_group ON public.keywords(user_keyword_group_id);
CREATE INDEX IF NOT EXISTS idx_keyword_groups_user ON public.user_keyword_groups(user_id);
CREATE INDEX IF NOT EXISTS idx_lead_interactions_lead ON public.lead_interactions(lead_id);
CREATE INDEX IF NOT EXISTS idx_onboarding_events_user ON public.onboarding_events(user_id);
