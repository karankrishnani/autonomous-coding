/**
 * @novee/shared - Shared utilities, types, and Supabase client
 *
 * This package contains code shared between the web app and desktop app.
 */

// Export types
export * from './types';

// Export Supabase client and database types
export { createServerClient, createBrowserClient, type Database, type SupabaseClient } from './supabase';

// Export utility functions
export {
  truncateText,
  formatRelativeTime,
  isValidEmail,
  isValidKeyword,
  matchesKeyword,
  findMatchingKeywords,
  generateId,
  delay,
  retryWithBackoff,
  safeJsonParse,
  isNonEmptyString,
  capitalize,
  formatStatus,
  getDateRange,
  detectOS,
} from './utils';
