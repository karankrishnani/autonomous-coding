import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

// Routes that require authentication
const protectedRoutes = [
  '/dashboard',
  '/leads',
  '/keywords',
  '/platforms',
  '/profile',
  '/settings',
];

// Routes that are only for unauthenticated users
const authRoutes = ['/login', '/signup', '/forgot-password'];

/**
 * Validate session cookie - checks if it's a valid base64 encoded user object
 */
function isValidSession(sessionValue: string | undefined): boolean {
  if (!sessionValue) return false;

  try {
    // Decode base64 and parse JSON
    const decoded = Buffer.from(sessionValue, 'base64').toString('utf-8');
    const user = JSON.parse(decoded);

    // Check for required user fields
    return !!(user && user.id && user.email && user.name);
  } catch {
    return false;
  }
}

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Get session cookie and validate it
  const sessionCookie = request.cookies.get('novee_session');
  const isAuthenticated = isValidSession(sessionCookie?.value);

  // Check if the path is a protected route
  const isProtectedRoute = protectedRoutes.some(
    route => pathname === route || pathname.startsWith(`${route}/`)
  );

  // Check if the path is an auth route
  const isAuthRoute = authRoutes.some(
    route => pathname === route || pathname.startsWith(`${route}/`)
  );

  // Redirect unauthenticated users from protected routes to login
  if (isProtectedRoute && !isAuthenticated) {
    const loginUrl = new URL('/login', request.url);
    // Preserve the full path including query string
    const fullPath = request.nextUrl.search
      ? `${pathname}${request.nextUrl.search}`
      : pathname;
    loginUrl.searchParams.set('redirect', fullPath);
    return NextResponse.redirect(loginUrl);
  }

  // Redirect authenticated users from auth routes to dashboard
  if (isAuthRoute && isAuthenticated) {
    return NextResponse.redirect(new URL('/dashboard', request.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    /*
     * Match all request paths except:
     * - api routes (API routes handle their own auth)
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     * - public files (public folder)
     */
    '/((?!api|_next/static|_next/image|favicon.ico|.*\\..*|$).*)',
  ],
};
