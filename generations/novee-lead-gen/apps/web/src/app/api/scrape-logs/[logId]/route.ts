/**
 * Scrape Log API - Update a specific scrape log
 *
 * PATCH: Update scrape log (complete, fail, update progress)
 */

import { NextResponse } from 'next/server';
import { getSessionUser } from '@/lib/auth';
import {
  updateScrapeLog,
  completeScrapeLog,
  failScrapeLog,
} from '@/lib/scrape-logs';

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ logId: string }> }
) {
  try {
    const user = await getSessionUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { logId } = await params;
    const body = await request.json();
    const { action, messagesFound, leadsCreated, errorMessage, metadata } = body;

    let log;

    switch (action) {
      case 'complete':
        log = await completeScrapeLog(
          logId,
          messagesFound || 0,
          leadsCreated || 0,
          metadata
        );
        break;

      case 'fail':
        log = await failScrapeLog(logId, errorMessage || 'Unknown error', metadata);
        break;

      case 'update':
        log = await updateScrapeLog(logId, {
          messages_found: messagesFound,
          leads_created: leadsCreated,
          metadata,
        });
        break;

      default:
        return NextResponse.json(
          { error: 'Invalid action. Must be "complete", "fail", or "update"' },
          { status: 400 }
        );
    }

    if (!log) {
      return NextResponse.json(
        { error: 'Failed to update scrape log' },
        { status: 500 }
      );
    }

    return NextResponse.json({ log });
  } catch (error) {
    console.error('Update scrape log error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
