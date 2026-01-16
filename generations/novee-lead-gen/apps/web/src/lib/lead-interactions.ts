/**
 * Lead interactions tracking module.
 * Tracks user actions on leads: INTERESTED, NOT_INTERESTED, MARKED_LATER, OPENED_SOURCE
 */

import { cookies } from 'next/headers';

export type LeadInteractionAction = 'INTERESTED' | 'NOT_INTERESTED' | 'MARKED_LATER' | 'OPENED_SOURCE';

export interface LeadInteraction {
  id: string;
  lead_id: string;
  user_id: string;
  action: LeadInteractionAction;
  created_at: string;
}

// Cookie name for lead interactions storage
const INTERACTIONS_COOKIE = 'novee_dev_lead_interactions';

/**
 * Generate a simple UUID-like ID
 */
function generateId(): string {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function (c) {
    const r = (Math.random() * 16) | 0;
    const v = c === 'x' ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
}

/**
 * Load lead interactions from cookie
 */
async function loadInteractionsFromCookie(): Promise<LeadInteraction[]> {
  try {
    const cookieStore = await cookies();
    const cookie = cookieStore.get(INTERACTIONS_COOKIE)?.value;
    if (!cookie) return [];
    return JSON.parse(Buffer.from(cookie, 'base64').toString('utf-8'));
  } catch {
    return [];
  }
}

/**
 * Save lead interactions to cookie
 */
async function saveInteractionsToCookie(interactions: LeadInteraction[]): Promise<void> {
  try {
    const cookieStore = await cookies();
    const data = Buffer.from(JSON.stringify(interactions)).toString('base64');
    cookieStore.set(INTERACTIONS_COOKIE, data, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 60 * 60 * 24 * 30, // 30 days
      path: '/',
    });
  } catch (error) {
    console.error('Failed to save lead interactions to cookie:', error);
  }
}

/**
 * Track a lead interaction
 */
export async function trackLeadInteraction(
  leadId: string,
  userId: string,
  action: LeadInteractionAction
): Promise<LeadInteraction> {
  const allInteractions = await loadInteractionsFromCookie();

  const now = new Date().toISOString();
  const newInteraction: LeadInteraction = {
    id: generateId(),
    lead_id: leadId,
    user_id: userId,
    action,
    created_at: now,
  };

  allInteractions.push(newInteraction);
  await saveInteractionsToCookie(allInteractions);

  return newInteraction;
}

/**
 * Get all interactions for a lead
 */
export async function getInteractionsForLead(leadId: string, userId: string): Promise<LeadInteraction[]> {
  const allInteractions = await loadInteractionsFromCookie();
  return allInteractions.filter((i) => i.lead_id === leadId && i.user_id === userId);
}

/**
 * Get all interactions for a user
 */
export async function getInteractionsForUser(userId: string): Promise<LeadInteraction[]> {
  const allInteractions = await loadInteractionsFromCookie();
  return allInteractions.filter((i) => i.user_id === userId);
}

/**
 * Get interaction counts by action for a user
 */
export async function getInteractionCountsByAction(userId: string): Promise<Record<LeadInteractionAction, number>> {
  const interactions = await getInteractionsForUser(userId);

  const counts: Record<LeadInteractionAction, number> = {
    INTERESTED: 0,
    NOT_INTERESTED: 0,
    MARKED_LATER: 0,
    OPENED_SOURCE: 0,
  };

  for (const interaction of interactions) {
    counts[interaction.action]++;
  }

  return counts;
}
