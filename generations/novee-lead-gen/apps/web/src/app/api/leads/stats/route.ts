import { NextResponse } from 'next/server';
import { getSessionUser } from '@/lib/auth';
import { getLeadStats } from '@/lib/leads';

/**
 * GET /api/leads/stats
 * Get lead counts by status for the current user
 */
export async function GET() {
  try {
    const user = await getSessionUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const stats = await getLeadStats(user.id);

    return NextResponse.json({
      stats,
      byStatus: {
        NEW: stats.new,
        VIEWED: stats.viewed,
        INTERESTED: stats.interested,
        NOT_INTERESTED: stats.not_interested,
        MARKED_LATER: stats.marked_later,
        ARCHIVED: stats.archived,
      },
      total: stats.total,
    });
  } catch (error) {
    console.error('Error fetching lead stats:', error);
    return NextResponse.json(
      { error: 'Something went wrong. Please try again later.' },
      { status: 500 }
    );
  }
}
