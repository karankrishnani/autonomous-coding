/**
 * Onboarding events module using Supabase.
 */
import { createServiceRoleClient } from './supabase/server';

export type OnboardingEventType =
  | 'ACCOUNT_CREATED'
  | 'WEB_LOGIN'
  | 'BROWSER_FINGERPRINT_CAPTURED'
  | 'DESKTOP_DOWNLOADED'
  | 'DESKTOP_INSTALLED'
  | 'PLATFORM_CONNECTED'
  | 'KEYWORDS_SELECTED'
  | 'FIRST_LEAD_VIEWED';

export interface OnboardingEvent {
  id: string;
  user_id: string;
  event: OnboardingEventType;
  platform_connection_id: string | null;
  occurred_at: string;
  metadata: Record<string, unknown>;
  created_at: string;
}

/**
 * Track an onboarding event for a user
 * Uses service role client to bypass RLS since this is called before session is established
 */
export async function trackOnboardingEvent(
  userId: string,
  event: OnboardingEventType,
  metadata: Record<string, unknown> = {},
  platformConnectionId?: string
): Promise<OnboardingEvent> {
  // Use service role client to bypass RLS - this is needed because
  // onboarding events are tracked during signup/login before the session cookie is set
  const supabase = await createServiceRoleClient();

  const { data, error } = await supabase
    .from('onboarding_events')
    .insert({
      user_id: userId,
      event,
      platform_connection_id: platformConnectionId || null,
      metadata,
    })
    .select()
    .single();

  if (error) {
    throw new Error(`Failed to track onboarding event: ${error.message}`);
  }

  return data as OnboardingEvent;
}

/**
 * Get all onboarding events for a user
 * Uses service role client to bypass RLS since user is validated at API layer
 */
export async function getOnboardingEventsForUser(userId: string): Promise<OnboardingEvent[]> {
  const supabase = await createServiceRoleClient();

  const { data, error } = await supabase
    .from('onboarding_events')
    .select('*')
    .eq('user_id', userId)
    .order('occurred_at', { ascending: true });

  if (error) {
    console.error('Failed to get onboarding events:', error);
    return [];
  }

  return (data || []) as OnboardingEvent[];
}

/**
 * Check if a specific event has been completed for a user
 * Uses service role client to bypass RLS since user is validated at API layer
 */
export async function hasCompletedEvent(
  userId: string,
  event: OnboardingEventType
): Promise<boolean> {
  const supabase = await createServiceRoleClient();

  const { count, error } = await supabase
    .from('onboarding_events')
    .select('*', { count: 'exact', head: true })
    .eq('user_id', userId)
    .eq('event', event);

  if (error) {
    console.error('Failed to check event completion:', error);
    return false;
  }

  return (count || 0) > 0;
}

/**
 * Get onboarding status for a user
 */
export async function getOnboardingStatus(userId: string): Promise<{
  completedEvents: OnboardingEventType[];
  pendingEvents: OnboardingEventType[];
  progress: number;
}> {
  const events = await getOnboardingEventsForUser(userId);
  const completedEvents = [...new Set(events.map((e) => e.event))];

  const allEvents: OnboardingEventType[] = [
    'ACCOUNT_CREATED',
    'WEB_LOGIN',
    'BROWSER_FINGERPRINT_CAPTURED',
    'DESKTOP_DOWNLOADED',
    'DESKTOP_INSTALLED',
    'PLATFORM_CONNECTED',
    'KEYWORDS_SELECTED',
    'FIRST_LEAD_VIEWED',
  ];

  const pendingEvents = allEvents.filter((e) => !completedEvents.includes(e));
  const progress = Math.round((completedEvents.length / allEvents.length) * 100);

  return {
    completedEvents,
    pendingEvents,
    progress,
  };
}
