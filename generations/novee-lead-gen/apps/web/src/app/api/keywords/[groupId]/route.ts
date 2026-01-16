import { NextRequest, NextResponse } from 'next/server';
import { getSessionUser } from '@/lib/auth';
import {
  getKeywordGroupById,
  updateKeywordGroup,
  deleteKeywordGroup,
} from '@/lib/keywords';

interface RouteParams {
  params: Promise<{ groupId: string }>;
}

/**
 * GET /api/keywords/:groupId - Get a specific keyword group
 * RLS: Only returns the group if it belongs to the authenticated user
 */
export async function GET(
  request: NextRequest,
  { params }: RouteParams
) {
  try {
    const user = await getSessionUser();

    if (!user) {
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      );
    }

    const { groupId } = await params;

    // Validate ID format (UUID)
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    if (!uuidRegex.test(groupId)) {
      return NextResponse.json(
        { error: 'Invalid group ID format' },
        { status: 400 }
      );
    }

    const group = getKeywordGroupById(groupId, user.id);

    if (!group) {
      return NextResponse.json(
        { error: 'Keyword group not found' },
        { status: 404 }
      );
    }

    return NextResponse.json({ keyword_group: group });
  } catch (error) {
    console.error('Keywords API error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

/**
 * PUT /api/keywords/:groupId - Update a keyword group
 * RLS: Only updates if the group belongs to the authenticated user
 */
export async function PUT(
  request: NextRequest,
  { params }: RouteParams
) {
  try {
    const user = await getSessionUser();

    if (!user) {
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      );
    }

    const { groupId } = await params;

    // Validate ID format (UUID)
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    if (!uuidRegex.test(groupId)) {
      return NextResponse.json(
        { error: 'Invalid group ID format' },
        { status: 400 }
      );
    }

    const body = await request.json();
    const { keywords, active } = body;

    // Validate keywords if provided
    if (keywords !== undefined) {
      if (!Array.isArray(keywords)) {
        return NextResponse.json(
          { error: 'Keywords must be an array' },
          { status: 400 }
        );
      }

      for (const keyword of keywords) {
        if (typeof keyword !== 'string' || keyword.length < 2 || keyword.length > 50) {
          return NextResponse.json(
            { error: 'Each keyword must be 2-50 characters' },
            { status: 400 }
          );
        }
      }
    }

    const updatedGroup = updateKeywordGroup(groupId, user.id, { keywords, active });

    if (!updatedGroup) {
      return NextResponse.json(
        { error: 'Keyword group not found' },
        { status: 404 }
      );
    }

    return NextResponse.json({ keyword_group: updatedGroup });
  } catch (error) {
    console.error('Keywords API error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/keywords/:groupId - Delete a keyword group
 * RLS: Only deletes if the group belongs to the authenticated user
 */
export async function DELETE(
  request: NextRequest,
  { params }: RouteParams
) {
  try {
    const user = await getSessionUser();

    if (!user) {
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      );
    }

    const { groupId } = await params;

    // Validate ID format (UUID)
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    if (!uuidRegex.test(groupId)) {
      return NextResponse.json(
        { error: 'Invalid group ID format' },
        { status: 400 }
      );
    }

    const deleted = deleteKeywordGroup(groupId, user.id);

    if (!deleted) {
      return NextResponse.json(
        { error: 'Keyword group not found' },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      message: 'Keyword group deleted successfully',
    });
  } catch (error) {
    console.error('Keywords API error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
