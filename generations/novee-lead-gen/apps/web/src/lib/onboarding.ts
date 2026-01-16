/**
 * Onboarding events module for tracking user progress.
 * In production, this would use Supabase.
 */

import { cookies } from 'next/headers';

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

// Cookie name for onboarding events storage
const ONBOARDING_COOKIE = 'novee_dev_onboarding';

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
 * Load onboarding events from cookie
 */
async function loadEventsFromCookie(): Promise<OnboardingEvent[]> {
  try {
    const cookieStore = await cookies();
    const cookie = cookieStore.get(ONBOARDING_COOKIE)?.value;
    if (!cookie) return [];
    return JSON.parse(Buffer.from(cookie, 'base64').toString('utf-8'));
  } catch {
    return [];
  }
}

/**
 * Save onboarding events to cookie
 */
async function saveEventsToCookie(events: OnboardingEvent[]): Promise<void> {
  try {
    const cookieStore = await cookies();
    const data = Buffer.from(JSON.stringify(events)).toString('base64');
    cookieStore.set(ONBOARDING_COOKIE, data, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 60 * 60 * 24 * 30, // 30 days
      path: '/',
    });
  } catch (error) {
    console.error('Failed to save onboarding events to cookie:', error);
  }
}

/**
 * Track an onboarding event for a user
 */
export async function trackOnboardingEvent(
  userId: string,
  event: OnboardingEventType,
  metadata: Record<string, unknown> = {},
  platformConnectionId?: string
): Promise<OnboardingEvent> {
  const allEvents = await loadEventsFromCookie();

  const now = new Date().toISOString();
  const newEvent: OnboardingEvent = {
    id: generateId(),
    user_id: userId,
    event,
    platform_connection_id: platformConnectionId || null,
    occurred_at: now,
    metadata,
    created_at: now,
  };

  allEvents.push(newEvent);
  await saveEventsToCookie(allEvents);

  return newEvent;
}

/**
 * Get all onboarding events for a user
 */
export async function getOnboardingEventsForUser(userId: string): Promise<OnboardingEvent[]> {
  const allEvents = await loadEventsFromCookie();
  return allEvents.filter((e) => e.user_id === userId);
}

/**
 * Check if a specific event has been completed for a user
 */
export async function hasCompletedEvent(
  userId: string,
  event: OnboardingEventType
): Promise<boolean> {
  const events = await getOnboardingEventsForUser(userId);
  return events.some((e) => e.event === event);
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
