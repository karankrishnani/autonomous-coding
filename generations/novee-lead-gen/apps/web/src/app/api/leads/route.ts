import { NextResponse } from 'next/server';
import { getSessionUser } from '@/lib/auth';

/**
 * GET /api/leads - List leads for the authenticated user
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

    // For now, return empty leads array
    // In production, this would fetch from Supabase
    return NextResponse.json({
      leads: [],
      total: 0,
      page: 1,
      pageSize: 20,
    });
  } catch (error) {
    console.error('Leads API error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
