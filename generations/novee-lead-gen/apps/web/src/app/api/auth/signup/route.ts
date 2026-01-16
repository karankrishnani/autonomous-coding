import { NextRequest, NextResponse } from 'next/server';
import { createUser } from '@/lib/auth';
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

    // Create user (use trimmed name)
    const { user, error } = await createUser(email, password, trimmedName);

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

    // Create session by setting cookie in response
    // Include issued_at timestamp for expiration checking
    const sessionPayload = {
      ...user,
      issued_at: new Date().toISOString(),
    };
    const sessionData = Buffer.from(JSON.stringify(sessionPayload)).toString('base64');

    const response = NextResponse.json({
      user,
      message: 'Account created successfully',
    });

    response.cookies.set('novee_session', sessionData, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 60 * 60 * 24 * 7, // 7 days
      path: '/',
    });

    return response;
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
