/**
 * Simple auth library for development.
 * In production, this would use Supabase Auth.
 * For development, we store user data in a JSON file for persistence.
 */

import { cookies } from 'next/headers';
import * as fs from 'fs';
import * as path from 'path';

export interface User {
  id: string;
  email: string;
  name: string;
  created_at: string;
}

interface StoredUser extends User {
  password: string;
}

// In-memory user store for development (persisted to JSON file)
// In production, this would be Supabase
const users: Map<string, StoredUser> = new Map();

// Cookie names
const SESSION_COOKIE = 'novee_session';

// File path for user persistence
const DATA_DIR = path.join(process.cwd(), '.dev-data');
const USERS_FILE = path.join(DATA_DIR, 'users.json');

// Flag to track if users have been loaded
let usersLoaded = false;

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
 * Ensure the data directory exists
 */
function ensureDataDir(): void {
  if (!fs.existsSync(DATA_DIR)) {
    fs.mkdirSync(DATA_DIR, { recursive: true });
  }
}

/**
 * Load users from JSON file (development persistence)
 */
function loadUsersFromFile(): void {
  if (usersLoaded) return;

  try {
    if (fs.existsSync(USERS_FILE)) {
      const data = fs.readFileSync(USERS_FILE, 'utf-8');
      const usersArray: StoredUser[] = JSON.parse(data);
      users.clear();
      for (const user of usersArray) {
        users.set(user.id, user);
      }
    }
  } catch (error) {
    console.error('Error loading users from file:', error);
  }

  usersLoaded = true;
}

/**
 * Save users to JSON file (development persistence)
 */
function saveUsersToFile(): void {
  try {
    ensureDataDir();
    const usersArray = Array.from(users.values());
    fs.writeFileSync(USERS_FILE, JSON.stringify(usersArray, null, 2));
  } catch (error) {
    console.error('Error saving users to file:', error);
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
  // Load existing users from file
  loadUsersFromFile();

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

  // Persist users to file
  saveUsersToFile();

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
  // Load existing users from file
  loadUsersFromFile();

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
 * Validate that an object has all required User fields
 */
function isValidUser(obj: unknown): obj is User {
  if (!obj || typeof obj !== 'object') {
    return false;
  }

  const user = obj as Record<string, unknown>;

  // Check all required fields exist and are non-empty strings
  if (typeof user.id !== 'string' || user.id.trim() === '') {
    return false;
  }
  if (typeof user.email !== 'string' || user.email.trim() === '') {
    return false;
  }
  if (typeof user.name !== 'string' || user.name.trim() === '') {
    return false;
  }
  if (typeof user.created_at !== 'string' || user.created_at.trim() === '') {
    return false;
  }

  // Validate email format (basic check)
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRegex.test(user.email)) {
    return false;
  }

  // Validate UUID format for id (basic check)
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
  if (!uuidRegex.test(user.id)) {
    return false;
  }

  // Validate created_at is a valid date string
  const date = new Date(user.created_at);
  if (isNaN(date.getTime())) {
    return false;
  }

  return true;
}

// Session expiration time in milliseconds (7 days)
const SESSION_MAX_AGE_MS = 7 * 24 * 60 * 60 * 1000;

/**
 * Check if a session has expired based on issued_at timestamp
 */
function isSessionExpired(issuedAt: string): boolean {
  const issuedDate = new Date(issuedAt);
  if (isNaN(issuedDate.getTime())) {
    // Invalid date, consider expired
    return true;
  }

  const now = new Date();
  const ageMs = now.getTime() - issuedDate.getTime();

  return ageMs > SESSION_MAX_AGE_MS;
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
    const parsed = JSON.parse(decoded);

    // Validate the parsed object has all required fields
    if (!isValidUser(parsed)) {
      return null;
    }

    // Check session expiration if issued_at is present
    if (parsed.issued_at && isSessionExpired(parsed.issued_at)) {
      return null;
    }

    return parsed;
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

/**
 * Update a user's profile
 * This updates both the in-memory store (if available) and the session
 */
export async function updateUserProfile(
  currentUser: User,
  updates: { name?: string }
): Promise<{ user: User }> {
  // Create updated user object
  const updatedUser: User = {
    ...currentUser,
    name: updates.name !== undefined ? updates.name : currentUser.name,
  };

  // Try to update in-memory store if the user exists there
  loadUsersFromFile();
  const storedUser = users.get(currentUser.id);
  if (storedUser) {
    if (updates.name !== undefined) {
      storedUser.name = updates.name;
    }
    users.set(currentUser.id, storedUser);
    saveUsersToFile();
  }

  // Update session with new user data
  await createSession(updatedUser);

  return { user: updatedUser };
}

/**
 * Delete a user account
 * Removes the user from the in-memory store and clears the session
 * Returns true if user was deleted, false if not found
 */
export async function deleteUser(userId: string): Promise<boolean> {
  // Check if user exists in memory
  const exists = users.has(userId);

  // Delete from in-memory store
  users.delete(userId);

  // Clear the session
  await clearSession();

  return exists;
}
