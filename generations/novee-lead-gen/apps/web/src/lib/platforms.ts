/**
 * Platform connections data module using Supabase.
 *
 * NOTE: TypeScript errors will resolve after generating types:
 *   pnpm db:start && pnpm db:types
 */
import { createClient, createServiceRoleClient } from './supabase/server';

export type PlatformType = 'SLACK' | 'LINKEDIN';
export type PlatformConnectionStatus = 'PENDING' | 'CONNECTED' | 'DEGRADED' | 'DISCONNECTED';

export interface PlatformConnection {
  id: string;
  user_id: string;
  platform: PlatformType;
  status: PlatformConnectionStatus;
  metadata: Record<string, unknown>;
  last_checked_at: string | null;
  last_error: string | null;
  connected_at: string | null;
  created_at: string;
  updated_at: string;
}

/**
 * Get all platform connections for a user
 */
export async function getConnectionsForUser(userId: string): Promise<PlatformConnection[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from('platform_connections')
    .select('*')
    .eq('user_id', userId)
    .order('created_at', { ascending: false });

  if (error) {
    console.error('Failed to get connections:', error);
    return [];
  }

  return (data || []) as PlatformConnection[];
}

/**
 * Get a platform connection by ID for a user
 */
export async function getConnectionById(userId: string, connectionId: string): Promise<PlatformConnection | null> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from('platform_connections')
    .select('*')
    .eq('id', connectionId)
    .eq('user_id', userId)
    .single();

  if (error) {
    return null;
  }

  return data as PlatformConnection;
}

/**
 * Get a platform connection by platform type for a user
 */
export async function getConnectionByPlatform(userId: string, platform: PlatformType): Promise<PlatformConnection | null> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from('platform_connections')
    .select('*')
    .eq('user_id', userId)
    .eq('platform', platform)
    .single();

  if (error) {
    return null;
  }

  return data as PlatformConnection;
}

/**
 * Create a new platform connection
 */
export async function createConnection(
  userId: string,
  platform: PlatformType,
  status: PlatformConnectionStatus = 'PENDING'
): Promise<PlatformConnection> {
  const supabase = await createClient();
  const now = new Date().toISOString();

  const { data, error } = await supabase
    .from('platform_connections')
    .insert({
      user_id: userId,
      platform,
      status,
      metadata: {},
      connected_at: status === 'CONNECTED' ? now : null,
    })
    .select()
    .single();

  if (error) {
    throw new Error(`Failed to create connection: ${error.message}`);
  }

  return data as PlatformConnection;
}

/**
 * Update a platform connection status
 */
export async function updateConnectionStatus(
  userId: string,
  connectionId: string,
  status: PlatformConnectionStatus,
  lastError?: string
): Promise<PlatformConnection | null> {
  const supabase = await createClient();
  const now = new Date().toISOString();

  // First check if this connection belongs to the user
  const existing = await getConnectionById(userId, connectionId);
  if (!existing) {
    return null;
  }

  const updateData: Record<string, unknown> = {
    status,
    last_checked_at: now,
    last_error: lastError || null,
  };

  // Set connected_at if connecting for the first time
  if (status === 'CONNECTED' && !existing.connected_at) {
    updateData.connected_at = now;
  }

  const { data, error } = await supabase
    .from('platform_connections')
    .update(updateData)
    .eq('id', connectionId)
    .eq('user_id', userId)
    .select()
    .single();

  if (error) {
    console.error('Failed to update connection status:', error);
    return null;
  }

  return data as PlatformConnection;
}

/**
 * Update a platform connection's metadata
 */
export async function updateConnectionMetadata(
  userId: string,
  connectionId: string,
  metadata: Record<string, unknown>
): Promise<PlatformConnection | null> {
  const supabase = await createClient();

  // First get existing metadata to merge
  const existing = await getConnectionById(userId, connectionId);
  if (!existing) {
    return null;
  }

  const mergedMetadata = {
    ...existing.metadata,
    ...metadata,
  };

  const { data, error } = await supabase
    .from('platform_connections')
    .update({ metadata: mergedMetadata })
    .eq('id', connectionId)
    .eq('user_id', userId)
    .select()
    .single();

  if (error) {
    console.error('Failed to update connection metadata:', error);
    return null;
  }

  return data as PlatformConnection;
}

