import { NextRequest, NextResponse } from 'next/server';
import { getSessionUser } from '@/lib/auth';

/**
 * In-memory storage for fingerprints (development only)
 * In production, this would be stored in Supabase user_fingerprints table
 */
const fingerprints: Map<string, { fingerprint: object; collected_at: string }> = new Map();

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

    // Store fingerprint for user
    const collected_at = new Date().toISOString();
    fingerprints.set(user.id, {
      fingerprint,
      collected_at,
    });

    return NextResponse.json(
      {
        message: 'Fingerprint stored successfully',
        collected_at,
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

    const stored = fingerprints.get(user.id);
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
