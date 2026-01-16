/**
 * Channels data module using Supabase.
 */
import { createClient } from './supabase/server';

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

/**
 * Get all channels for a platform connection
 */
export async function getChannelsForConnection(connectionId: string): Promise<Channel[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from('channels')
    .select('*')
    .eq('platform_connection_id', connectionId)
    .order('name', { ascending: true });

  if (error) {
    console.error('Failed to get channels:', error);
    return [];
  }

  return (data || []) as Channel[];
}

/**
 * Get a channel by ID
 */
export async function getChannelById(channelId: string): Promise<Channel | null> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from('channels')
    .select('*')
    .eq('id', channelId)
    .single();

  if (error) {
    return null;
  }

  return data as Channel;
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
  const supabase = await createClient();

  const { data, error } = await supabase
    .from('channels')
    .insert({
      platform_connection_id: connectionId,
      name,
      type,
      metadata,
    })
    .select()
    .single();

  if (error) {
    throw new Error(`Failed to create channel: ${error.message}`);
  }

  return data as Channel;
}

/**
 * Create multiple channels at once (bulk insert)
 */
export async function createChannelsBulk(
  connectionId: string,
  channelData: Array<{ name: string; type?: ChannelType; metadata?: Record<string, unknown> }>
): Promise<Channel[]> {
  const supabase = await createClient();

  const insertData = channelData.map(data => ({
    platform_connection_id: connectionId,
    name: data.name,
    type: data.type || 'public',
    metadata: data.metadata || {},
  }));

  const { data, error } = await supabase
    .from('channels')
    .insert(insertData)
    .select();

  if (error) {
    throw new Error(`Failed to create channels: ${error.message}`);
  }

  return (data || []) as Channel[];
}

/**
 * Update a channel
 */
export async function updateChannel(
  channelId: string,
  updates: Partial<Pick<Channel, 'name' | 'type' | 'metadata' | 'last_run_at' | 'next_run_at'>>
): Promise<Channel | null> {
  const supabase = await createClient();

  // For metadata, we need to merge with existing
  let updateData: Record<string, unknown> = {};

  if (updates.name !== undefined) updateData.name = updates.name;
  if (updates.type !== undefined) updateData.type = updates.type;
  if (updates.last_run_at !== undefined) updateData.last_run_at = updates.last_run_at;
  if (updates.next_run_at !== undefined) updateData.next_run_at = updates.next_run_at;

  // If metadata is being updated, merge with existing
  if (updates.metadata !== undefined) {
    const existing = await getChannelById(channelId);
    if (existing) {
      updateData.metadata = { ...existing.metadata, ...updates.metadata };
    } else {
      updateData.metadata = updates.metadata;
    }
  }

  const { data, error } = await supabase
    .from('channels')
    .update(updateData)
    .eq('id', channelId)
    .select()
    .single();

  if (error) {
    console.error('Failed to update channel:', error);
    return null;
  }

  return data as Channel;
}

/**
 * Delete a channel
 */
export async function deleteChannel(channelId: string): Promise<boolean> {
  const supabase = await createClient();

  const { error } = await supabase
    .from('channels')
    .delete()
    .eq('id', channelId);

  if (error) {
    console.error('Failed to delete channel:', error);
    return false;
  }

  return true;
}

/**
 * Delete all channels for a platform connection (cascade delete)
 */
export async function deleteChannelsForConnection(connectionId: string): Promise<number> {
  const supabase = await createClient();

  // First count existing channels
  const channels = await getChannelsForConnection(connectionId);
  const count = channels.length;

  if (count === 0) {
    return 0;
  }

  const { error } = await supabase
    .from('channels')
    .delete()
    .eq('platform_connection_id', connectionId);

  if (error) {
    console.error('Failed to delete channels:', error);
    return 0;
  }

  return count;
}
