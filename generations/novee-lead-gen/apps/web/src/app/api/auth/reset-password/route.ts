import { NextRequest, NextResponse } from 'next/server';

/**
 * In-memory store for password reset tokens
 * In production, these would be stored in the database with expiration
 */
const resetTokens: Map<string, { email: string; expires: Date }> = new Map();

/**
 * Generate a random token for password reset
 */
function generateToken(): string {
  return Array.from(crypto.getRandomValues(new Uint8Array(32)))
    .map(b => b.toString(16).padStart(2, '0'))
    .join('');
}

/**
 * POST /api/auth/reset-password - Request password reset
 *
 * For development, this logs the reset link to the console instead of
 * sending an actual email. The link contains a token that can be used
 * to reset the password.
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { email } = body;

    // Validate email format
    if (!email || typeof email !== 'string') {
      return NextResponse.json(
        { error: 'Email is required' },
        { status: 400 }
      );
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return NextResponse.json(
        { error: 'Invalid email format' },
        { status: 400 }
      );
    }

    // Generate reset token
    const token = generateToken();
    const expires = new Date(Date.now() + 60 * 60 * 1000); // 1 hour expiration

    // Store the token (in production, this would be in the database)
    resetTokens.set(token, { email, expires });

    // Generate reset link
    const resetUrl = `http://localhost:3000/reset-password?token=${token}`;

    // Log the reset link to console (development mode)
    console.log('\n========================================');
    console.log('PASSWORD RESET LINK (Development Mode)');
    console.log('========================================');
    console.log(`Email: ${email}`);
    console.log(`Reset URL: ${resetUrl}`);
    console.log(`Expires: ${expires.toISOString()}`);
    console.log('========================================\n');

    // In production, this is where you would send the email
    // For now, we just return success
    // The user should check the server console for the link

    return NextResponse.json({
      message: 'Password reset link sent successfully',
      // In development, we include a hint about the console
      hint: 'Check the server console for the reset link (development mode)',
    });
  } catch (error) {
    console.error('Password reset error:', error);
    return NextResponse.json(
      { error: 'Failed to process password reset request' },
      { status: 500 }
    );
  }
}

/**
 * Export the tokens map for use in other routes (like the actual password reset)
 */
export { resetTokens };
