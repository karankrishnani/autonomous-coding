import { NextResponse } from 'next/server';
import { clearSession } from '@/lib/auth';

export async function POST() {
  try {
    await clearSession();

    // Clear the auth cookie
    const projectRef = process.env.NEXT_PUBLIC_SUPABASE_URL?.match(/https:\/\/([^.]+)/)?.[1] || '127';
    const cookieName = `sb-${projectRef}-auth-token`;

    const response = NextResponse.json({
      message: 'Logged out successfully',
    });

    // Delete the auth cookie by setting it to expire immediately
    response.cookies.set(cookieName, '', {
      path: '/',
      expires: new Date(0),
      maxAge: 0,
    });

    return response;
  } catch (error) {
    console.error('Logout error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
