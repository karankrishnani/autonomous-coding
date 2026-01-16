import { NextResponse } from 'next/server';
import { getSessionUser, deleteUser } from '@/lib/auth';
import { clearAllKeywordsForUser } from '@/lib/keywords';
import { deleteAllLeadsForUser } from '@/lib/leads';
import { deleteAllConnectionsForUser } from '@/lib/platforms';

/**
 * DELETE /api/user/account
 * Delete the current user's account and all associated data
 * This performs a cascade delete of:
 * - Keywords
 * - Leads
 * - Platform connections
 * - User account
 */
export async function DELETE() {
  try {
    const user = await getSessionUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const userId = user.id;

    // Delete all user data in cascade
    const deletedKeywords = clearAllKeywordsForUser(userId);
    const deletedLeads = await deleteAllLeadsForUser(userId);
    const deletedConnections = await deleteAllConnectionsForUser(userId);

    // Delete the user account and clear session
    await deleteUser(userId);

    return NextResponse.json({
      success: true,
      message: 'Account and all associated data deleted successfully.',
      deleted: {
        keywords: deletedKeywords,
        leads: deletedLeads,
        connections: deletedConnections,
      },
    });
  } catch (error) {
    console.error('Error deleting user account:', error);
    return NextResponse.json(
      { error: 'Something went wrong. Please try again later.' },
      { status: 500 }
    );
  }
}
