import { NextRequest, NextResponse } from 'next/server';
import { getSessionUser } from '@/lib/auth';
import { getLeadsByUserIdPaginated, createLead, getLeadStats, getDemoLeads, userHasLeads } from '@/lib/leads';

/**
 * GET /api/leads - List leads for the authenticated user
 * Shows demo leads for new users who haven't connected platforms yet
 *
 * Query parameters:
 * - page: Page number (default: 1)
 * - limit: Items per page (default: 20, max: 100)
 * - status: Filter by lead status (NEW, VIEWED, INTERESTED, NOT_INTERESTED, MARKED_LATER, ARCHIVED)
 * - platform: Filter by platform (SLACK, LINKEDIN)
 * - keyword: Filter by keyword match
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

    // Parse query parameters
    const { searchParams } = new URL(request.url);
    const page = Math.max(1, parseInt(searchParams.get('page') || '1', 10));
    const limit = Math.min(100, Math.max(1, parseInt(searchParams.get('limit') || '20', 10)));
    const statusFilter = searchParams.get('status')?.toUpperCase();
    const platformFilter = searchParams.get('platform')?.toUpperCase();
    const keywordFilter = searchParams.get('keyword');

    // Get paginated leads for the user
    const paginatedResult = await getLeadsByUserIdPaginated(user.id, page, limit);
    const stats = await getLeadStats(user.id);
    const hasRealLeads = await userHasLeads(user.id);

    // If user has no real leads, show demo leads
    let responseLeads = paginatedResult.data;
    let showingDemoLeads = false;
    let total = paginatedResult.total;
    let totalPages = paginatedResult.totalPages;
    let hasMore = paginatedResult.hasMore;

    if (!hasRealLeads) {
      let demoLeads = await getDemoLeads(user.id);

      // Apply filters to demo leads
      if (statusFilter) {
        demoLeads = demoLeads.filter(lead => lead.status === statusFilter);
      }
      if (platformFilter) {
        demoLeads = demoLeads.filter(lead => lead.post?.platform === platformFilter);
      }
      if (keywordFilter) {
        const lowerKeyword = keywordFilter.toLowerCase();
        demoLeads = demoLeads.filter(lead =>
          lead.matched_keywords.some(kw => kw.toLowerCase().includes(lowerKeyword))
        );
      }

      // Apply pagination to filtered demo leads
      total = demoLeads.length;
      totalPages = Math.ceil(total / limit);
      const startIndex = (page - 1) * limit;
      const endIndex = startIndex + limit;
      responseLeads = demoLeads.slice(startIndex, endIndex);
      hasMore = page < totalPages;
      showingDemoLeads = true;
    }
    // Note: For real leads, server-side filtering is NOT applied here.
    // The pagination metadata from getLeadsByUserIdPaginated is used as-is.
    // Client-side filtering is done in the frontend for real-time responsiveness.

    return NextResponse.json({
      leads: responseLeads,
      total,
      page,
      pageSize: limit,
      totalPages,
      hasMore,
      stats: showingDemoLeads ? {
        total: total,
        new: total,
        viewed: 0,
        interested: 0,
        not_interested: 0,
        marked_later: 0,
        archived: 0,
      } : stats,
      userName: user.name,
      showingDemoLeads,
    });
  } catch (error) {
    console.error('Leads API error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

/**
 * POST /api/leads - Create a new lead (for testing purposes)
 * In production, leads would be created by the scraper
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
    const { content, keywords, platform, channelName, senderName } = body;

    // Validate required fields
    if (!content || typeof content !== 'string' || content.trim() === '') {
      return NextResponse.json(
        { error: 'Content is required' },
        { status: 400 }
      );
    }

    if (!keywords || !Array.isArray(keywords) || keywords.length === 0) {
      return NextResponse.json(
        { error: 'Keywords array is required' },
        { status: 400 }
      );
    }

    // Create the lead
    const lead = await createLead(user.id, content, keywords, {
      platform: platform || 'SLACK',
      channelName: channelName || 'general',
      senderName: senderName || 'Test User',
    });

    return NextResponse.json({ lead }, { status: 201 });
  } catch (error) {
    console.error('Leads API error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
