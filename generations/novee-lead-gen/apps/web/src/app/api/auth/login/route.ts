import { NextRequest, NextResponse } from 'next/server';
import { authenticateUserForRoute } from '@/lib/auth';
import { trackOnboardingEvent } from '@/lib/onboarding';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { email, password } = body;

    // Validation
    if (!email || !password) {
      return NextResponse.json(
        { error: 'Email and password are required' },
        { status: 400 }
      );
    }

    // Authenticate user - use route handler version that captures cookies
    const { user, error, applyToResponse } = await authenticateUserForRoute(email, password);

    if (error) {
      return NextResponse.json({ error }, { status: 401 });
    }

    if (!user) {
      return NextResponse.json(
        { error: 'Authentication failed' },
        { status: 401 }
      );
    }

    // Track WEB_LOGIN onboarding event
    try {
      await trackOnboardingEvent(user.id, 'WEB_LOGIN', {
        email: user.email,
      });
    } catch (trackError) {
      // Log but don't fail login if tracking fails
      console.error('Failed to track onboarding event:', trackError);
    }

    // Create response and apply Supabase session cookies
    const response = NextResponse.json({
      user,
      message: 'Login successful',
    });

    return applyToResponse(response);
  } catch (error) {
    // Log error details server-side only (not exposed to client)
    console.error('Login error:', error);

    // Return user-friendly error without exposing technical details
    return NextResponse.json(
      { error: 'Something went wrong. Please try again later.' },
      { status: 500 }
    );
  }
}
