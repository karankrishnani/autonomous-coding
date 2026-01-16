/**
 * Channels data module for development.
 * In production, this would use Supabase.
 */

import * as fs from 'fs';
import * as path from 'path';

export type ChannelType = 'public' | 'private' | 'dm';

export interface Channel {
  id: string;
  platform_connection_id: string;
  name: string;
  type: ChannelType;
  metadata: Record<string, unknown>;
  last_run_at: string | null;
  next_run_at: string | null;
  created_at: string;
  updated_at: string;
}

// File path for persistent storage
const DATA_DIR = path.join(process.cwd(), '.dev-data');
const CHANNELS_FILE = path.join(DATA_DIR, 'channels.json');

// In-memory store for channels
let channels: Map<string, Channel> = new Map();
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
 * Load channels from file
 */
function loadChannels() {
  if (isLoaded) return;

  try {
    ensureDataDir();
    if (fs.existsSync(CHANNELS_FILE)) {
      const data = fs.readFileSync(CHANNELS_FILE, 'utf-8');
      const channelsArray: Channel[] = JSON.parse(data);
      channels = new Map(channelsArray.map(c => [c.id, c]));
    }
  } catch (error) {
    console.error('Failed to load channels:', error);
  }

  isLoaded = true;
}

/**
 * Save channels to file
 */
function saveChannels() {
  try {
    ensureDataDir();
    const channelsArray = Array.from(channels.values());
    fs.writeFileSync(CHANNELS_FILE, JSON.stringify(channelsArray, null, 2));
  } catch (error) {
    console.error('Failed to save channels:', error);
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
 * Get all channels for a platform connection
 */
export async function getChannelsForConnection(connectionId: string): Promise<Channel[]> {
  loadChannels();
  return Array.from(channels.values()).filter(c => c.platform_connection_id === connectionId);
}

/**
 * Get a channel by ID
 */
export async function getChannelById(channelId: string): Promise<Channel | null> {
  loadChannels();
  return channels.get(channelId) || null;
}

/**
 * Create a new channel
 */
export async function createChannel(
  connectionId: string,
  name: string,
  type: ChannelType = 'public',
  metadata: Record<string, unknown> = {}
): Promise<Channel> {
  loadChannels();
  const now = new Date().toISOString();
  const channel: Channel = {
    id: generateId(),
    platform_connection_id: connectionId,
    name,
    type,
    metadata,
    last_run_at: null,
    next_run_at: null,
    created_at: now,
    updated_at: now,
  };

  channels.set(channel.id, channel);
  saveChannels();
  return channel;
}

/**
 * Create multiple channels at once (bulk insert)
 */
export async function createChannelsBulk(
  connectionId: string,
  channelData: Array<{ name: string; type?: ChannelType; metadata?: Record<string, unknown> }>
): Promise<Channel[]> {
  loadChannels();
  const now = new Date().toISOString();
  const createdChannels: Channel[] = [];

  for (const data of channelData) {
    const channel: Channel = {
      id: generateId(),
      platform_connection_id: connectionId,
      name: data.name,
      type: data.type || 'public',
      metadata: data.metadata || {},
      last_run_at: null,
      next_run_at: null,
      created_at: now,
      updated_at: now,
    };

    channels.set(channel.id, channel);
    createdChannels.push(channel);
  }

  saveChannels();
  return createdChannels;
}

/**
 * Update a channel
 */
export async function updateChannel(
  channelId: string,
  updates: Partial<Pick<Channel, 'name' | 'type' | 'metadata' | 'last_run_at' | 'next_run_at'>>
): Promise<Channel | null> {
  loadChannels();
  const channel = channels.get(channelId);
  if (!channel) {
    return null;
  }

  const now = new Date().toISOString();
  if (updates.name !== undefined) channel.name = updates.name;
  if (updates.type !== undefined) channel.type = updates.type;
  if (updates.metadata !== undefined) channel.metadata = { ...channel.metadata, ...updates.metadata };
  if (updates.last_run_at !== undefined) channel.last_run_at = updates.last_run_at;
  if (updates.next_run_at !== undefined) channel.next_run_at = updates.next_run_at;
  channel.updated_at = now;

  channels.set(channelId, channel);
  saveChannels();
  return channel;
}

/**
 * Delete a channel
 */
export async function deleteChannel(channelId: string): Promise<boolean> {
  loadChannels();
  if (!channels.has(channelId)) {
    return false;
  }

  channels.delete(channelId);
  saveChannels();
  return true;
}

/**
 * Delete all channels for a platform connection (cascade delete)
 */
export async function deleteChannelsForConnection(connectionId: string): Promise<number> {
  loadChannels();
  const connectionChannels = Array.from(channels.values()).filter(
    c => c.platform_connection_id === connectionId
  );
  let deletedCount = 0;

  for (const channel of connectionChannels) {
    channels.delete(channel.id);
    deletedCount++;
  }

  if (deletedCount > 0) {
    saveChannels();
  }
  return deletedCount;
}
