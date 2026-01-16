/**
 * Keywords data management for development.
 * In production, this would use Supabase with RLS.
 * For development, we use file-based persistence scoped to user IDs.
 */

import * as fs from 'fs';
import * as path from 'path';

export interface KeywordGroup {
  id: string;
  user_id: string;
  keywords: string[];
  active: boolean;
  created_at: string;
  updated_at: string;
}

// In-memory keyword groups store (loaded from file on startup)
const keywordGroups: Map<string, KeywordGroup> = new Map();

// File path for keyword persistence
const DATA_DIR = path.join(process.cwd(), '.dev-data');
const KEYWORDS_FILE = path.join(DATA_DIR, 'keywords.json');

// Flag to track if keywords have been loaded
let keywordsLoaded = false;

/**
 * Ensure the data directory exists
 */
function ensureDataDir(): void {
  if (!fs.existsSync(DATA_DIR)) {
    fs.mkdirSync(DATA_DIR, { recursive: true });
  }
}

/**
 * Load keywords from JSON file
 */
function loadKeywordsFromFile(): void {
  if (keywordsLoaded) return;

  try {
    if (fs.existsSync(KEYWORDS_FILE)) {
      const data = fs.readFileSync(KEYWORDS_FILE, 'utf-8');
      const keywordsArray: KeywordGroup[] = JSON.parse(data);
      keywordGroups.clear();
      for (const group of keywordsArray) {
        keywordGroups.set(group.id, group);
      }
    }
  } catch (error) {
    console.error('Error loading keywords from file:', error);
  }

  keywordsLoaded = true;
}

/**
 * Save keywords to JSON file
 */
function saveKeywordsToFile(): void {
  try {
    ensureDataDir();
    const keywordsArray = Array.from(keywordGroups.values());
    fs.writeFileSync(KEYWORDS_FILE, JSON.stringify(keywordsArray, null, 2));
  } catch (error) {
    console.error('Error saving keywords to file:', error);
  }
}

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
 * Get all keyword groups for a specific user
 * This implements RLS - users can only see their own data
 */
export function getKeywordGroupsByUserId(userId: string): KeywordGroup[] {
  loadKeywordsFromFile();
  return Array.from(keywordGroups.values()).filter(group => group.user_id === userId);
}

/**
 * Get a specific keyword group by ID
 * Returns null if not found or doesn't belong to user
 */
export function getKeywordGroupById(groupId: string, userId: string): KeywordGroup | null {
  loadKeywordsFromFile();
  const group = keywordGroups.get(groupId);
  if (!group || group.user_id !== userId) {
    return null;
  }
  return group;
}

/**
 * Create a new keyword group for a user
 */
export function createKeywordGroup(userId: string, keywords: string[]): KeywordGroup {
  loadKeywordsFromFile();
  const now = new Date().toISOString();
  const group: KeywordGroup = {
    id: generateId(),
    user_id: userId,
    keywords,
    active: true,
    created_at: now,
    updated_at: now,
  };

  keywordGroups.set(group.id, group);
  saveKeywordsToFile();
  return group;
}

/**
 * Update a keyword group
 * Only updates if the group belongs to the user (RLS)
 */
export function updateKeywordGroup(
  groupId: string,
  userId: string,
  updates: { keywords?: string[]; active?: boolean }
): KeywordGroup | null {
  loadKeywordsFromFile();
  const group = keywordGroups.get(groupId);
  if (!group || group.user_id !== userId) {
    return null;
  }

  if (updates.keywords !== undefined) {
    group.keywords = updates.keywords;
  }
  if (updates.active !== undefined) {
    group.active = updates.active;
  }
  group.updated_at = new Date().toISOString();

  keywordGroups.set(groupId, group);
  saveKeywordsToFile();
  return group;
}

/**
 * Delete a keyword group
 * Only deletes if the group belongs to the user (RLS)
 */
export function deleteKeywordGroup(groupId: string, userId: string): boolean {
  loadKeywordsFromFile();
  const group = keywordGroups.get(groupId);
  if (!group || group.user_id !== userId) {
    return false;
  }

  keywordGroups.delete(groupId);
  saveKeywordsToFile();
  return true;
}

/**
 * Get all unique keywords for a user across all their groups
 */
export function getAllKeywordsForUser(userId: string): string[] {
  const userGroups = getKeywordGroupsByUserId(userId);
  const allKeywords = new Set<string>();

  for (const group of userGroups) {
    if (group.active) {
      for (const keyword of group.keywords) {
        allKeywords.add(keyword);
      }
    }
  }

  return Array.from(allKeywords);
}

/**
 * Clear all keyword groups for a user
 * Returns the number of groups deleted
 */
export function clearAllKeywordsForUser(userId: string): number {
  loadKeywordsFromFile();
  const userGroups = getKeywordGroupsByUserId(userId);
  let deletedCount = 0;

  for (const group of userGroups) {
    keywordGroups.delete(group.id);
    deletedCount++;
  }

  saveKeywordsToFile();
  return deletedCount;
}

/**
 * Delete a specific keyword from all groups for a user
 * Returns true if the keyword was found and deleted
 */
export function deleteKeywordForUser(userId: string, keyword: string): boolean {
  loadKeywordsFromFile();
  const userGroups = getKeywordGroupsByUserId(userId);
  let foundAndDeleted = false;

  for (const group of userGroups) {
    const keywordIndex = group.keywords.indexOf(keyword);
    if (keywordIndex !== -1) {
      group.keywords.splice(keywordIndex, 1);
      group.updated_at = new Date().toISOString();
      foundAndDeleted = true;

      // If the group is now empty, delete it
      if (group.keywords.length === 0) {
        keywordGroups.delete(group.id);
      } else {
        keywordGroups.set(group.id, group);
      }
    }
  }

  saveKeywordsToFile();
  return foundAndDeleted;
}
