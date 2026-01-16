import { NextRequest, NextResponse } from 'next/server';
import { createUserForRoute } from '@/lib/auth';
import { trackOnboardingEvent } from '@/lib/onboarding';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { email, password, name } = body;

    // Validation
    if (!email || !password || !name) {
      return NextResponse.json(
        { error: 'Name, email, and password are required' },
        { status: 400 }
      );
    }

    // Trim whitespace from name
    const trimmedName = name.trim();

    if (!trimmedName) {
      return NextResponse.json(
        { error: 'Name is required' },
        { status: 400 }
      );
    }

    if (trimmedName.length < 2) {
      return NextResponse.json(
        { error: 'Name must be at least 2 characters' },
        { status: 400 }
      );
    }

    if (password.length < 8) {
      return NextResponse.json(
        { error: 'Password must be at least 8 characters' },
        { status: 400 }
      );
    }

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return NextResponse.json(
        { error: 'Invalid email format' },
        { status: 400 }
      );
    }

    // Create user - use route handler version that captures cookies
    const { user, error, applyToResponse } = await createUserForRoute(email, password, trimmedName);

    if (error) {
      return NextResponse.json({ error }, { status: 400 });
    }

    if (!user) {
      return NextResponse.json(
        { error: 'Failed to create account' },
        { status: 500 }
      );
    }

    // Track ACCOUNT_CREATED onboarding event
    try {
      await trackOnboardingEvent(user.id, 'ACCOUNT_CREATED', {
        email: user.email,
        name: user.name,
      });
    } catch (trackError) {
      // Log but don't fail signup if tracking fails
      console.error('Failed to track onboarding event:', trackError);
    }

    // Create response and apply Supabase session cookies
    const response = NextResponse.json({
      user,
      message: 'Account created successfully',
    });

    return applyToResponse(response);
  } catch (error) {
    // Log error details server-side only (not exposed to client)
    console.error('Signup error:', error);

    // Return user-friendly error without exposing technical details
    return NextResponse.json(
      { error: 'Something went wrong. Please try again later.' },
      { status: 500 }
    );
  }
}
