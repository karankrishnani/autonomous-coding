/**
 * Desktop app sessions data module
 * Handles CRUD operations for desktop app sessions with user isolation
 */

import { v4 as uuidv4 } from 'uuid';
import * as fs from 'fs';
import * as path from 'path';

export interface DesktopSession {
  id: string;
  user_id: string;
  device_label: string;
  os_type: string;
  last_seen_at: string;
  created_at: string;
  updated_at: string;
}

// File-based storage for development
const DATA_DIR = path.join(process.cwd(), '..', '..', '.dev-data');
const SESSIONS_FILE = path.join(DATA_DIR, 'desktop-sessions.json');

// In-memory cache
let sessionsCache: DesktopSession[] | null = null;

function ensureDataDir(): void {
  if (!fs.existsSync(DATA_DIR)) {
    fs.mkdirSync(DATA_DIR, { recursive: true });
  }
}

function loadSessions(): DesktopSession[] {
  if (sessionsCache !== null) {
    return sessionsCache;
  }

  try {
    ensureDataDir();
    if (fs.existsSync(SESSIONS_FILE)) {
      const data = fs.readFileSync(SESSIONS_FILE, 'utf-8');
      sessionsCache = JSON.parse(data);
      return sessionsCache || [];
    }
  } catch (error) {
    console.error('Error loading desktop sessions:', error);
  }

  sessionsCache = [];
  return sessionsCache;
}

function saveSessions(sessions: DesktopSession[]): void {
  try {
    ensureDataDir();
    fs.writeFileSync(SESSIONS_FILE, JSON.stringify(sessions, null, 2));
    sessionsCache = sessions;
  } catch (error) {
    console.error('Error saving desktop sessions:', error);
  }
}

/**
 * Get all desktop sessions for a specific user
 */
export function getSessionsForUser(userId: string): DesktopSession[] {
  const sessions = loadSessions();
  return sessions.filter(s => s.user_id === userId);
}

/**
 * Get a specific session by ID (with user isolation)
 */
export function getSessionById(sessionId: string, userId: string): DesktopSession | null {
  const sessions = loadSessions();
  return sessions.find(s => s.id === sessionId && s.user_id === userId) || null;
}

/**
 * Register a new desktop app session
 */
export function createSession(
  userId: string,
  deviceLabel: string,
  osType: string
): DesktopSession {
  const sessions = loadSessions();
  const now = new Date().toISOString();

  const newSession: DesktopSession = {
    id: uuidv4(),
    user_id: userId,
    device_label: deviceLabel,
    os_type: osType,
    last_seen_at: now,
    created_at: now,
    updated_at: now,
  };

  sessions.push(newSession);
  saveSessions(sessions);

  return newSession;
}

/**
 * Update session's last_seen_at timestamp (heartbeat)
 */
export function updateSessionHeartbeat(sessionId: string, userId: string): DesktopSession | null {
  const sessions = loadSessions();
  const sessionIndex = sessions.findIndex(s => s.id === sessionId && s.user_id === userId);

  if (sessionIndex === -1) {
    return null;
  }

  const now = new Date().toISOString();
  sessions[sessionIndex] = {
    ...sessions[sessionIndex],
    last_seen_at: now,
    updated_at: now,
  };

  saveSessions(sessions);
  return sessions[sessionIndex];
}

/**
 * Update session device label
 */
export function updateSessionLabel(
  sessionId: string,
  userId: string,
  deviceLabel: string
): DesktopSession | null {
  const sessions = loadSessions();
  const sessionIndex = sessions.findIndex(s => s.id === sessionId && s.user_id === userId);

  if (sessionIndex === -1) {
    return null;
  }

  const now = new Date().toISOString();
  sessions[sessionIndex] = {
    ...sessions[sessionIndex],
    device_label: deviceLabel,
    updated_at: now,
  };

  saveSessions(sessions);
  return sessions[sessionIndex];
}

/**
 * Delete a desktop session
 */
export function deleteSession(sessionId: string, userId: string): boolean {
  const sessions = loadSessions();
  const initialLength = sessions.length;
  const filteredSessions = sessions.filter(s => !(s.id === sessionId && s.user_id === userId));

  if (filteredSessions.length === initialLength) {
    return false; // Session not found
  }

  saveSessions(filteredSessions);
  return true;
}

/**
 * Get session count for a user
 */
export function getSessionCount(userId: string): number {
  const sessions = loadSessions();
  return sessions.filter(s => s.user_id === userId).length;
}

/**
 * Check if a session is considered "active" (seen within last 5 minutes)
 */
export function isSessionActive(session: DesktopSession): boolean {
  const lastSeen = new Date(session.last_seen_at).getTime();
  const fiveMinutesAgo = Date.now() - 5 * 60 * 1000;
  return lastSeen > fiveMinutesAgo;
}
