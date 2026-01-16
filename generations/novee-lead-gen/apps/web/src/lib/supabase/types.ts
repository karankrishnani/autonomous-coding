/**
 * Supabase type helpers for development.
 *
 * Note: Once local Supabase is running, generate proper types with:
 *   pnpm db:types
 *
 * This will create packages/shared/src/database.types.ts with full type inference.
 */

import type { SupabaseClient } from '@supabase/supabase-js';
import type { Database } from '@novee/shared';

// Re-export the Database type for convenience
export type { Database };

// Type alias for the Supabase client
export type TypedSupabaseClient = SupabaseClient<Database>;

// Helper type to extract table types
export type Tables<T extends keyof Database['public']['Tables']> = Database['public']['Tables'][T];

// Row types
export type UserRow = Tables<'users'>['Row'];
export type PlatformConnectionRow = Tables<'platform_connections'>['Row'];
export type ChannelRow = Tables<'channels'>['Row'];
export type UserKeywordGroupRow = Tables<'user_keyword_groups'>['Row'];
export type KeywordRow = Tables<'keywords'>['Row'];
export type PostRow = Tables<'posts'>['Row'];
export type LeadRow = Tables<'leads'>['Row'];
export type LeadInteractionRow = Tables<'lead_interactions'>['Row'];
export type OnboardingEventRow = Tables<'onboarding_events'>['Row'];
export type DesktopSessionRow = Tables<'desktop_app_sessions'>['Row'];
export type ScraperConfigRow = Tables<'scraper_configs'>['Row'];
export type UserFingerprintRow = Tables<'user_fingerprints'>['Row'];

// Insert types
export type UserInsert = Tables<'users'>['Insert'];
export type PlatformConnectionInsert = Tables<'platform_connections'>['Insert'];
export type ChannelInsert = Tables<'channels'>['Insert'];
export type UserKeywordGroupInsert = Tables<'user_keyword_groups'>['Insert'];
export type KeywordInsert = Tables<'keywords'>['Insert'];
export type PostInsert = Tables<'posts'>['Insert'];
export type LeadInsert = Tables<'leads'>['Insert'];
export type LeadInteractionInsert = Tables<'lead_interactions'>['Insert'];
export type OnboardingEventInsert = Tables<'onboarding_events'>['Insert'];
export type DesktopSessionInsert = Tables<'desktop_app_sessions'>['Insert'];

// Update types
export type UserUpdate = Tables<'users'>['Update'];
export type PlatformConnectionUpdate = Tables<'platform_connections'>['Update'];
export type ChannelUpdate = Tables<'channels'>['Update'];
export type UserKeywordGroupUpdate = Tables<'user_keyword_groups'>['Update'];
export type KeywordUpdate = Tables<'keywords'>['Update'];
export type PostUpdate = Tables<'posts'>['Update'];
export type LeadUpdate = Tables<'leads'>['Update'];
export type DesktopSessionUpdate = Tables<'desktop_app_sessions'>['Update'];
