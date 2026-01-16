/**
 * Supabase client for middleware usage
 */
import { createServerClient, type CookieOptions } from '@supabase/ssr';
import { NextResponse, type NextRequest } from 'next/server';
import type { User } from '@supabase/supabase-js';

export async function updateSession(request: NextRequest) {
  const supabaseResponse = NextResponse.next({
    request,
  });

  // Get the auth cookie and parse it manually
  const projectRef =
    process.env.NEXT_PUBLIC_SUPABASE_URL?.match(/https:\/\/([^.]+)/)?.[1] || '127';
  const cookieName = `sb-${projectRef}-auth-token`;
  const authCookie = request.cookies.get(cookieName);

  if (!authCookie?.value) {
    return { user: null, supabaseResponse };
  }

  try {
    // URL decode then base64 decode the cookie value
    const cookieValue = decodeURIComponent(authCookie.value);
    const sessionData = JSON.parse(Buffer.from(cookieValue, 'base64').toString('utf-8'));

    if (!sessionData.access_token || !sessionData.user) {
      return { user: null, supabaseResponse };
    }

    // Create Supabase client for token validation
    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        cookies: {
          getAll() {
            return request.cookies.getAll();
          },
          setAll(cookiesToSet: { name: string; value: string; options: CookieOptions }[]) {
            cookiesToSet.forEach(({ name, value, options }) =>
              supabaseResponse.cookies.set(name, value, options)
            );
          },
        },
      }
    );

    // Validate the access token with Supabase
    const { data: { user }, error } = await supabase.auth.getUser(sessionData.access_token);

    if (error || !user) {
      return { user: null, supabaseResponse };
    }

    return { user: user as User, supabaseResponse };
  } catch {
    return { user: null, supabaseResponse };
  }
}
