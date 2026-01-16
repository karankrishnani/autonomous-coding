/**
 * Lead interactions tracking module using Supabase.
 */
import { createClient } from './supabase/server';

export type LeadInteractionAction = 'INTERESTED' | 'NOT_INTERESTED' | 'MARKED_LATER' | 'OPENED_SOURCE';

export interface LeadInteraction {
  id: string;
  lead_id: string;
  user_id: string;
  action: LeadInteractionAction;
  created_at: string;
}

/**
 * Track a lead interaction
 */
export async function trackLeadInteraction(
  leadId: string,
  userId: string,
  action: LeadInteractionAction
): Promise<LeadInteraction> {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from('lead_interactions')
    .insert({
      lead_id: leadId,
      user_id: userId,
      action,
    })
    .select()
    .single();

  if (error) {
    throw new Error(`Failed to track interaction: ${error.message}`);
  }

  return data as LeadInteraction;
}

/**
 * Get all interactions for a lead
 */
export async function getInteractionsForLead(leadId: string, userId: string): Promise<LeadInteraction[]> {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from('lead_interactions')
    .select('*')
    .eq('lead_id', leadId)
    .eq('user_id', userId)
    .order('created_at', { ascending: false });

  if (error) {
    console.error('Failed to get interactions:', error);
    return [];
  }

  return (data || []) as LeadInteraction[];
}

/**
 * Get all interactions for a user
 */
export async function getInteractionsForUser(userId: string): Promise<LeadInteraction[]> {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from('lead_interactions')
    .select('*')
    .eq('user_id', userId)
    .order('created_at', { ascending: false });

  if (error) {
    console.error('Failed to get interactions:', error);
    return [];
  }

  return (data || []) as LeadInteraction[];
}

/**
 * Get interaction counts by action for a user
 */
export async function getInteractionCountsByAction(userId: string): Promise<Record<LeadInteractionAction, number>> {
  const supabase = await createClient();

  const counts: Record<LeadInteractionAction, number> = {
    INTERESTED: 0,
    NOT_INTERESTED: 0,
    MARKED_LATER: 0,
    OPENED_SOURCE: 0,
  };

  const actions: LeadInteractionAction[] = ['INTERESTED', 'NOT_INTERESTED', 'MARKED_LATER', 'OPENED_SOURCE'];

  for (const action of actions) {
    const { count } = await supabase
      .from('lead_interactions')
      .select('*', { count: 'exact', head: true })
      .eq('user_id', userId)
      .eq('action', action);

    counts[action] = count || 0;
  }

  return counts;
}
