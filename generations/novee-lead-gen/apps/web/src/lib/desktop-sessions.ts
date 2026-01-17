/**
 * Desktop app sessions data module using Supabase.
 * Uses service role client for all operations since user validation is done at API layer.
 */
import { createServiceRoleClient } from './supabase/server';

export interface DesktopSession {
  id: string;
  user_id: string;
  device_label: string;
  os_type: string;
  last_seen_at: string;
  created_at: string;
  updated_at: string;
}

/**
 * Get all desktop sessions for a specific user
 * Uses service role client since user is already validated at API layer
 */
export async function getSessionsForUser(userId: string): Promise<DesktopSession[]> {
  const supabase = await createServiceRoleClient();

  const { data, error } = await supabase
    .from('desktop_app_sessions')
    .select('*')
    .eq('user_id', userId)
    .order('last_seen_at', { ascending: false });

  if (error) {
    console.error('Failed to get sessions:', error);
    return [];
  }

  return (data || []) as DesktopSession[];
}

/**
 * Get a specific session by ID (with user isolation)
 * Uses service role client since user is already validated at API layer
 */
export async function getSessionById(sessionId: string, userId: string): Promise<DesktopSession | null> {
  const supabase = await createServiceRoleClient();

  const { data, error } = await supabase
    .from('desktop_app_sessions')
    .select('*')
    .eq('id', sessionId)
    .eq('user_id', userId)
    .single();

  if (error) {
    return null;
  }

  return data as DesktopSession;
}

/**
 * Register a new desktop app session
 * Uses service role client to bypass RLS since user is already validated at API layer
 */
export async function createSession(
  userId: string,
  deviceLabel: string,
  osType: string
): Promise<DesktopSession> {
  // Use service role client to bypass RLS - user validation done in API handler
  const supabase = await createServiceRoleClient();

  const { data, error } = await supabase
    .from('desktop_app_sessions')
    .insert({
      user_id: userId,
      device_label: deviceLabel,
      os_type: osType,
    })
    .select()
    .single();

  if (error) {
    throw new Error(`Failed to create session: ${error.message}`);
  }

  return data as DesktopSession;
}

/**
 * Update session's last_seen_at timestamp (heartbeat)
 * Uses service role client since user is already validated at API layer
 */
export async function updateSessionHeartbeat(sessionId: string, userId: string): Promise<DesktopSession | null> {
  const supabase = await createServiceRoleClient();

  const { data, error } = await supabase
    .from('desktop_app_sessions')
    .update({ last_seen_at: new Date().toISOString() })
    .eq('id', sessionId)
    .eq('user_id', userId)
    .select()
    .single();

  if (error) {
    console.error('Failed to update session heartbeat:', error);
    return null;
  }

  return data as DesktopSession;
}

/**
 * Update session device label
 * Uses service role client since user is already validated at API layer
 */
export async function updateSessionLabel(
  sessionId: string,
  userId: string,
  deviceLabel: string
): Promise<DesktopSession | null> {
  const supabase = await createServiceRoleClient();

  const { data, error } = await supabase
    .from('desktop_app_sessions')
    .update({ device_label: deviceLabel })
    .eq('id', sessionId)
    .eq('user_id', userId)
    .select()
    .single();

  if (error) {
    console.error('Failed to update session label:', error);
    return null;
  }

  return data as DesktopSession;
}

/**
 * Delete a desktop session
 * Uses service role client since user is already validated at API layer
 */
export async function deleteSession(sessionId: string, userId: string): Promise<boolean> {
  const supabase = await createServiceRoleClient();

  const { error } = await supabase
    .from('desktop_app_sessions')
    .delete()
    .eq('id', sessionId)
    .eq('user_id', userId);

  if (error) {
    console.error('Failed to delete session:', error);
    return false;
  }

  return true;
}

/**
 * Get session count for a user
 * Uses service role client since user is already validated at API layer
 */
export async function getSessionCount(userId: string): Promise<number> {
  const supabase = await createServiceRoleClient();

  const { count, error } = await supabase
    .from('desktop_app_sessions')
    .select('*', { count: 'exact', head: true })
    .eq('user_id', userId);

  if (error) {
    console.error('Failed to get session count:', error);
    return 0;
  }

  return count || 0;
}

/**
 * Check if a session is considered "active" (seen within last 5 minutes)
 */
export function isSessionActive(session: DesktopSession): boolean {
  const lastSeen = new Date(session.last_seen_at).getTime();
  const fiveMinutesAgo = Date.now() - 5 * 60 * 1000;
  return lastSeen > fiveMinutesAgo;
}
