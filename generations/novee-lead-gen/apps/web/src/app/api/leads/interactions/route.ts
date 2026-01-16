import { NextRequest, NextResponse } from 'next/server';
import { getSessionUser } from '@/lib/auth';
import {
  getInteractionsForUser,
  getInteractionCountsByAction,
  trackLeadInteraction,
  LeadInteractionAction,
} from '@/lib/lead-interactions';

/**
 * GET /api/leads/interactions - Get all lead interactions for the current user
 */
export async function GET() {
  const user = await getSessionUser();

  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const interactions = await getInteractionsForUser(user.id);
  const counts = await getInteractionCountsByAction(user.id);

  return NextResponse.json({ interactions, counts });
}

/**
 * POST /api/leads/interactions - Track a lead interaction
 * Used for testing and direct interaction tracking
 */
export async function POST(request: NextRequest) {
  const user = await getSessionUser();

  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const body = await request.json();
    const { leadId, action } = body;

    // Validate required fields
    if (!leadId || typeof leadId !== 'string') {
      return NextResponse.json({ error: 'leadId is required' }, { status: 400 });
    }

    const validActions: LeadInteractionAction[] = ['INTERESTED', 'NOT_INTERESTED', 'MARKED_LATER', 'OPENED_SOURCE'];
    if (!action || !validActions.includes(action)) {
      return NextResponse.json(
        { error: `Invalid action. Must be one of: ${validActions.join(', ')}` },
        { status: 400 }
      );
    }

    // Track the interaction
    const interaction = await trackLeadInteraction(leadId, user.id, action);

    return NextResponse.json({ interaction }, { status: 201 });
  } catch (error) {
    console.error('Failed to track interaction:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
