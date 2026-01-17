/**
 * Leads data management using Supabase.
 */
import { createClient, createServiceRoleClient } from './supabase/server';

export type LeadStatus = 'NEW' | 'VIEWED' | 'INTERESTED' | 'NOT_INTERESTED' | 'MARKED_LATER' | 'ARCHIVED';

export interface Lead {
  id: string;
  user_id: string;
  post_id: string;
  matched_keywords: string[];
  status: LeadStatus;
  first_viewed_at: string | null;
  created_at: string;
  updated_at: string;
  // Embedded post data
  post?: {
    content: string;
    source_url: string;
    channel_name: string;
    platform: 'SLACK' | 'LINKEDIN';
    timestamp: string;
    sender_name: string;
  };
}

/**
 * Pagination result interface
 */
export interface PaginatedResult<T> {
  data: T[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
  hasMore: boolean;
}

/**
 * Get all leads for a specific user
 */
export async function getLeadsByUserId(userId: string): Promise<Lead[]> {
  // Use service role client to bypass RLS - user authentication is validated at the API layer
  const supabase = await createServiceRoleClient();

  const { data, error } = await supabase
    .from('leads')
    .select(`
      *,
      posts (
        content,
        source_url,
        timestamp,
        metadata,
        channels (
          name,
          platform_connections (
            platform
          )
        )
      )
    `)
    .eq('user_id', userId)
    .order('created_at', { ascending: false });

  if (error) {
    console.error('Failed to get leads:', error);
    return [];
  }

  return (data || []).map(transformLeadRow);
}

/**
 * Get paginated leads for a specific user
 */
export async function getLeadsByUserIdPaginated(
  userId: string,
  page: number = 1,
  pageSize: number = 20
): Promise<PaginatedResult<Lead>> {
  // Use service role client to bypass RLS - user authentication is validated at the API layer
  const supabase = await createServiceRoleClient();

  // Get total count
  const { count: total } = await supabase
    .from('leads')
    .select('*', { count: 'exact', head: true })
    .eq('user_id', userId);

  const totalCount = total || 0;
  const totalPages = Math.ceil(totalCount / pageSize);
  const offset = (page - 1) * pageSize;

  // Get paginated data
  const { data, error } = await supabase
    .from('leads')
    .select(`
      *,
      posts (
        content,
        source_url,
        timestamp,
        metadata,
        channels (
          name,
          platform_connections (
            platform
          )
        )
      )
    `)
    .eq('user_id', userId)
    .order('created_at', { ascending: false })
    .range(offset, offset + pageSize - 1);

  if (error) {
    console.error('Failed to get paginated leads:', error);
    return {
      data: [],
      total: 0,
      page,
      pageSize,
      totalPages: 0,
      hasMore: false,
    };
  }

  return {
    data: (data || []).map(transformLeadRow),
    total: totalCount,
    page,
    pageSize,
    totalPages,
    hasMore: page < totalPages,
  };
}

/**
 * Transform database row to Lead interface
 */
function transformLeadRow(row: Record<string, unknown>): Lead {
  const posts = row.posts as Record<string, unknown> | null;
  const channels = posts?.channels as Record<string, unknown> | null;
  const platformConnections = channels?.platform_connections as Record<string, unknown> | null;
  const metadata = posts?.metadata as Record<string, unknown> | null;

  return {
    id: row.id as string,
    user_id: row.user_id as string,
    post_id: row.post_id as string,
    matched_keywords: row.matched_keywords as string[],
    status: row.status as LeadStatus,
    first_viewed_at: row.first_viewed_at as string | null,
    created_at: row.created_at as string,
    updated_at: row.updated_at as string,
    post: posts ? {
      content: posts.content as string,
      source_url: posts.source_url as string || '',
      channel_name: channels?.name as string || 'Unknown',
      platform: (platformConnections?.platform as 'SLACK' | 'LINKEDIN') || 'SLACK',
      timestamp: posts.timestamp as string,
      sender_name: (metadata?.sender_name as string) || 'Unknown User',
    } : undefined,
  };
}

/**
 * Get a single lead by ID
 */
export async function getLeadById(leadId: string): Promise<Lead | null> {
  // Use service role client to bypass RLS - user authentication is validated at the API layer
  const supabase = await createServiceRoleClient();

  const { data, error } = await supabase
    .from('leads')
    .select(`
      *,
      posts (
        content,
        source_url,
        timestamp,
        metadata,
        channels (
          name,
          platform_connections (
            platform
          )
        )
      )
    `)
    .eq('id', leadId)
    .single();

  if (error || !data) {
    return null;
  }

  return transformLeadRow(data);
}

/**
 * Get a lead by ID for a specific user
 */
export async function getLeadByIdForUser(leadId: string, userId: string): Promise<Lead | null> {
  // Use service role client to bypass RLS - user authentication is validated at the API layer
  const supabase = await createServiceRoleClient();

  const { data, error } = await supabase
    .from('leads')
    .select(`
      *,
      posts (
        content,
        source_url,
        timestamp,
        metadata,
        channels (
          name,
          platform_connections (
            platform
          )
        )
      )
    `)
    .eq('id', leadId)
    .eq('user_id', userId)
    .single();

  if (error || !data) {
    return null;
  }

  return transformLeadRow(data);
}

/**
 * Create a new lead
 * Note: This function first creates or finds a post, then creates the lead
 */
export async function createLead(
  userId: string,
  postContent: string,
  matchedKeywords: string[],
  options?: {
    platform?: 'SLACK' | 'LINKEDIN';
    channelName?: string;
    senderName?: string;
    sourceUrl?: string;
    postId?: string;
    channelId?: string;
  }
): Promise<Lead | null> {
  // Use service role client to bypass RLS - user authentication is validated at the API layer
  const supabase = await createServiceRoleClient();

  // If channelId is provided, use it; otherwise we need to create or find a channel
  let channelId = options?.channelId;

  if (!channelId) {
    // Find or create a channel for this platform/channel name
    const channelName = options?.channelName || 'general';
    const platform = options?.platform || 'SLACK';

    // First, get the user's platform connection for this platform
    const { data: connection, error: connError } = await supabase
      .from('platform_connections')
      .select('id')
      .eq('user_id', userId)
      .eq('platform', platform)
      .eq('status', 'CONNECTED')
      .single();

    if (connError || !connection) {
      console.warn('No connected platform found for lead creation, trying to create one');

      // Create a platform connection if none exists
      const { data: newConn, error: newConnError } = await supabase
        .from('platform_connections')
        .insert({
          user_id: userId,
          platform,
          status: 'CONNECTED',
          metadata: {},
        })
        .select()
        .single();

      if (newConnError || !newConn) {
        console.error('Failed to create platform connection:', newConnError);
        return null;
      }

      // Now create the channel
      const { data: channel, error: channelError } = await supabase
        .from('channels')
        .insert({
          platform_connection_id: newConn.id,
          name: channelName,
          type: 'channel',
          metadata: {},
        })
        .select()
        .single();

      if (channelError || !channel) {
        console.error('Failed to create channel:', channelError);
        return null;
      }

      channelId = channel.id;
    } else {
      // Try to find or create channel for this connection
      const { data: existingChannel } = await supabase
        .from('channels')
        .select('id')
        .eq('platform_connection_id', connection.id)
        .eq('name', channelName)
        .single();

      if (existingChannel) {
        channelId = existingChannel.id;
      } else {
        // Create the channel
        const { data: newChannel, error: channelError } = await supabase
          .from('channels')
          .insert({
            platform_connection_id: connection.id,
            name: channelName,
            type: 'channel',
            metadata: {},
          })
          .select()
          .single();

        if (channelError || !newChannel) {
          console.error('Failed to create channel:', channelError);
          return null;
        }
        channelId = newChannel.id;
      }
    }
  }

  // Check for existing post with the same source_url to deduplicate
  let postId = options?.postId;

  if (!postId && options?.sourceUrl) {
    // Check if post with this source_url already exists
    const { data: existingPost } = await supabase
      .from('posts')
      .select('id')
      .eq('source_url', options.sourceUrl)
      .single();

    if (existingPost) {
      postId = existingPost.id;
      console.log(`[Dedup] Found existing post with source_url: ${options.sourceUrl}`);

      // Check if a lead already exists for this user and post
      const { data: existingLead } = await supabase
        .from('leads')
        .select('id')
        .eq('user_id', userId)
        .eq('post_id', postId)
        .single();

      if (existingLead) {
        console.log(`[Dedup] Lead already exists for this post, skipping creation`);
        return null;
      }
    }
  }

  // Create the post if we don't have one
  let post: { id: string; timestamp: string } | null = null;
  if (!postId) {
    const { data: newPost, error: postError } = await supabase
      .from('posts')
      .insert({
        channel_id: channelId,
        content: postContent,
        source_url: options?.sourceUrl || null,
        timestamp: new Date().toISOString(),
        metadata: {
          sender_name: options?.senderName || 'Unknown User',
        },
      })
      .select()
      .single();

    if (postError || !newPost) {
      console.error('Failed to create post:', postError);
      return null;
    }
    post = newPost;
    postId = newPost.id;
  } else {
    // Fetch the existing post for return data
    const { data: existingPost } = await supabase
      .from('posts')
      .select('id, timestamp')
      .eq('id', postId)
      .single();
    post = existingPost;
  }

  if (!post || !postId) {
    console.error('Failed to get or create post');
    return null;
  }

  // Create the lead
  const { data: lead, error: leadError } = await supabase
    .from('leads')
    .insert({
      user_id: userId,
      post_id: postId,
      matched_keywords: matchedKeywords,
      status: 'NEW',
    })
    .select()
    .single();

  if (leadError) {
    // Check for duplicate
    if (leadError.code === '23505') {
      return null; // Duplicate lead
    }
    console.error('Failed to create lead:', leadError);
    return null;
  }

  return {
    id: lead.id,
    user_id: lead.user_id,
    post_id: lead.post_id,
    matched_keywords: lead.matched_keywords,
    status: lead.status,
    first_viewed_at: lead.first_viewed_at,
    created_at: lead.created_at,
    updated_at: lead.updated_at,
    post: {
      content: postContent,
      source_url: options?.sourceUrl || '',
      channel_name: options?.channelName || 'Unknown',
      platform: options?.platform || 'SLACK',
      timestamp: post.timestamp,
      sender_name: options?.senderName || 'Unknown User',
    },
  };
}

/**
 * Update a lead's status
 */
export async function updateLeadStatus(
  leadId: string,
  userId: string,
  status: LeadStatus
): Promise<Lead | null> {
  // Use service role client to bypass RLS - user authentication is validated at the API layer
  const supabase = await createServiceRoleClient();

  const updateData: Record<string, unknown> = { status };

  // Track first viewed time
  if (status === 'VIEWED') {
    const existing = await getLeadByIdForUser(leadId, userId);
    if (existing && !existing.first_viewed_at) {
      updateData.first_viewed_at = new Date().toISOString();
    }
  }

  const { data, error } = await supabase
    .from('leads')
    .update(updateData)
    .eq('id', leadId)
    .eq('user_id', userId)
    .select()
    .single();

  if (error || !data) {
    console.error('Failed to update lead status:', error);
    return null;
  }

  return getLeadByIdForUser(leadId, userId);
}

/**
 * Delete a lead
 */
export async function deleteLead(leadId: string, userId: string): Promise<boolean> {
  // Use service role client to bypass RLS - user authentication is validated at the API layer
  const supabase = await createServiceRoleClient();

  const { error } = await supabase
    .from('leads')
    .delete()
    .eq('id', leadId)
    .eq('user_id', userId);

  if (error) {
    console.error('Failed to delete lead:', error);
    return false;
  }

  return true;
}

/**
 * Demo leads data for new users
 */
const DEMO_LEADS = [
  {
    content: "Hey everyone! We're a growing startup looking for a senior React developer to join our team. Remote-friendly, competitive salary, and exciting product challenges. We're building a next-generation fintech platform that's already serving thousands of users. You'll work with a talented team using modern tech stack including React 18, TypeScript, GraphQL, and AWS. DM me if interested!",
    platform: 'SLACK' as const,
    channelName: 'react-jobs',
    senderName: 'Sarah Chen',
    keywords: ['React', 'Frontend'],
  },
  {
    content: "Our agency needs help with a 3-month TypeScript/Node.js project. Looking for someone with API design experience. Budget is flexible for the right person. Anyone available?",
    platform: 'SLACK' as const,
    channelName: 'freelance-gigs',
    senderName: 'Mike Johnson',
    keywords: ['TypeScript', 'Node.js', 'API'],
  },
  {
    content: "Seeking a talented UI/UX designer for our fintech app redesign. Must have experience with design systems and Figma. This is a contract role with potential for full-time. Reach out!",
    platform: 'LINKEDIN' as const,
    channelName: 'Design Network',
    senderName: 'Emily Watson',
    keywords: ['UI/UX', 'Design'],
  },
];

/**
 * Get demo leads for a new user
 */
export async function getDemoLeads(userId: string): Promise<(Lead & { isDemo: boolean })[]> {
  const now = new Date().toISOString();
  const oneHourAgo = new Date(Date.now() - 3600000).toISOString();
  const twoHoursAgo = new Date(Date.now() - 7200000).toISOString();

  const timestamps = [now, oneHourAgo, twoHoursAgo];

  return DEMO_LEADS.map((demo, index) => ({
    id: `demo-${index + 1}`,
    user_id: userId,
    post_id: `demo-post-${index + 1}`,
    matched_keywords: demo.keywords,
    status: 'NEW' as LeadStatus,
    first_viewed_at: null,
    created_at: timestamps[index],
    updated_at: timestamps[index],
    isDemo: true,
    post: {
      content: demo.content,
      source_url: `https://example.com/demo/${index + 1}`,
      channel_name: demo.channelName,
      platform: demo.platform,
      timestamp: timestamps[index],
      sender_name: demo.senderName,
    },
  }));
}

/**
 * Check if user has any real leads
 */
export async function userHasLeads(userId: string): Promise<boolean> {
  // Use service role client to bypass RLS - user authentication is validated at the API layer
  const supabase = await createServiceRoleClient();

  const { count } = await supabase
    .from('leads')
    .select('*', { count: 'exact', head: true })
    .eq('user_id', userId);

  return (count || 0) > 0;
}

/**
 * Delete all leads for a user
 */
export async function deleteAllLeadsForUser(userId: string): Promise<number> {
  // Use service role client to bypass RLS - user authentication is validated at the API layer
  const supabase = await createServiceRoleClient();

  // Get count first
  const { count } = await supabase
    .from('leads')
    .select('*', { count: 'exact', head: true })
    .eq('user_id', userId);

  if (!count || count === 0) {
    return 0;
  }

  const { error } = await supabase
    .from('leads')
    .delete()
    .eq('user_id', userId);

  if (error) {
    console.error('Failed to delete leads:', error);
    return 0;
  }

  return count;
}

/**
 * Get lead statistics for a user
 */
export async function getLeadStats(userId: string): Promise<{
  total: number;
  new: number;
  viewed: number;
  interested: number;
  not_interested: number;
  marked_later: number;
  archived: number;
}> {
  // Use service role client to bypass RLS - user authentication is validated at the API layer
  const supabase = await createServiceRoleClient();

  // Get total count
  const { count: total } = await supabase
    .from('leads')
    .select('*', { count: 'exact', head: true })
    .eq('user_id', userId);

  // Get counts by status
  const statuses: LeadStatus[] = ['NEW', 'VIEWED', 'INTERESTED', 'NOT_INTERESTED', 'MARKED_LATER', 'ARCHIVED'];
  const counts: Record<string, number> = {};

  for (const status of statuses) {
    const { count } = await supabase
      .from('leads')
      .select('*', { count: 'exact', head: true })
      .eq('user_id', userId)
      .eq('status', status);
    counts[status.toLowerCase()] = count || 0;
  }

  return {
    total: total || 0,
    new: counts.new || 0,
    viewed: counts.viewed || 0,
    interested: counts.interested || 0,
    not_interested: counts.not_interested || 0,
    marked_later: counts.marked_later || 0,
    archived: counts.archived || 0,
  };
}
