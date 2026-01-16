import { NextRequest, NextResponse } from 'next/server';
import { getSessionUser } from '@/lib/auth';
import {
  getOnboardingEventsForUser,
  trackOnboardingEvent,
  OnboardingEventType,
} from '@/lib/onboarding';

/**
 * GET /api/onboarding/events - Get all onboarding events for the current user
 */
export async function GET() {
  const user = await getSessionUser();

  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const events = await getOnboardingEventsForUser(user.id);

  return NextResponse.json({ events });
}

/**
 * POST /api/onboarding/events - Track a new onboarding event
 */
export async function POST(request: NextRequest) {
  const user = await getSessionUser();

  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const body = await request.json();
    const { event, metadata, platformConnectionId } = body;

    if (!event) {
      return NextResponse.json({ error: 'Event type is required' }, { status: 400 });
    }

    // Validate event type
    const validEvents: OnboardingEventType[] = [
      'ACCOUNT_CREATED',
      'WEB_LOGIN',
      'BROWSER_FINGERPRINT_CAPTURED',
      'DESKTOP_DOWNLOADED',
      'DESKTOP_INSTALLED',
      'PLATFORM_CONNECTED',
      'KEYWORDS_SELECTED',
      'FIRST_LEAD_VIEWED',
    ];

    if (!validEvents.includes(event)) {
      return NextResponse.json({ error: 'Invalid event type' }, { status: 400 });
    }

    const newEvent = await trackOnboardingEvent(
      user.id,
      event,
      metadata || {},
      platformConnectionId
    );

    return NextResponse.json({ event: newEvent }, { status: 201 });
  } catch (error) {
    console.error('Failed to track onboarding event:', error);
    return NextResponse.json(
      { error: 'Failed to track event' },
      { status: 500 }
    );
  }
}
