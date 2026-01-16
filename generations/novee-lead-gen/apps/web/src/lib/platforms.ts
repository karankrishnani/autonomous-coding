/**
 * Platform connections data module for development.
 * In production, this would use Supabase.
 */

import * as fs from 'fs';
import * as path from 'path';

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

// File path for persistent storage
const DATA_DIR = path.join(process.cwd(), '.dev-data');
const CONNECTIONS_FILE = path.join(DATA_DIR, 'connections.json');

// In-memory store for platform connections
let connections: Map<string, PlatformConnection> = new Map();
let isLoaded = false;

/**
 * Ensure data directory exists
 */
function ensureDataDir() {
  if (!fs.existsSync(DATA_DIR)) {
    fs.mkdirSync(DATA_DIR, { recursive: true });
  }
}

/**
 * Load connections from file
 */
function loadConnections() {
  if (isLoaded) return;

  try {
    ensureDataDir();
    if (fs.existsSync(CONNECTIONS_FILE)) {
      const data = fs.readFileSync(CONNECTIONS_FILE, 'utf-8');
      const connectionsArray: PlatformConnection[] = JSON.parse(data);
      connections = new Map(connectionsArray.map(c => [c.id, c]));
    }
  } catch (error) {
    console.error('Failed to load connections:', error);
  }

  isLoaded = true;
}

/**
 * Save connections to file
 */
function saveConnections() {
  try {
    ensureDataDir();
    const connectionsArray = Array.from(connections.values());
    fs.writeFileSync(CONNECTIONS_FILE, JSON.stringify(connectionsArray, null, 2));
  } catch (error) {
    console.error('Failed to save connections:', error);
  }
}

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
  loadConnections();
  return Array.from(connections.values()).filter(c => c.user_id === userId);
}

/**
 * Get a platform connection by ID for a user
 */
export async function getConnectionById(userId: string, connectionId: string): Promise<PlatformConnection | null> {
  loadConnections();
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
  loadConnections();
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
  loadConnections();
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
  saveConnections();
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
  loadConnections();
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
  saveConnections();
  return connection;
}

/**
 * Update a platform connection's metadata
 * Used to store workspace URLs, channel info, etc.
 */
export async function updateConnectionMetadata(
  userId: string,
  connectionId: string,
  metadata: Record<string, unknown>
): Promise<PlatformConnection | null> {
  loadConnections();
  const connection = connections.get(connectionId);
  if (!connection || connection.user_id !== userId) {
    return null;
  }

  const now = new Date().toISOString();
  // Merge new metadata with existing
  connection.metadata = {
    ...connection.metadata,
    ...metadata,
  };
  connection.updated_at = now;

  connections.set(connectionId, connection);
  saveConnections();
  return connection;
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
  loadConnections();

  // Find existing connection
  let connection = Array.from(connections.values()).find(
    c => c.platform === platform && c.user_id === userId
  );

  const now = new Date().toISOString();

  if (!connection) {
    // Create new connection with metadata
    connection = {
      id: generateId(),
      user_id: userId,
      platform,
      status: status || 'CONNECTED',
      metadata,
      last_checked_at: now,
      last_error: null,
      connected_at: now,
      created_at: now,
      updated_at: now,
    };
  } else {
    // Update existing connection
    connection.metadata = {
      ...connection.metadata,
      ...metadata,
    };
    if (status) {
      connection.status = status;
    }
    connection.last_checked_at = now;
    connection.updated_at = now;
  }

  connections.set(connection.id, connection);
  saveConnections();
  return connection;
}

/**
 * Delete a platform connection
 */
export async function deleteConnection(userId: string, connectionId: string): Promise<boolean> {
  loadConnections();
  const connection = connections.get(connectionId);
  if (!connection || connection.user_id !== userId) {
    return false;
  }

  connections.delete(connectionId);
  saveConnections();
  return true;
}

/**
 * Delete all platform connections for a user
 * Used for account deletion cascade
 * Returns the number of connections deleted
 */
export async function deleteAllConnectionsForUser(userId: string): Promise<number> {
  loadConnections();
  const userConnections = Array.from(connections.values()).filter(c => c.user_id === userId);
  let deletedCount = 0;

  for (const connection of userConnections) {
    connections.delete(connection.id);
    deletedCount++;
  }

  if (deletedCount > 0) {
    saveConnections();
  }
  return deletedCount;
}

/**
 * Log a scraper error for a platform connection
 * Updates the connection's last_error field and sets status to DEGRADED
 */
export async function logScraperError(
  userId: string,
  platform: PlatformType,
  errorMessage: string
): Promise<PlatformConnection | null> {
  loadConnections();

  // Find the connection for this platform
  const connection = Array.from(connections.values()).find(
    c => c.platform === platform && c.user_id === userId
  );

  if (!connection) {
    // Create a new connection if it doesn't exist
    const newConnection = await createConnection(userId, platform, 'DEGRADED');
    const now = new Date().toISOString();
    newConnection.last_error = errorMessage;
    newConnection.last_checked_at = now;
    connections.set(newConnection.id, newConnection);
    saveConnections();
    return newConnection;
  }

  // Update existing connection with error
  const now = new Date().toISOString();
  connection.status = 'DEGRADED';
  connection.last_error = errorMessage;
  connection.last_checked_at = now;
  connection.updated_at = now;

  connections.set(connection.id, connection);
  saveConnections();
  return connection;
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
