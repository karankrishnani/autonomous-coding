import { NextRequest, NextResponse } from 'next/server';
import { getSessionUser } from '@/lib/auth';
import { getLeadByIdForUser, updateLeadStatus, deleteLead, LeadStatus } from '@/lib/leads';
import { trackLeadInteraction, LeadInteractionAction } from '@/lib/lead-interactions';
import { trackOnboardingEvent, hasCompletedEvent } from '@/lib/onboarding';

interface RouteParams {
  params: Promise<{ id: string }>;
}

/**
 * GET /api/leads/:id - Get a single lead by ID
 * Only returns the lead if it belongs to the authenticated user
 */
export async function GET(
  request: NextRequest,
  { params }: RouteParams
) {
  try {
    // Check authentication
    const user = await getSessionUser();

    if (!user) {
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      );
    }

    const { id } = await params;

    // Validate ID format (UUID)
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    if (!uuidRegex.test(id)) {
      return NextResponse.json(
        { error: 'Invalid lead ID format' },
        { status: 400 }
      );
    }

    // Get lead only if it belongs to the user
    const lead = await getLeadByIdForUser(id, user.id);

    if (!lead) {
      // Return 404 to not reveal if the lead exists for another user
      return NextResponse.json(
        { error: 'Lead not found' },
        { status: 404 }
      );
    }

    return NextResponse.json({ lead });
  } catch (error) {
    console.error('Lead API error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

/**
 * PUT /api/leads/:id - Update a lead (status)
 * Only allows updating leads belonging to the authenticated user
 */
export async function PUT(
  request: NextRequest,
  { params }: RouteParams
) {
  try {
    // Check authentication
    const user = await getSessionUser();

    if (!user) {
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      );
    }

    const { id } = await params;

    // Validate ID format (UUID)
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    if (!uuidRegex.test(id)) {
      return NextResponse.json(
        { error: 'Invalid lead ID format' },
        { status: 400 }
      );
    }

    const body = await request.json();
    const { status } = body;

    // Validate status
    const validStatuses: LeadStatus[] = ['NEW', 'VIEWED', 'INTERESTED', 'NOT_INTERESTED', 'MARKED_LATER', 'ARCHIVED'];
    if (!status || !validStatuses.includes(status)) {
      return NextResponse.json(
        { error: 'Invalid status. Must be one of: ' + validStatuses.join(', ') },
        { status: 400 }
      );
    }

    // Update lead only if it belongs to the user
    const updatedLead = await updateLeadStatus(id, user.id, status);

    if (!updatedLead) {
      // Return 404 to not reveal if the lead exists for another user
      return NextResponse.json(
        { error: 'Lead not found' },
        { status: 404 }
      );
    }

    // Track lead interaction for relevant status changes
    try {
      const statusToAction: Record<string, LeadInteractionAction> = {
        'INTERESTED': 'INTERESTED',
        'NOT_INTERESTED': 'NOT_INTERESTED',
        'MARKED_LATER': 'MARKED_LATER',
      };

      const action = statusToAction[status];
      if (action) {
        await trackLeadInteraction(id, user.id, action);

        // Track FIRST_LEAD_VIEWED onboarding event on first interaction
        const alreadyViewedLead = await hasCompletedEvent(user.id, 'FIRST_LEAD_VIEWED');
        if (!alreadyViewedLead) {
          await trackOnboardingEvent(user.id, 'FIRST_LEAD_VIEWED', {
            leadId: id,
            action: action,
          });
        }
      }
    } catch (trackError) {
      // Log but don't fail the update if tracking fails
      console.error('Failed to track lead interaction:', trackError);
    }

    return NextResponse.json({ lead: updatedLead });
  } catch (error) {
    console.error('Lead API error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/leads/:id - Delete a lead
 * Only allows deleting leads belonging to the authenticated user
 */
export async function DELETE(
  request: NextRequest,
  { params }: RouteParams
) {
  try {
    // Check authentication
    const user = await getSessionUser();

    if (!user) {
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      );
    }

    const { id } = await params;

    // Validate ID format (UUID)
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    if (!uuidRegex.test(id)) {
      return NextResponse.json(
        { error: 'Invalid lead ID format' },
        { status: 400 }
      );
    }

    // Delete lead only if it belongs to the user
    const deleted = await deleteLead(id, user.id);

    if (!deleted) {
      // Return 404 to not reveal if the lead exists for another user
      return NextResponse.json(
        { error: 'Lead not found' },
        { status: 404 }
      );
    }

    return NextResponse.json({ success: true, message: 'Lead deleted successfully' });
  } catch (error) {
    console.error('Lead API error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
