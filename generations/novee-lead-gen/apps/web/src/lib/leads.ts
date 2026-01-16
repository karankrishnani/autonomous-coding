/**
 * Leads data management for development.
 * In production, this would use Supabase.
 * For development, we use an in-memory store with cookie persistence.
 */

import { cookies } from 'next/headers';

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
  // Embedded post data for development
  post?: {
    content: string;
    source_url: string;
    channel_name: string;
    platform: 'SLACK' | 'LINKEDIN';
    timestamp: string;
    sender_name: string;
  };
}

// In-memory leads store
const leads: Map<string, Lead> = new Map();

// Cookie name for persisting leads
const LEADS_COOKIE = 'novee_dev_leads';

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

// Track if we've loaded from cookie this server instance
let cookieLoaded = false;

/**
 * Load leads from cookie (development persistence)
 * Only loads once per server instance to preserve in-memory state
 */
async function loadLeadsFromCookie(): Promise<void> {
  // Only load from cookie once, then rely on in-memory store
  if (cookieLoaded) return;

  try {
    const cookieStore = await cookies();
    const leadsCookie = cookieStore.get(LEADS_COOKIE)?.value;
    if (leadsCookie) {
      const decoded = Buffer.from(leadsCookie, 'base64').toString('utf-8');
      const leadsArray: Lead[] = JSON.parse(decoded);
      // Don't clear - merge with existing in-memory leads
      for (const lead of leadsArray) {
        if (!leads.has(lead.id)) {
          leads.set(lead.id, lead);
        }
      }
    }
    cookieLoaded = true;
  } catch {
    // Ignore errors, start fresh
    cookieLoaded = true;
  }
}

/**
 * Save leads to cookie (development persistence)
 */
async function saveLeadsToCookie(): Promise<void> {
  try {
    const cookieStore = await cookies();
    const leadsArray = Array.from(leads.values());
    const encoded = Buffer.from(JSON.stringify(leadsArray)).toString('base64');
    cookieStore.set(LEADS_COOKIE, encoded, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 60 * 60 * 24 * 30, // 30 days
      path: '/',
    });
  } catch {
    // Ignore errors
  }
}

/**
 * Get all leads for a specific user
 */
export async function getLeadsByUserId(userId: string): Promise<Lead[]> {
  await loadLeadsFromCookie();
  return Array.from(leads.values()).filter(lead => lead.user_id === userId);
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
 * Get paginated leads for a specific user
 */
export async function getLeadsByUserIdPaginated(
  userId: string,
  page: number = 1,
  pageSize: number = 20
): Promise<PaginatedResult<Lead>> {
  await loadLeadsFromCookie();

  // Get all leads for user, sorted by created_at descending
  const userLeads = Array.from(leads.values())
    .filter(lead => lead.user_id === userId)
    .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());

  const total = userLeads.length;
  const totalPages = Math.ceil(total / pageSize);
  const startIndex = (page - 1) * pageSize;
  const endIndex = startIndex + pageSize;
  const paginatedLeads = userLeads.slice(startIndex, endIndex);

  return {
    data: paginatedLeads,
    total,
    page,
    pageSize,
    totalPages,
    hasMore: page < totalPages,
  };
}

/**
 * Get a single lead by ID
 * Returns null if not found
 */
export async function getLeadById(leadId: string): Promise<Lead | null> {
  await loadLeadsFromCookie();
  return leads.get(leadId) || null;
}

/**
 * Get a lead by ID, but only if it belongs to the specified user
 * Returns null if not found or doesn't belong to user
 */
export async function getLeadByIdForUser(leadId: string, userId: string): Promise<Lead | null> {
  await loadLeadsFromCookie();
  const lead = leads.get(leadId);
  if (!lead || lead.user_id !== userId) {
    return null;
  }
  return lead;
}

/**
 * Create a new lead
 * Returns null if a duplicate lead exists (same user_id + post_id)
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
    postId?: string; // Optional: specify post ID for deduplication
  }
): Promise<Lead | null> {
  await loadLeadsFromCookie();

  const now = new Date().toISOString();
  const postId = options?.postId || generateId();

  // Check for duplicate: same user_id + post_id
  const existingLead = Array.from(leads.values()).find(
    lead => lead.user_id === userId && lead.post_id === postId
  );

  if (existingLead) {
    // Duplicate detected - return null to indicate constraint violation
    return null;
  }

  const lead: Lead = {
    id: generateId(),
    user_id: userId,
    post_id: postId,
    matched_keywords: matchedKeywords,
    status: 'NEW',
    first_viewed_at: null,
    created_at: now,
    updated_at: now,
    post: {
      content: postContent,
      source_url: options?.sourceUrl || `https://example.com/post/${generateId()}`,
      channel_name: options?.channelName || 'general',
      platform: options?.platform || 'SLACK',
      timestamp: now,
      sender_name: options?.senderName || 'Unknown User',
    },
  };

  leads.set(lead.id, lead);
  await saveLeadsToCookie();

  return lead;
}

/**
 * Update a lead's status
 * Returns the updated lead or null if not found/not owned by user
 */
export async function updateLeadStatus(
  leadId: string,
  userId: string,
  status: LeadStatus
): Promise<Lead | null> {
  await loadLeadsFromCookie();

  const lead = leads.get(leadId);
  if (!lead || lead.user_id !== userId) {
    return null;
  }

  lead.status = status;
  lead.updated_at = new Date().toISOString();

  // Track first viewed time
  if (status === 'VIEWED' && !lead.first_viewed_at) {
    lead.first_viewed_at = new Date().toISOString();
  }

  leads.set(leadId, lead);
  await saveLeadsToCookie();

  return lead;
}

/**
 * Delete a lead (for testing purposes)
 * Returns true if deleted, false if not found/not owned by user
 */
export async function deleteLead(leadId: string, userId: string): Promise<boolean> {
  await loadLeadsFromCookie();

  const lead = leads.get(leadId);
  if (!lead || lead.user_id !== userId) {
    return false;
  }

  leads.delete(leadId);
  await saveLeadsToCookie();

  return true;
}

/**
 * Demo leads data for new users
 * These are shown to help users understand what leads look like
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
 * Returns demo leads with isDemo flag set to true
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
 * Check if user has any real leads (not demo)
 */
export async function userHasLeads(userId: string): Promise<boolean> {
  await loadLeadsFromCookie();
  return Array.from(leads.values()).some(lead => lead.user_id === userId);
}

/**
 * Delete all leads for a user
 * Used for account deletion cascade
 * Returns the number of leads deleted
 */
export async function deleteAllLeadsForUser(userId: string): Promise<number> {
  await loadLeadsFromCookie();

  const userLeads = Array.from(leads.values()).filter(lead => lead.user_id === userId);
  let deletedCount = 0;

  for (const lead of userLeads) {
    leads.delete(lead.id);
    deletedCount++;
  }

  if (deletedCount > 0) {
    await saveLeadsToCookie();
  }

  return deletedCount;
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
  await loadLeadsFromCookie();

  const userLeads = Array.from(leads.values()).filter(lead => lead.user_id === userId);

  return {
    total: userLeads.length,
    new: userLeads.filter(l => l.status === 'NEW').length,
    viewed: userLeads.filter(l => l.status === 'VIEWED').length,
    interested: userLeads.filter(l => l.status === 'INTERESTED').length,
    not_interested: userLeads.filter(l => l.status === 'NOT_INTERESTED').length,
    marked_later: userLeads.filter(l => l.status === 'MARKED_LATER').length,
    archived: userLeads.filter(l => l.status === 'ARCHIVED').length,
  };
}
