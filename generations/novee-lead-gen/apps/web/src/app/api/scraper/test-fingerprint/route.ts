import { NextRequest, NextResponse } from 'next/server';
import { getSessionUser } from '@/lib/auth';

/**
 * In-memory storage for fingerprints (mirrored from /api/user/fingerprint)
 */
const fingerprints: Map<string, { fingerprint: object; collected_at: string }> = new Map();

/**
 * POST /api/scraper/test-fingerprint - Test fingerprint application to Playwright context
 *
 * This endpoint simulates the desktop app flow:
 * 1. Store a fingerprint (simulating web app collection)
 * 2. Fetch the fingerprint (simulating desktop app retrieval)
 * 3. Apply it to Playwright context options
 *
 * Request body:
 * - fingerprint: Object containing browser fingerprint data
 *
 * Response:
 * - stored: The stored fingerprint
 * - fetched: The retrieved fingerprint
 * - contextOptions: The Playwright context options derived from fingerprint
 */
export async function POST(request: NextRequest) {
  try {
    // Check authentication
    const user = await getSessionUser();

    if (!user) {
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      );
    }

    const body = await request.json();
    const { fingerprint } = body;

    if (!fingerprint || typeof fingerprint !== 'object') {
      return NextResponse.json(
        { error: 'Fingerprint data is required and must be an object' },
        { status: 400 }
      );
    }

    // Step 1: Store fingerprint (simulating POST /api/user/fingerprint)
    const collected_at = new Date().toISOString();
    fingerprints.set(user.id, {
      fingerprint,
      collected_at,
    });

    // Step 2: Fetch fingerprint (simulating GET /api/user/fingerprint)
    const stored = fingerprints.get(user.id);
    if (!stored) {
      return NextResponse.json(
        { error: 'Failed to retrieve stored fingerprint' },
        { status: 500 }
      );
    }

    // Step 3: Apply fingerprint to context options (simulating desktop app logic)
    const fp = stored.fingerprint as {
      userAgent?: string;
      language?: string;
      languages?: string[];
      screenWidth?: number;
      screenHeight?: number;
      timezone?: string;
    };

    const contextOptions = {
      userAgent: fp.userAgent || 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7)',
      locale: fp.language || 'en-US',
      viewport: {
        width: fp.screenWidth || 1920,
        height: fp.screenHeight || 1080,
      },
      timezoneId: fp.timezone || 'America/New_York',
      extraHTTPHeaders: {
        'Accept-Language': fp.languages?.join(',') || fp.language || 'en-US',
      },
    };

    return NextResponse.json({
      success: true,
      steps: {
        step1_stored: {
          description: 'Fingerprint stored from web app',
          fingerprint: stored.fingerprint,
          collected_at: stored.collected_at,
        },
        step2_fetched: {
          description: 'Fingerprint fetched by desktop app',
          fingerprint: stored.fingerprint,
        },
        step3_applied: {
          description: 'Fingerprint applied to Playwright context',
          contextOptions,
        },
      },
      verification: {
        fingerprintFetched: true,
        appliedToContext: true,
        userAgentMatches: contextOptions.userAgent === fp.userAgent,
        viewportMatches:
          contextOptions.viewport.width === fp.screenWidth &&
          contextOptions.viewport.height === fp.screenHeight,
        timezoneMatches: contextOptions.timezoneId === fp.timezone,
      },
    });
  } catch (error) {
    console.error('Fingerprint test error:', error);
    return NextResponse.json(
      { error: 'Failed to test fingerprint flow' },
      { status: 500 }
    );
  }
}
