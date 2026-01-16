import { NextRequest, NextResponse } from 'next/server';
import { getSessionUser } from '@/lib/auth';
import {
  getConnectionsForUser,
  getConnectionByPlatform,
  createConnection,
  deleteConnection,
  updatePlatformMetadata,
  PlatformType,
  PlatformConnectionStatus,
} from '@/lib/platforms';
import { getScrapeStats } from '@/lib/scrape-logs';

/**
 * GET /api/platforms/connections
 * Get all platform connections for the current user
 * Includes last scrape info from scrape_logs
 */
export async function GET() {
  try {
    const user = await getSessionUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const connections = await getConnectionsForUser(user.id);

    // Enrich connections with scrape stats
    const connectionsWithStats = await Promise.all(
      connections.map(async (connection) => {
        const stats = await getScrapeStats(connection.id);
        return {
          ...connection,
          lastScrapeAt: stats.lastScrapeAt,
          lastScrapeStatus: stats.lastScrapeStatus,
          scrapeStats: {
            totalScrapes: stats.totalScrapes,
            successfulScrapes: stats.successfulScrapes,
            failedScrapes: stats.failedScrapes,
            totalMessagesFound: stats.totalMessagesFound,
            totalLeadsCreated: stats.totalLeadsCreated,
          },
        };
      })
    );

    return NextResponse.json({ connections: connectionsWithStats });
  } catch (error) {
    console.error('Error fetching platform connections:', error);
    return NextResponse.json(
      { error: 'Something went wrong. Please try again later.' },
      { status: 500 }
    );
  }
}

/**
 * POST /api/platforms/connections
 * Create a new platform connection
 */
export async function POST(request: NextRequest) {
  try {
    const user = await getSessionUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { platform, status } = body;

    // Validate platform
    if (!platform || !['SLACK', 'LINKEDIN'].includes(platform)) {
      return NextResponse.json(
        { error: 'Invalid platform. Must be SLACK or LINKEDIN.' },
        { status: 400 }
      );
    }

    // Check if connection already exists
    const existing = await getConnectionByPlatform(user.id, platform as PlatformType);
    if (existing) {
      return NextResponse.json(
        { error: 'Platform connection already exists.' },
        { status: 409 }
      );
    }

    // Create connection
    const connection = await createConnection(
      user.id,
      platform as PlatformType,
      (status as PlatformConnectionStatus) || 'PENDING'
    );

    return NextResponse.json({ connection }, { status: 201 });
  } catch (error) {
    console.error('Error creating platform connection:', error);
    return NextResponse.json(
      { error: 'Something went wrong. Please try again later.' },
      { status: 500 }
    );
  }
}

/**
 * PUT /api/platforms/connections
 * Update a platform connection with metadata
 * Body: { platform: string, metadata: object, status?: string }
 */
export async function PUT(request: NextRequest) {
  try {
    const user = await getSessionUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { platform, metadata, status } = body;

    // Validate platform
    if (!platform || !['SLACK', 'LINKEDIN'].includes(platform)) {
      return NextResponse.json(
        { error: 'Invalid platform. Must be SLACK or LINKEDIN.' },
        { status: 400 }
      );
    }

    // Validate metadata
    if (!metadata || typeof metadata !== 'object') {
      return NextResponse.json(
        { error: 'Metadata is required and must be an object.' },
        { status: 400 }
      );
    }

    // Update or create connection with metadata
    const connection = await updatePlatformMetadata(
      user.id,
      platform as PlatformType,
      metadata,
      status as PlatformConnectionStatus | undefined
    );

    return NextResponse.json({
      success: true,
      connection: {
        id: connection.id,
        platform: connection.platform,
        status: connection.status,
        metadata: connection.metadata,
        last_checked_at: connection.last_checked_at,
        connected_at: connection.connected_at,
      },
    });
  } catch (error) {
    console.error('Error updating platform metadata:', error);
    return NextResponse.json(
      { error: 'Something went wrong. Please try again later.' },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/platforms/connections
 * Disconnect a platform connection
 * Body: { connectionId: string }
 */
export async function DELETE(request: NextRequest) {
  try {
    const user = await getSessionUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { connectionId } = body;

    if (!connectionId) {
      return NextResponse.json(
        { error: 'Connection ID is required.' },
        { status: 400 }
      );
    }

    const deleted = await deleteConnection(user.id, connectionId);
    if (!deleted) {
      return NextResponse.json(
        { error: 'Connection not found or already deleted.' },
        { status: 404 }
      );
    }

    return NextResponse.json({ success: true, message: 'Platform disconnected successfully.' });
  } catch (error) {
    console.error('Error disconnecting platform:', error);
    return NextResponse.json(
      { error: 'Something went wrong. Please try again later.' },
      { status: 500 }
    );
  }
}
