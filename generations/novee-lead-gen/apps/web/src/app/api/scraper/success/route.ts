import { NextRequest, NextResponse } from 'next/server';
import { getSessionUser } from '@/lib/auth';
import { logScraperSuccess, PlatformType } from '@/lib/platforms';

/**
 * POST /api/scraper/success - Log a successful scrape
 *
 * This endpoint is called by the desktop app after a successful scrape operation.
 * It updates last_checked_at and clears last_error in the platform_connections table.
 *
 * Request body:
 * - platform: 'SLACK' | 'LINKEDIN'
 *
 * Response:
 * - connection: The updated platform connection
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
    const { platform } = body;

    // Validate required fields
    if (!platform) {
      return NextResponse.json(
        { error: 'Platform is required' },
        { status: 400 }
      );
    }

    // Validate platform type
    const platformUpper = platform.toUpperCase();
    if (platformUpper !== 'SLACK' && platformUpper !== 'LINKEDIN') {
      return NextResponse.json(
        { error: 'Invalid platform. Must be SLACK or LINKEDIN' },
        { status: 400 }
      );
    }

    // Log the successful scrape
    const connection = await logScraperSuccess(
      user.id,
      platformUpper as PlatformType
    );

    if (!connection) {
      return NextResponse.json(
        { error: 'No connection found for platform' },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      connection: {
        id: connection.id,
        platform: connection.platform,
        status: connection.status,
        last_error: connection.last_error,
        last_checked_at: connection.last_checked_at,
      },
    });
  } catch (error) {
    console.error('Scraper success logging failed:', error);
    return NextResponse.json(
      { error: 'Failed to log scraper success' },
      { status: 500 }
    );
  }
}