/**
 * Update a platform connection by platform type with metadata
 * Creates connection if it doesn't exist
 */
export async function updatePlatformMetadata(
  userId: string,
  platform: PlatformType,
  metadata: Record<string, unknown>,
  status?: PlatformConnectionStatus
): Promise<PlatformConnection> {
  // Use service role client to bypass RLS for server-side operations
  const supabase = await createServiceRoleClient();
  const now = new Date().toISOString();

  // Find existing connection
  const existing = await getConnectionByPlatform(userId, platform);

  if (!existing) {
    // Create new connection with metadata
    const { data, error } = await supabase
      .from('platform_connections')
      .insert({
        user_id: userId,
        platform,
        status: status || 'CONNECTED',
        metadata,
        last_checked_at: now,
        connected_at: now,
      })
      .select()
      .single();

    if (error) {
      throw new Error(`Failed to create connection: ${error.message}`);
    }

    return data as PlatformConnection;
  }

  // Update existing connection
  const mergedMetadata = {
    ...existing.metadata,
    ...metadata,
  };

  const updateData: Record<string, unknown> = {
    metadata: mergedMetadata,
    last_checked_at: now,
  };

  if (status) {
    updateData.status = status;
  }

  const { data, error } = await supabase
    .from('platform_connections')
    .update(updateData)
    .eq('id', existing.id)
    .select()
    .single();

  if (error) {
    throw new Error(`Failed to update connection: ${error.message}`);
  }

  return data as PlatformConnection;
}

/**
 * Delete a platform connection
 */
export async function deleteConnection(userId: string, connectionId: string): Promise<boolean> {
  const supabase = await createClient();

  const { error } = await supabase
    .from('platform_connections')
    .delete()
    .eq('id', connectionId)
    .eq('user_id', userId);

  if (error) {
    console.error('Failed to delete connection:', error);
    return false;
  }

  return true;
}

/**
 * Delete all platform connections for a user
 */
export async function deleteAllConnectionsForUser(userId: string): Promise<number> {
  const supabase = await createClient();

  // First count existing connections
  const connections = await getConnectionsForUser(userId);
  const count = connections.length;

  if (count === 0) {
    return 0;
  }

  const { error } = await supabase
    .from('platform_connections')
    .delete()
    .eq('user_id', userId);

  if (error) {
    console.error('Failed to delete connections:', error);
    return 0;
  }

  return count;
}

/**
 * Log a scraper error for a platform connection
 */
export async function logScraperError(
  userId: string,
  platform: PlatformType,
  errorMessage: string
): Promise<PlatformConnection | null> {
  // Find the connection for this platform
  const connection = await getConnectionByPlatform(userId, platform);

  if (!connection) {
    // Create a new connection in degraded state
    try {
      const newConnection = await createConnection(userId, platform, 'DEGRADED');
      return await updateConnectionStatus(userId, newConnection.id, 'DEGRADED', errorMessage);
    } catch {
      return null;
    }
  }

  // Update existing connection with error
  return await updateConnectionStatus(userId, connection.id, 'DEGRADED', errorMessage);
}

/**
 * Get status badge color class
 */
export function getStatusColor(status: PlatformConnectionStatus): string {
  switch (status) {
    case 'CONNECTED':
      return 'bg-green-500';
    case 'PENDING':
      return 'bg-yellow-500';
    case 'DEGRADED':
      return 'bg-amber-500';
    case 'DISCONNECTED':
      return 'bg-red-500';
    default:
      return 'bg-gray-400';
  }
}

/**
 * Get status label text
 */
export function getStatusLabel(status: PlatformConnectionStatus): string {
  switch (status) {
    case 'CONNECTED':
      return 'Connected';
    case 'PENDING':
      return 'Connecting...';
    case 'DEGRADED':
      return 'Connection issues';
    case 'DISCONNECTED':
      return 'Disconnected';
    default:
      return 'Unknown';
  }
}
