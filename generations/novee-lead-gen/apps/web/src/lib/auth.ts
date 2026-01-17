/**
 * Authentication library using Supabase Auth
 */
import { createClient, createRouteHandlerClient, createServiceRoleClient } from './supabase/server';
import { NextResponse } from 'next/server';

export interface User {
  id: string;
  email: string;
  name: string;
  created_at: string;
}

// Type for the route handler result
export interface AuthRouteResult {
  user?: User;
  error?: string;
  applyToResponse: (response: NextResponse) => NextResponse;
}

/**
 * Create a new user account
 */
export async function createUser(
  email: string,
  password: string,
  name: string
): Promise<{ user?: User; error?: string }> {
  const supabase = await createClient();

  const { data, error } = await supabase.auth.signUp({
    email,
    password,
    options: {
      data: {
        full_name: name,
      },
    },
  });

  if (error) {
    if (error.message.includes('already registered')) {
      return { error: 'An account with this email already exists' };
    }
    return { error: error.message };
  }

  if (!data.user) {
    return { error: 'Failed to create account' };
  }

  return {
    user: {
      id: data.user.id,
      email: data.user.email!,
      name: name,
      created_at: data.user.created_at,
    },
  };
}

/**
 * Create a new user account for Route Handlers - returns applyToResponse to set cookies
 */
export async function createUserForRoute(
  email: string,
  password: string,
  name: string
): Promise<AuthRouteResult> {
  const { supabase, applyToResponse } = await createRouteHandlerClient();

  const { data, error } = await supabase.auth.signUp({
    email,
    password,
    options: {
      data: {
        full_name: name,
      },
    },
  });

  if (error) {
    if (error.message.includes('already registered')) {
      return { error: 'An account with this email already exists', applyToResponse };
    }
    return { error: error.message, applyToResponse };
  }

  if (!data.user) {
    return { error: 'Failed to create account', applyToResponse };
  }

  return {
    user: {
      id: data.user.id,
      email: data.user.email!,
      name: name,
      created_at: data.user.created_at,
    },
    applyToResponse,
  };
}

/**
 * Authenticate a user
 */
export async function authenticateUser(
  email: string,
  password: string
): Promise<{ user?: User; error?: string }> {
  const supabase = await createClient();

  const { data, error } = await supabase.auth.signInWithPassword({
    email,
    password,
  });

  if (error) {
    return { error: 'Invalid email or password' };
  }

  if (!data.user) {
    return { error: 'Invalid email or password' };
  }

  // Fetch user profile from public.users table
  const { data: profile } = await supabase
    .from('users')
    .select('name')
    .eq('id', data.user.id)
    .single();

  return {
    user: {
      id: data.user.id,
      email: data.user.email!,
      name: profile?.name || data.user.user_metadata?.full_name || '',
      created_at: data.user.created_at,
    },
  };
}

/**
 * Authenticate a user for Route Handlers - returns applyToResponse to set cookies
 */
export async function authenticateUserForRoute(
  email: string,
  password: string
): Promise<AuthRouteResult> {
  const { supabase, applyToResponse: baseApplyToResponse } = await createRouteHandlerClient();

  const { data, error } = await supabase.auth.signInWithPassword({
    email,
    password,
  });

  if (error) {
    return { error: 'Invalid email or password', applyToResponse: baseApplyToResponse };
  }

  if (!data.user || !data.session) {
    return { error: 'Invalid email or password', applyToResponse: baseApplyToResponse };
  }

  // Fetch user profile from public.users table
  const { data: profile } = await supabase
    .from('users')
    .select('name')
    .eq('id', data.user.id)
    .single();

  // Manually set auth cookies since Supabase SSR doesn't automatically call setAll after signIn
  const applyToResponse = (response: NextResponse): NextResponse => {
    // Apply any cookies from Supabase (if any)
    baseApplyToResponse(response);

    // Set the session cookie in the format Supabase expects
    const projectRef = process.env.NEXT_PUBLIC_SUPABASE_URL?.match(/https:\/\/([^.]+)/)?.[1] || '127';
    const cookieName = `sb-${projectRef}-auth-token`;

    // Session data in Supabase's expected format
    const sessionData = {
      access_token: data.session.access_token,
      refresh_token: data.session.refresh_token,
      expires_at: data.session.expires_at,
      expires_in: data.session.expires_in,
      token_type: data.session.token_type,
      user: data.session.user,
    };

    // Base64 encode the session (Supabase SSR expects this format)
    const cookieValue = Buffer.from(JSON.stringify(sessionData)).toString('base64');

    response.cookies.set(cookieName, cookieValue, {
      path: '/',
      sameSite: 'lax',
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      maxAge: 60 * 60 * 24 * 7, // 7 days
    });

    return response;
  };

  return {
    user: {
      id: data.user.id,
      email: data.user.email!,
      name: profile?.name || data.user.user_metadata?.full_name || '',
      created_at: data.user.created_at,
    },
    applyToResponse,
  };
}

