import { NextRequest, NextResponse } from 'next/server';
import { getSessionUser } from '@/lib/auth';
import {
  getKeywordGroupsByUserId,
  createKeywordGroup,
  getAllKeywordsForUser,
  clearAllKeywordsForUser,
  deleteKeywordForUser
} from '@/lib/keywords';
import { trackOnboardingEvent, hasCompletedEvent } from '@/lib/onboarding';

/**
 * GET /api/keywords - List keywords for the authenticated user
 * RLS: Only returns keyword groups belonging to the authenticated user
 */
export async function GET() {
  try {
    // Check authentication
    const user = await getSessionUser();

    if (!user) {
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      );
    }

    // Get keyword groups scoped to this user (RLS)
    const keywordGroups = await getKeywordGroupsByUserId(user.id);
    const allKeywords = await getAllKeywordsForUser(user.id);

    return NextResponse.json({
      keyword_groups: keywordGroups,
      all_keywords: allKeywords,
    });
  } catch (error) {
    console.error('Keywords API error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

/**
 * POST /api/keywords - Create a new keyword group
 * RLS: Creates keyword group owned by the authenticated user
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
    const { keywords } = body;

    if (!keywords || !Array.isArray(keywords) || keywords.length === 0) {
      return NextResponse.json(
        { error: 'Keywords array is required' },
        { status: 400 }
      );
    }

    // Validate each keyword
    for (const keyword of keywords) {
      if (typeof keyword !== 'string' || keyword.length < 2 || keyword.length > 50) {
        return NextResponse.json(
          { error: 'Each keyword must be 2-50 characters' },
          { status: 400 }
        );
      }
    }

    // Create keyword group owned by this user (RLS)
    const keywordGroup = await createKeywordGroup(user.id, keywords);

    // Track KEYWORDS_SELECTED onboarding event (first time only)
    try {
      const alreadySelectedKeywords = await hasCompletedEvent(user.id, 'KEYWORDS_SELECTED');
      if (!alreadySelectedKeywords) {
        await trackOnboardingEvent(user.id, 'KEYWORDS_SELECTED', {
          keywordCount: keywords.length,
          keywords: keywords.slice(0, 10), // Store first 10 keywords for reference
        });
      }
    } catch (trackError) {
      // Log but don't fail keyword creation if tracking fails
      console.error('Failed to track onboarding event:', trackError);
    }

    return NextResponse.json({
      message: 'Keywords created successfully',
      keyword_group: keywordGroup,
    }, { status: 201 });
  } catch (error) {
    console.error('Keywords API error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/keywords - Clear all keywords or delete a specific keyword
 * RLS: Only deletes keyword groups belonging to the authenticated user
 *
 * Body params (optional):
 * - keyword: string - If provided, only deletes this specific keyword
 * - If no body, clears all keywords
 */
export async function DELETE(request: NextRequest) {
  try {
    // Check authentication
    const user = await getSessionUser();

    if (!user) {
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      );
    }

    // Check if there's a body with a specific keyword to delete
    let body: { keyword?: string } = {};
    try {
      body = await request.json();
    } catch {
      // No body or invalid JSON - proceed with clear all
    }

    if (body.keyword) {
      // Delete a specific keyword
      const deleted = await deleteKeywordForUser(user.id, body.keyword);

      if (!deleted) {
        return NextResponse.json(
          { error: 'Keyword not found' },
          { status: 404 }
        );
      }

      return NextResponse.json({
        message: 'Keyword deleted successfully',
        keyword: body.keyword,
      });
    }

    // Clear all keywords for this user (RLS)
    const deletedCount = await clearAllKeywordsForUser(user.id);

    return NextResponse.json({
      message: 'All keywords cleared successfully',
      deleted_count: deletedCount,
    });
  } catch (error) {
    console.error('Keywords API error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
