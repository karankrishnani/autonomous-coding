import { NextRequest, NextResponse } from 'next/server';
import { getSessionUser } from '@/lib/auth';
import {
  getSessionsForUser,
  createSession,
} from '@/lib/desktop-sessions';

/**
 * GET /api/desktop/session
 * Get all desktop sessions for the current user
 */
export async function GET() {
  const user = await getSessionUser();

  if (!user) {
    return NextResponse.json(
      { error: 'Authentication required' },
      { status: 401 }
    );
  }

  try {
    const sessions = getSessionsForUser(user.id);
    return NextResponse.json({ sessions });
  } catch (error) {
    console.error('Failed to fetch desktop sessions:', error);
    return NextResponse.json(
      { error: 'Something went wrong. Please try again later.' },
      { status: 500 }
    );
  }
}

/**
 * POST /api/desktop/session
 * Register a new desktop app session
 */
export async function POST(request: NextRequest) {
  const user = await getSessionUser();

  if (!user) {
    return NextResponse.json(
      { error: 'Authentication required' },
      { status: 401 }
    );
  }

  try {
    const body = await request.json();
    const { device_label, os_type } = body;

    if (!device_label || typeof device_label !== 'string') {
      return NextResponse.json(
        { error: 'device_label is required' },
        { status: 400 }
      );
    }

    if (!os_type || typeof os_type !== 'string') {
      return NextResponse.json(
        { error: 'os_type is required' },
        { status: 400 }
      );
    }

    // Validate os_type
    const validOsTypes = ['Windows', 'Mac', 'Linux'];
    if (!validOsTypes.includes(os_type)) {
      return NextResponse.json(
        { error: 'os_type must be one of: Windows, Mac, Linux' },
        { status: 400 }
      );
    }

    const session = createSession(user.id, device_label, os_type);
    return NextResponse.json({ session }, { status: 201 });
  } catch (error) {
    console.error('Failed to create desktop session:', error);
    return NextResponse.json(
      { error: 'Something went wrong. Please try again later.' },
      { status: 500 }
    );
  }
}