/**
 * Create a session for a user (no-op with Supabase Auth - session is automatic)
 */
export async function createSession(_user: User): Promise<void> {
  // Supabase Auth handles session creation automatically on sign in/up
  // This function is kept for API compatibility
}

/**
 * Get the current session user
 */
export async function getSessionUser(): Promise<User | null> {
  const { cookies } = await import('next/headers');
  const cookieStore = await cookies();

  // Get the auth cookie and parse it
  const projectRef = process.env.NEXT_PUBLIC_SUPABASE_URL?.match(/https:\/\/([^.]+)/)?.[1] || '127';
  const cookieName = `sb-${projectRef}-auth-token`;
  const authCookie = cookieStore.get(cookieName);

  if (!authCookie?.value) {
    return null;
  }

  try {
    // URL decode then base64 decode the cookie value
    let cookieValue = decodeURIComponent(authCookie.value);
    const sessionData = JSON.parse(Buffer.from(cookieValue, 'base64').toString('utf-8'));

    if (!sessionData.access_token || !sessionData.user) {
      return null;
    }

    // Use the access token to validate with Supabase
    const supabase = await createClient();
    const { data: { user }, error } = await supabase.auth.getUser(sessionData.access_token);

    if (error || !user) {
      return null;
    }

    // Fetch user profile from public.users table using service role to bypass RLS
    const serviceClient = await createServiceRoleClient();
    const { data: profile } = await serviceClient
      .from('users')
      .select('name, created_at')
      .eq('id', user.id)
      .single();

    return {
      id: user.id,
      email: user.email!,
      name: profile?.name || user.user_metadata?.full_name || '',
      created_at: profile?.created_at || user.created_at,
    };
  } catch {
    return null;
  }
}

/**
 * Clear the current session
 */
export async function clearSession(): Promise<void> {
  const supabase = await createClient();
  await supabase.auth.signOut();
}

/**
 * Update a user's profile
 */
export async function updateUserProfile(
  currentUser: User,
  updates: { name?: string }
): Promise<{ user: User }> {
  // Use service role client to bypass RLS (user already validated via session)
  const supabase = await createServiceRoleClient();

  // Update name in public.users table
  if (updates.name !== undefined) {
    const { error } = await supabase
      .from('users')
      .update({ name: updates.name })
      .eq('id', currentUser.id);

    if (error) {
      console.error('Failed to update user profile:', error);
      throw new Error('Failed to update profile');
    }

    // Also update user metadata via regular client
    const regularClient = await createClient();
    await regularClient.auth.updateUser({
      data: { full_name: updates.name },
    });
  }

  const updatedUser: User = {
    ...currentUser,
    name: updates.name !== undefined ? updates.name : currentUser.name,
  };

  return { user: updatedUser };
}

/**
 * Delete a user account
 * Note: This only signs out the user. Full account deletion requires admin API.
 */
export async function deleteUser(_userId: string): Promise<boolean> {
  const supabase = await createClient();
  await supabase.auth.signOut();
  return true;
}
