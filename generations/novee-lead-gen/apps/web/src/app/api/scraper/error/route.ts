import { NextRequest, NextResponse } from 'next/server';
import { getSessionUser } from '@/lib/auth';
import {
  logScraperError,
  getConnectionByPlatform,
  PlatformType,
} from '@/lib/platforms';

/**
 * POST /api/scraper/error - Log a scraper error
 *
 * This endpoint is called by the desktop app when a scraper operation fails.
 * It stores the error message in the platform_connections table.
 *
 * Request body:
 * - platform: 'SLACK' | 'LINKEDIN'
 * - error: string - The error message to log
 *
 * Response:
 * - connection: The updated platform connection with the error logged
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
    const { platform, error: errorMessage } = body;

    // Validate required fields
    if (!platform) {
      return NextResponse.json(
        { error: 'Platform is required' },
        { status: 400 }
      );
    }

    if (!errorMessage) {
      return NextResponse.json(
        { error: 'Error message is required' },
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

    // Log the scraper error
    const connection = await logScraperError(
      user.id,
      platformUpper as PlatformType,
      errorMessage
    );

    if (!connection) {
      return NextResponse.json(
        { error: 'Failed to log error' },
        { status: 500 }
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
    console.error('Scraper error logging failed:', error);
    return NextResponse.json(
      { error: 'Failed to log scraper error' },
      { status: 500 }
    );
  }
}

/**
 * GET /api/scraper/error - Get the last scraper error for a platform
 *
 * Query params:
 * - platform: 'SLACK' | 'LINKEDIN'
 *
 * Response:
 * - connection: The platform connection with error info
 */
export async function GET(request: NextRequest) {
  try {
    // Check authentication
    const user = await getSessionUser();

    if (!user) {
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      );
    }

    const { searchParams } = new URL(request.url);
    const platform = searchParams.get('platform');

    if (!platform) {
      return NextResponse.json(
        { error: 'Platform query parameter is required' },
        { status: 400 }
      );
    }

    const platformUpper = platform.toUpperCase();
    if (platformUpper !== 'SLACK' && platformUpper !== 'LINKEDIN') {
      return NextResponse.json(
        { error: 'Invalid platform. Must be SLACK or LINKEDIN' },
        { status: 400 }
      );
    }

    const connection = await getConnectionByPlatform(
      user.id,
      platformUpper as PlatformType
    );

    if (!connection) {
      return NextResponse.json({
        connection: null,
        last_error: null,
      });
    }

    return NextResponse.json({
      connection: {
        id: connection.id,
        platform: connection.platform,
        status: connection.status,
        last_error: connection.last_error,
        last_checked_at: connection.last_checked_at,
      },
    });
  } catch (error) {
    console.error('Failed to get scraper error:', error);
    return NextResponse.json(
      { error: 'Failed to get scraper error' },
      { status: 500 }
    );
  }
}
