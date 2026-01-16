/**
 * Scrape Logs API - Create and list scrape logs
 *
 * POST: Create a new scrape log
 * GET: Get scrape logs for the authenticated user
 */

import { NextResponse } from 'next/server';
import { getSessionUser } from '@/lib/auth';
import {
  createScrapeLog,
  getScrapeLogsByUserId,
} from '@/lib/scrape-logs';

export async function POST(request: Request) {
  try {
    const user = await getSessionUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { connectionId, status = 'RUNNING' } = body;

    if (!connectionId) {
      return NextResponse.json(
        { error: 'connectionId is required' },
        { status: 400 }
      );
    }

    const log = await createScrapeLog(connectionId, user.id, status);

    if (!log) {
      return NextResponse.json(
        { error: 'Failed to create scrape log' },
        { status: 500 }
      );
    }

    return NextResponse.json({ log });
  } catch (error) {
    console.error('Create scrape log error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

export async function GET() {
  try {
    const user = await getSessionUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const logs = await getScrapeLogsByUserId(user.id);

    return NextResponse.json({ logs });
  } catch (error) {
    console.error('Get scrape logs error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
