import { NextRequest, NextResponse } from 'next/server';
import { getSessionUser } from '@/lib/auth';
import {
  getSessionById,
  updateSessionHeartbeat,
  updateSessionLabel,
  deleteSession,
} from '@/lib/desktop-sessions';

interface RouteParams {
  params: Promise<{ id: string }>;
}

/**
 * GET /api/desktop/session/:id
 * Get a specific desktop session
 */
export async function GET(request: NextRequest, { params }: RouteParams) {
  const user = await getSessionUser();
  const { id } = await params;

  if (!user) {
    return NextResponse.json(
      { error: 'Authentication required' },
      { status: 401 }
    );
  }

  try {
    const session = getSessionById(id, user.id);

    if (!session) {
      return NextResponse.json(
        { error: 'Session not found' },
        { status: 404 }
      );
    }

    return NextResponse.json({ session });
  } catch (error) {
    console.error('Failed to fetch desktop session:', error);
    return NextResponse.json(
      { error: 'Something went wrong. Please try again later.' },
      { status: 500 }
    );
  }
}

/**
 * PUT /api/desktop/session/:id
 * Update a desktop session (heartbeat or label)
 */
export async function PUT(request: NextRequest, { params }: RouteParams) {
  const user = await getSessionUser();
  const { id } = await params;

  if (!user) {
    return NextResponse.json(
      { error: 'Authentication required' },
      { status: 401 }
    );
  }

  try {
    const body = await request.json();
    const { device_label, heartbeat } = body;

    let session = null;

    // If heartbeat is true, just update the last_seen_at
    if (heartbeat === true) {
      session = updateSessionHeartbeat(id, user.id);
    } else if (device_label && typeof device_label === 'string') {
      // Update the device label
      session = updateSessionLabel(id, user.id, device_label);
    } else {
      return NextResponse.json(
        { error: 'Either heartbeat or device_label must be provided' },
        { status: 400 }
      );
    }

    if (!session) {
      return NextResponse.json(
        { error: 'Session not found' },
        { status: 404 }
      );
    }

    return NextResponse.json({ session });
  } catch (error) {
    console.error('Failed to update desktop session:', error);
    return NextResponse.json(
      { error: 'Something went wrong. Please try again later.' },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/desktop/session/:id
 * Delete a desktop session
 */
export async function DELETE(request: NextRequest, { params }: RouteParams) {
  const user = await getSessionUser();
  const { id } = await params;

  if (!user) {
    return NextResponse.json(
      { error: 'Authentication required' },
      { status: 401 }
    );
  }

  try {
    const deleted = deleteSession(id, user.id);

    if (!deleted) {
      return NextResponse.json(
        { error: 'Session not found' },
        { status: 404 }
      );
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Failed to delete desktop session:', error);
    return NextResponse.json(
      { error: 'Something went wrong. Please try again later.' },
      { status: 500 }
    );
  }
}
