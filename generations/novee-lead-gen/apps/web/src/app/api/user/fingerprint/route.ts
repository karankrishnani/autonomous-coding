import { NextRequest, NextResponse } from 'next/server';
import { getSessionUser } from '@/lib/auth';
import { getFingerprintForUser, upsertFingerprint } from '@/lib/fingerprints';
import { trackOnboardingEvent, hasCompletedEvent } from '@/lib/onboarding';

/**
 * POST /api/user/fingerprint
 * Store browser fingerprint for the current user
 */
export async function POST(request: NextRequest) {
  try {
    const user = await getSessionUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { fingerprint } = body;

    if (!fingerprint || typeof fingerprint !== 'object') {
      return NextResponse.json(
        { error: 'Fingerprint data is required and must be an object' },
        { status: 400 }
      );
    }

    // Store fingerprint in database
    const stored = await upsertFingerprint(user.id, fingerprint);

    // Track BROWSER_FINGERPRINT_CAPTURED event if not already tracked
    const alreadyCaptured = await hasCompletedEvent(user.id, 'BROWSER_FINGERPRINT_CAPTURED');
    if (!alreadyCaptured) {
      try {
        await trackOnboardingEvent(user.id, 'BROWSER_FINGERPRINT_CAPTURED', {
          user_agent: fingerprint.userAgent || null,
          screen_resolution: fingerprint.screenResolution || null,
          timezone: fingerprint.timezone || null,
        });
      } catch (trackError) {
        // Log but don't fail if tracking fails
        console.error('Failed to track fingerprint event:', trackError);
      }
    }

    return NextResponse.json(
      {
        message: 'Fingerprint stored successfully',
        collected_at: stored.collected_at,
      },
      { status: 201 }
    );
  } catch (error) {
    console.error('Error storing fingerprint:', error);
    return NextResponse.json(
      { error: 'Something went wrong. Please try again later.' },
      { status: 500 }
    );
  }
}

/**
 * GET /api/user/fingerprint
 * Get stored fingerprint for the current user (used by desktop app)
 */
export async function GET() {
  try {
    const user = await getSessionUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const stored = await getFingerprintForUser(user.id);
    if (!stored) {
      return NextResponse.json(
        { error: 'No fingerprint stored for this user' },
        { status: 404 }
      );
    }

    return NextResponse.json({
      fingerprint: stored.fingerprint,
      collected_at: stored.collected_at,
    });
  } catch (error) {
    console.error('Error fetching fingerprint:', error);
    return NextResponse.json(
      { error: 'Something went wrong. Please try again later.' },
      { status: 500 }
    );
  }
}
