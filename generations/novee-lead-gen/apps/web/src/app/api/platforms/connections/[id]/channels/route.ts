import { NextRequest, NextResponse } from 'next/server';
import { getSessionUser } from '@/lib/auth';
import { getConnectionById } from '@/lib/platforms';
import {
  getChannelsForConnection,
  createChannel,
  createChannelsBulk,
  ChannelType,
} from '@/lib/channels';

/**
 * GET /api/platforms/connections/[id]/channels
 * Get all channels for a platform connection
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await getSessionUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id: connectionId } = await params;

    // Verify user owns this connection
    const connection = await getConnectionById(user.id, connectionId);
    if (!connection) {
      return NextResponse.json(
        { error: 'Connection not found' },
        { status: 404 }
      );
    }

    const channels = await getChannelsForConnection(connectionId);
    return NextResponse.json({
      connection_id: connectionId,
      platform: connection.platform,
      channels,
      count: channels.length,
    });
  } catch (error) {
    console.error('Error fetching channels:', error);
    return NextResponse.json(
      { error: 'Something went wrong. Please try again later.' },
      { status: 500 }
    );
  }
}

/**
 * POST /api/platforms/connections/[id]/channels
 * Create channels for a platform connection
 *
 * Body can be either:
 * - Single channel: { name: string, type?: string, metadata?: object }
 * - Bulk channels: { channels: [{ name: string, type?: string, metadata?: object }] }
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await getSessionUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id: connectionId } = await params;

    // Verify user owns this connection
    const connection = await getConnectionById(user.id, connectionId);
    if (!connection) {
      return NextResponse.json(
        { error: 'Connection not found' },
        { status: 404 }
      );
    }

    const body = await request.json();

    // Handle bulk create
    if (body.channels && Array.isArray(body.channels)) {
      const channelData = body.channels.map((c: { name: string; type?: string; metadata?: Record<string, unknown> }) => ({
        name: c.name,
        type: (c.type as ChannelType) || 'public',
        metadata: c.metadata || {},
      }));

      const createdChannels = await createChannelsBulk(connectionId, channelData);
      return NextResponse.json({
        success: true,
        connection_id: connectionId,
        channels: createdChannels,
        count: createdChannels.length,
      }, { status: 201 });
    }

    // Handle single channel create
    const { name, type = 'public', metadata = {} } = body;

    if (!name || typeof name !== 'string') {
      return NextResponse.json(
        { error: 'Channel name is required' },
        { status: 400 }
      );
    }

    const channel = await createChannel(
      connectionId,
      name,
      type as ChannelType,
      metadata
    );

    return NextResponse.json({
      success: true,
      channel,
    }, { status: 201 });
  } catch (error) {
    console.error('Error creating channel:', error);
    return NextResponse.json(
      { error: 'Something went wrong. Please try again later.' },
      { status: 500 }
    );
  }
}
