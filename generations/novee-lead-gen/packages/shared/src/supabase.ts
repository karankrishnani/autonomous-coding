/**
 * Supabase client configuration for Novee
 */

import { createClient, SupabaseClient } from '@supabase/supabase-js';

// Type definitions for Supabase database
// These match the schema defined in the app spec

export interface Database {
  public: {
    Tables: {
      users: {
        Row: {
          id: string;
          email: string;
          name: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id: string;
          email: string;
          name?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          email?: string;
          name?: string | null;
          updated_at?: string;
        };
      };
      user_fingerprints: {
        Row: {
          id: string;
          user_id: string;
          fingerprint: Record<string, unknown>;
          collected_at: string;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          fingerprint: Record<string, unknown>;
          collected_at?: string;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          fingerprint?: Record<string, unknown>;
          collected_at?: string;
          updated_at?: string;
        };
      };
      desktop_app_sessions: {
        Row: {
          id: string;
          user_id: string;
          device_label: string | null;
          os_type: string | null;
          last_seen_at: string;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          device_label?: string | null;
          os_type?: string | null;
          last_seen_at?: string;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          device_label?: string | null;
          os_type?: string | null;
          last_seen_at?: string;
          updated_at?: string;
        };
      };
      platform_connections: {
        Row: {
          id: string;
          user_id: string;
          platform: string;
          status: string;
          metadata: Record<string, unknown>;
          last_checked_at: string | null;
          last_error: string | null;
          connected_at: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          platform: string;
          status: string;
          metadata?: Record<string, unknown>;
          last_checked_at?: string | null;
          last_error?: string | null;
          connected_at?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          platform?: string;
          status?: string;
          metadata?: Record<string, unknown>;
          last_checked_at?: string | null;
          last_error?: string | null;
          connected_at?: string | null;
          updated_at?: string;
        };
      };
      channels: {
        Row: {
          id: string;
          platform_connection_id: string;
          name: string;
          type: string | null;
          metadata: Record<string, unknown>;
          last_run_at: string | null;
          next_run_at: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          platform_connection_id: string;
          name: string;
          type?: string | null;
          metadata?: Record<string, unknown>;
          last_run_at?: string | null;
          next_run_at?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          name?: string;
          type?: string | null;
          metadata?: Record<string, unknown>;
          last_run_at?: string | null;
          next_run_at?: string | null;
          updated_at?: string;
        };
      };
      user_keyword_groups: {
        Row: {
          id: string;
          user_id: string;
          active: boolean;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          active?: boolean;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          active?: boolean;
          updated_at?: string;
        };
      };
      keywords: {
        Row: {
          id: string;
          user_keyword_group_id: string;
          text: string;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          user_keyword_group_id: string;
          text: string;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          text?: string;
          updated_at?: string;
        };
      };
      posts: {
        Row: {
          id: string;
          channel_id: string;
          timestamp: string;
          content: string;
          source_url: string | null;
          metadata: Record<string, unknown>;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          channel_id: string;
          timestamp: string;
          content: string;
          source_url?: string | null;
          metadata?: Record<string, unknown>;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          timestamp?: string;
          content?: string;
          source_url?: string | null;
          metadata?: Record<string, unknown>;
          updated_at?: string;
        };
      };
      leads: {
        Row: {
          id: string;
          user_id: string;
          post_id: string;
          matched_keywords: string[];
          status: string;
          first_viewed_at: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          post_id: string;
          matched_keywords: string[];
          status?: string;
          first_viewed_at?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          matched_keywords?: string[];
          status?: string;
          first_viewed_at?: string | null;
          updated_at?: string;
        };
      };
      lead_interactions: {
        Row: {
          id: string;
          lead_id: string;
          user_id: string;
          action: string;
          created_at: string;
        };
        Insert: {
          id?: string;
          lead_id: string;
          user_id: string;
          action: string;
          created_at?: string;
        };
        Update: never;
      };
      onboarding_events: {
        Row: {
          id: string;
          user_id: string;
          event: string;
          platform_connection_id: string | null;
          occurred_at: string;
          metadata: Record<string, unknown>;
          created_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          event: string;
          platform_connection_id?: string | null;
          occurred_at?: string;
          metadata?: Record<string, unknown>;
          created_at?: string;
        };
        Update: never;
      };
      scraper_configs: {
        Row: {
          platform: string;
          version: string;
          config: Record<string, unknown>;
          updated_at: string;
        };
        Insert: {
          platform: string;
          version: string;
          config: Record<string, unknown>;
          updated_at?: string;
        };
        Update: {
          version?: string;
          config?: Record<string, unknown>;
          updated_at?: string;
        };
      };
    };
    Views: Record<string, never>;
    Functions: Record<string, never>;
    Enums: Record<string, never>;
  };
}

/**
 * Create a Supabase client for server-side usage
 */
export function createServerClient(
  supabaseUrl: string,
  supabaseKey: string
): SupabaseClient<Database> {
  return createClient<Database>(supabaseUrl, supabaseKey);
}

/**
 * Create a Supabase client for browser usage
 */
export function createBrowserClient(
  supabaseUrl: string,
  supabaseAnonKey: string
): SupabaseClient<Database> {
  return createClient<Database>(supabaseUrl, supabaseAnonKey, {
    auth: {
      persistSession: true,
      autoRefreshToken: true,
      detectSessionInUrl: true,
    },
  });
}

export type { SupabaseClient };
