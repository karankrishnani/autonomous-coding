/**
 * Supabase client for server usage (Server Components, Route Handlers, Server Actions)
 */
import { createServerClient as createSupabaseServerClient, type CookieOptions } from '@supabase/ssr';
import { cookies } from 'next/headers';
import { NextResponse } from 'next/server';
import type { Database } from '@novee/shared';

export async function createClient() {
  const cookieStore = await cookies();
  const projectRef =
    process.env.NEXT_PUBLIC_SUPABASE_URL?.match(/https:\/\/([^.]+)/)?.[1] || '127';
  const cookieBaseName = `sb-${projectRef}-auth-token`;

  // Try to extract session data from base64-encoded cookie
  let sessionData: { access_token?: string; refresh_token?: string } | null = null;
  const authCookie = cookieStore.get(cookieBaseName);
  if (authCookie?.value) {
    try {
      const decoded = decodeURIComponent(authCookie.value);
      sessionData = JSON.parse(Buffer.from(decoded, 'base64').toString('utf-8'));
    } catch {
      // Cookie might already be in JSON format or invalid
      try {
        sessionData = JSON.parse(authCookie.value);
      } catch {
        // Ignore
      }
    }
  }

  const supabase = createSupabaseServerClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          const allCookies = cookieStore.getAll();

          // Process auth cookie - handle URL encoding and base64
          return allCookies.map((cookie) => {
            if (cookie.name === cookieBaseName) {
              try {
                // First URL-decode (in case curl/browser URL-encoded it)
                let value = decodeURIComponent(cookie.value);
                // Check if it's base64-encoded (our format) and decode it
                const decoded = Buffer.from(value, 'base64').toString('utf-8');
                // Verify it's valid JSON
                JSON.parse(decoded);
                return { name: cookie.name, value: decoded };
              } catch {
                return cookie;
              }
            }
            return cookie;
          });
        },
        setAll(cookiesToSet: { name: string; value: string; options: CookieOptions }[]) {
          try {
            cookiesToSet.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, options)
            );
          } catch {
            // The `setAll` method was called from a Server Component.
            // This can be ignored if you have middleware refreshing user sessions.
          }
        },
      },
    }
  );

  // If we have session data, explicitly set the session to ensure auth.uid() works for RLS
  if (sessionData?.access_token && sessionData?.refresh_token) {
    await supabase.auth.setSession({
      access_token: sessionData.access_token,
      refresh_token: sessionData.refresh_token,
    });
  }

  return supabase;
}

/**
 * Create a Supabase client for Route Handlers that captures cookies to be set on the response
 * Returns both the client and a function to apply cookies to a response
 */
export async function createRouteHandlerClient() {
  const cookieStore = await cookies();
  const cookiesToSet: { name: string; value: string; options: CookieOptions }[] = [];

  const supabase = createSupabaseServerClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
        setAll(cookies: { name: string; value: string; options: CookieOptions }[]) {
          cookiesToSet.push(...cookies);
          // Also try to set via cookieStore for compatibility
          try {
            cookies.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, options)
            );
          } catch {
            // Ignore
          }
        },
      },
    }
  );

  const applyToResponse = (response: NextResponse): NextResponse => {
    cookiesToSet.forEach(({ name, value, options }) => {
      response.cookies.set(name, value, options);
    });
    return response;
  };

  return { supabase, applyToResponse };
}

/**
 * Create a Supabase client with the service role key for admin operations
 * Only use this for server-side operations that need to bypass RLS
 */
export async function createServiceRoleClient() {
  const cookieStore = await cookies();

  return createSupabaseServerClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
        setAll(cookiesToSet: { name: string; value: string; options: CookieOptions }[]) {
          try {
            cookiesToSet.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, options)
            );
          } catch {
            // Ignore
          }
        },
      },
    }
  );
}
