import { NextResponse } from 'next/server';

/**
 * GET /api/auth/google - Initiate Google OAuth flow
 *
 * In production, this would redirect to Google's OAuth authorization URL.
 * For development, we simulate the OAuth initiation by redirecting to
 * what a real Google OAuth URL would look like.
 */
export async function GET() {
  // Build the Google OAuth authorization URL
  // In production, these would be environment variables
  const clientId = process.env.GOOGLE_CLIENT_ID || 'mock-client-id';
  const redirectUri = process.env.GOOGLE_REDIRECT_URI || 'http://localhost:3000/api/auth/google/callback';

  // Google OAuth scopes we need
  const scopes = [
    'openid',
    'email',
    'profile',
  ].join(' ');

  // Generate a state parameter for CSRF protection
  const state = generateState();

  // Build the Google OAuth URL
  const googleAuthUrl = new URL('https://accounts.google.com/o/oauth2/v2/auth');
  googleAuthUrl.searchParams.set('client_id', clientId);
  googleAuthUrl.searchParams.set('redirect_uri', redirectUri);
  googleAuthUrl.searchParams.set('response_type', 'code');
  googleAuthUrl.searchParams.set('scope', scopes);
  googleAuthUrl.searchParams.set('state', state);
  googleAuthUrl.searchParams.set('access_type', 'offline');
  googleAuthUrl.searchParams.set('prompt', 'consent');

  // Redirect to Google OAuth
  return NextResponse.redirect(googleAuthUrl.toString());
}

/**
 * Generate a random state parameter for CSRF protection
 */
function generateState(): string {
  return Array.from(crypto.getRandomValues(new Uint8Array(16)))
    .map(b => b.toString(16).padStart(2, '0'))
    .join('');
}
