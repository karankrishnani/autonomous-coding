import { NextRequest, NextResponse } from 'next/server';
import { authenticateUser } from '@/lib/auth';
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

    // Authenticate user
    const { user, error } = await authenticateUser(email, password);

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

    // Create session by setting cookie in response
    // Include issued_at timestamp for expiration checking
    const sessionPayload = {
      ...user,
      issued_at: new Date().toISOString(),
    };
    const sessionData = Buffer.from(JSON.stringify(sessionPayload)).toString('base64');

    const response = NextResponse.json({
      user,
      message: 'Login successful',
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
    console.error('Login error:', error);

    // Return user-friendly error without exposing technical details
    return NextResponse.json(
      { error: 'Something went wrong. Please try again later.' },
      { status: 500 }
    );
  }
}
