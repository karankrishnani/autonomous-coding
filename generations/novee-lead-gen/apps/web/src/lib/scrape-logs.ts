/**
 * Scrape logs data management using Supabase.
 */
import { createClient } from './supabase/server';

export type ScrapeStatus = 'RUNNING' | 'COMPLETED' | 'FAILED';

export interface ScrapeLog {
  id: string;
  platform_connection_id: string;
  user_id: string;
  status: ScrapeStatus;
  started_at: string;
  completed_at: string | null;
  messages_found: number;
  leads_created: number;
  error_message: string | null;
  metadata: Record<string, unknown>;
  created_at: string;
  updated_at: string;
}

/**
 * Get scrape logs for a platform connection
 */
export async function getScrapeLogsByConnectionId(
  connectionId: string,
  limit: number = 10
): Promise<ScrapeLog[]> {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from('scrape_logs')
    .select('*')
    .eq('platform_connection_id', connectionId)
    .order('started_at', { ascending: false })
    .limit(limit);

  if (error) {
    console.error('Failed to get scrape logs:', error);
    return [];
  }

  return data as ScrapeLog[];
}

/**
 * Get scrape logs for a user across all platforms
 */
export async function getScrapeLogsByUserId(
  userId: string,
  limit: number = 20
): Promise<ScrapeLog[]> {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from('scrape_logs')
    .select('*')
    .eq('user_id', userId)
    .order('started_at', { ascending: false })
    .limit(limit);

  if (error) {
    console.error('Failed to get scrape logs:', error);
    return [];
  }

  return data as ScrapeLog[];
}

/**
 * Create a new scrape log entry
 */
export async function createScrapeLog(
  connectionId: string,
  userId: string,
  status: ScrapeStatus = 'RUNNING'
): Promise<ScrapeLog | null> {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from('scrape_logs')
    .insert({
      platform_connection_id: connectionId,
      user_id: userId,
      status,
      started_at: new Date().toISOString(),
    })
    .select()
    .single();

  if (error) {
    console.error('Failed to create scrape log:', error);
    return null;
  }

  return data as ScrapeLog;
}

/**
 * Update a scrape log entry
 */
export async function updateScrapeLog(
  logId: string,
  updates: {
    status?: ScrapeStatus;
    completed_at?: string;
    messages_found?: number;
    leads_created?: number;
    error_message?: string;
    metadata?: Record<string, unknown>;
  }
): Promise<ScrapeLog | null> {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from('scrape_logs')
    .update(updates)
    .eq('id', logId)
    .select()
    .single();

  if (error) {
    console.error('Failed to update scrape log:', error);
    return null;
  }

  return data as ScrapeLog;
}

/**
 * Complete a scrape log (set status to COMPLETED)
 */
export async function completeScrapeLog(
  logId: string,
  messagesFound: number,
  leadsCreated: number,
  metadata?: Record<string, unknown>
): Promise<ScrapeLog | null> {
  return updateScrapeLog(logId, {
    status: 'COMPLETED',
    completed_at: new Date().toISOString(),
    messages_found: messagesFound,
    leads_created: leadsCreated,
    metadata: metadata || {},
  });
}

/**
 * Fail a scrape log (set status to FAILED)
 */
export async function failScrapeLog(
  logId: string,
  errorMessage: string,
  metadata?: Record<string, unknown>
): Promise<ScrapeLog | null> {
  return updateScrapeLog(logId, {
    status: 'FAILED',
    completed_at: new Date().toISOString(),
    error_message: errorMessage,
    metadata: metadata || {},
  });
}

/**
 * Get summary stats for a platform connection
 */
export async function getScrapeStats(
  connectionId: string
): Promise<{
  totalScrapes: number;
  successfulScrapes: number;
  failedScrapes: number;
  totalMessagesFound: number;
  totalLeadsCreated: number;
  lastScrapeAt: string | null;
  lastScrapeStatus: ScrapeStatus | null;
}> {
  const logs = await getScrapeLogsByConnectionId(connectionId, 100);

  const completed = logs.filter(l => l.status === 'COMPLETED');
  const failed = logs.filter(l => l.status === 'FAILED');

  return {
    totalScrapes: logs.length,
    successfulScrapes: completed.length,
    failedScrapes: failed.length,
    totalMessagesFound: completed.reduce((sum, l) => sum + l.messages_found, 0),
    totalLeadsCreated: completed.reduce((sum, l) => sum + l.leads_created, 0),
    lastScrapeAt: logs[0]?.started_at || null,
    lastScrapeStatus: logs[0]?.status || null,
  };
}
