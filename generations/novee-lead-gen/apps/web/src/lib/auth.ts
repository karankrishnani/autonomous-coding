/**
 * Simple auth library for development.
 * In production, this would use Supabase Auth.
 * For development, we store user data in cookies (base64 encoded).
 */

import { cookies } from 'next/headers';

export interface User {
  id: string;
  email: string;
  name: string;
  created_at: string;
}

interface StoredUser extends User {
  password: string;
}

// In-memory user store for development (persisted via cookies)
// In production, this would be Supabase
const users: Map<string, StoredUser> = new Map();

// Cookie names
const SESSION_COOKIE = 'novee_session';
const USERS_COOKIE = 'novee_dev_users';

/**
 * Generate a simple UUID-like ID
 */
function generateId(): string {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
    const r = Math.random() * 16 | 0;
    const v = c === 'x' ? r : (r & 0x3 | 0x8);
    return v.toString(16);
  });
}

/**
 * Simple password hashing for development
 * In production, use bcrypt or similar
 */
function hashPassword(password: string): string {
  // Simple hash for development - NOT SECURE FOR PRODUCTION
  let hash = 0;
  for (let i = 0; i < password.length; i++) {
    const char = password.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash;
  }
  return `dev_hash_${hash.toString(16)}`;
}

/**
 * Load users from cookie (development persistence)
 */
async function loadUsersFromCookie(): Promise<void> {
  try {
    const cookieStore = await cookies();
    const usersCookie = cookieStore.get(USERS_COOKIE)?.value;
    if (usersCookie) {
      const decoded = Buffer.from(usersCookie, 'base64').toString('utf-8');
      const usersArray: StoredUser[] = JSON.parse(decoded);
      users.clear();
      for (const user of usersArray) {
        users.set(user.id, user);
      }
    }
  } catch {
    // Ignore errors, start fresh
  }
}

/**
 * Save users to cookie (development persistence)
 */
async function saveUsersToCookie(): Promise<void> {
  try {
    const cookieStore = await cookies();
    const usersArray = Array.from(users.values());
    const encoded = Buffer.from(JSON.stringify(usersArray)).toString('base64');
    cookieStore.set(USERS_COOKIE, encoded, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 60 * 60 * 24 * 30, // 30 days
      path: '/',
    });
  } catch {
    // Ignore errors
  }
}

/**
 * Create a new user account
 */
export async function createUser(
  email: string,
  password: string,
  name: string
): Promise<{ user?: User; error?: string }> {
  // Load existing users
  await loadUsersFromCookie();

  // Check if user exists
  const existingUser = Array.from(users.values()).find(u => u.email === email);
  if (existingUser) {
    return { error: 'An account with this email already exists' };
  }

  const user: StoredUser = {
    id: generateId(),
    email,
    name,
    password: hashPassword(password),
    created_at: new Date().toISOString(),
  };

  users.set(user.id, user);

  // Persist users
  await saveUsersToCookie();

  // Return user without password
  const { password: _, ...safeUser } = user;
  return { user: safeUser };
}

/**
 * Authenticate a user
 */
export async function authenticateUser(
  email: string,
  password: string
): Promise<{ user?: User; error?: string }> {
  // Load existing users
  await loadUsersFromCookie();

  const user = Array.from(users.values()).find(u => u.email === email);

  if (!user) {
    return { error: 'Invalid email or password' };
  }

  if (user.password !== hashPassword(password)) {
    return { error: 'Invalid email or password' };
  }

  // Return user without password
  const { password: _, ...safeUser } = user;
  return { user: safeUser };
}

/**
 * Create a session for a user
 */
export async function createSession(user: User): Promise<void> {
  const cookieStore = await cookies();

  // Store user data in session cookie (base64 encoded)
  const sessionData = Buffer.from(JSON.stringify(user)).toString('base64');

  cookieStore.set(SESSION_COOKIE, sessionData, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    maxAge: 60 * 60 * 24 * 7, // 7 days
    path: '/',
  });
}

/**
 * Get the current session user
 */
export async function getSessionUser(): Promise<User | null> {
  try {
    const cookieStore = await cookies();
    const sessionCookie = cookieStore.get(SESSION_COOKIE)?.value;

    if (!sessionCookie) {
      return null;
    }

    // Decode user data from session cookie
    const decoded = Buffer.from(sessionCookie, 'base64').toString('utf-8');
    const user: User = JSON.parse(decoded);

    return user;
  } catch {
    return null;
  }
}

/**
 * Clear the current session
 */
export async function clearSession(): Promise<void> {
  const cookieStore = await cookies();
  cookieStore.delete(SESSION_COOKIE);
}
