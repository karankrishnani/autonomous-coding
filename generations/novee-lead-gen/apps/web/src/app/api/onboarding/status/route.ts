import { NextResponse } from 'next/server';
import { getSessionUser } from '@/lib/auth';
import { getOnboardingStatus } from '@/lib/onboarding';

/**
 * GET /api/onboarding/status - Get onboarding completion status
 */
export async function GET() {
  const user = await getSessionUser();

  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const status = await getOnboardingStatus(user.id);

  return NextResponse.json(status);
}
