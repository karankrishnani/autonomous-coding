/**
 * Platform connections data module for development.
 * In production, this would use Supabase.
 */

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

// In-memory store for platform connections
const connections: Map<string, PlatformConnection> = new Map();

/**
 * Generate a simple UUID-like ID
 */
function generateId(): string {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
    const r = Math.random() * 16 | 0;
    const v = c === 'x' ? r : (r & 0x3 | 0x8);
    return v.toString(16);
  });
}

/**
 * Get all platform connections for a user
 */
export async function getConnectionsForUser(userId: string): Promise<PlatformConnection[]> {
  return Array.from(connections.values()).filter(c => c.user_id === userId);
}

/**
 * Get a platform connection by ID for a user
 */
export async function getConnectionById(userId: string, connectionId: string): Promise<PlatformConnection | null> {
  const connection = connections.get(connectionId);
  if (!connection || connection.user_id !== userId) {
    return null;
  }
  return connection;
}

/**
 * Get a platform connection by platform type for a user
 */
export async function getConnectionByPlatform(userId: string, platform: PlatformType): Promise<PlatformConnection | null> {
  const allConnections = Array.from(connections.values());
  const connection = allConnections.find(c => c.platform === platform && c.user_id === userId);
  return connection || null;
}

/**
 * Create a new platform connection
 */
export async function createConnection(
  userId: string,
  platform: PlatformType,
  status: PlatformConnectionStatus = 'PENDING'
): Promise<PlatformConnection> {
  const now = new Date().toISOString();
  const connection: PlatformConnection = {
    id: generateId(),
    user_id: userId,
    platform,
    status,
    metadata: {},
    last_checked_at: null,
    last_error: null,
    connected_at: status === 'CONNECTED' ? now : null,
    created_at: now,
    updated_at: now,
  };

  connections.set(connection.id, connection);
  return connection;
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
  const connection = connections.get(connectionId);
  if (!connection || connection.user_id !== userId) {
    return null;
  }

  const now = new Date().toISOString();
  connection.status = status;
  connection.last_checked_at = now;
  connection.last_error = lastError || null;
  if (status === 'CONNECTED' && !connection.connected_at) {
    connection.connected_at = now;
  }
  connection.updated_at = now;

  connections.set(connectionId, connection);
  return connection;
}

/**
 * Delete a platform connection
 */
export async function deleteConnection(userId: string, connectionId: string): Promise<boolean> {
  const connection = connections.get(connectionId);
  if (!connection || connection.user_id !== userId) {
    return false;
  }

  connections.delete(connectionId);
  return true;
}

/**
 * Delete all platform connections for a user
 * Used for account deletion cascade
 * Returns the number of connections deleted
 */
export async function deleteAllConnectionsForUser(userId: string): Promise<number> {
  const userConnections = Array.from(connections.values()).filter(c => c.user_id === userId);
  let deletedCount = 0;

  for (const connection of userConnections) {
    connections.delete(connection.id);
    deletedCount++;
  }

  return deletedCount;
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
