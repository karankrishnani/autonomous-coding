import { NextRequest, NextResponse } from 'next/server';
import { getSessionUser } from '@/lib/auth';

/**
 * GET /api/keywords - List keywords for the authenticated user
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

    // For now, return empty keywords
    // In production, this would fetch from Supabase
    return NextResponse.json({
      keyword_groups: [],
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

    // For now, return success
    // In production, this would save to Supabase
    return NextResponse.json({
      message: 'Keywords created successfully',
      keyword_group: {
        id: 'mock-id',
        keywords,
        active: true,
        created_at: new Date().toISOString(),
      },
    });
  } catch (error) {
    console.error('Keywords API error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
