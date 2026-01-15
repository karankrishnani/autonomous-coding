/**
 * Novee Lead Generation Platform - Shared Types
 * These types are used across the web app, desktop app, and API
 */

// ============================================================
// User Types
// ============================================================

export interface User {
  id: string;
  email: string;
  name: string | null;
  created_at: string;
  updated_at: string;
}

export interface UserFingerprint {
  id: string;
  user_id: string;
  fingerprint: Record<string, unknown>;
  collected_at: string;
  created_at: string;
  updated_at: string;
}

export interface DesktopAppSession {
  id: string;
  user_id: string;
  device_label: string | null;
  os_type: string | null;
  last_seen_at: string;
  created_at: string;
  updated_at: string;
}

// ============================================================
// Platform Connection Types
// ============================================================

export type PlatformType = 'SLACK' | 'LINKEDIN';

export type PlatformConnectionStatus = 'PENDING' | 'CONNECTED' | 'DEGRADED' | 'DISCONNECTED';

export interface PlatformConnection {
  id: string;
  user_id: string;
  platform: PlatformType;
  status: PlatformConnectionStatus;
  metadata: PlatformMetadata;
  last_checked_at: string | null;
  last_error: string | null;
  connected_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface PlatformMetadata {
  workspaces?: WorkspaceInfo[];
  [key: string]: unknown;
}

export interface WorkspaceInfo {
  name: string;
  url: string;
}

export interface Channel {
  id: string;
  platform_connection_id: string;
  name: string;
  type: string | null;
  metadata: Record<string, unknown>;
  last_run_at: string | null;
  next_run_at: string | null;
  created_at: string;
  updated_at: string;
}

// ============================================================
// Keyword Types
// ============================================================

export interface UserKeywordGroup {
  id: string;
  user_id: string;
  active: boolean;
  created_at: string;
  updated_at: string;
  keywords?: Keyword[];
}

export interface Keyword {
  id: string;
  user_keyword_group_id: string;
  text: string;
  created_at: string;
  updated_at: string;
}

export interface KeywordSuggestion {
  category: 'skills' | 'tools' | 'industry';
  keywords: string[];
}

// ============================================================
// Post & Lead Types
// ============================================================

export interface Post {
  id: string;
  channel_id: string;
  timestamp: string;
  content: string;
  source_url: string | null;
  metadata: PostMetadata;
  created_at: string;
  updated_at: string;
}

export interface PostMetadata {
  sender?: string;
  sender_name?: string;
  reactions?: number;
  [key: string]: unknown;
}

export type LeadStatus =
  | 'NEW'
  | 'VIEWED'
  | 'INTERESTED'
  | 'NOT_INTERESTED'
  | 'MARKED_LATER'
  | 'ARCHIVED';

export interface Lead {
  id: string;
  user_id: string;
  post_id: string;
  matched_keywords: string[];
  status: LeadStatus;
  first_viewed_at: string | null;
  created_at: string;
  updated_at: string;
  // Joined data
  post?: Post;
  channel?: Channel;
  platform_connection?: PlatformConnection;
}

export type LeadInteractionAction =
  | 'INTERESTED'
  | 'NOT_INTERESTED'
  | 'MARKED_LATER'
  | 'OPENED_SOURCE';

export interface LeadInteraction {
  id: string;
  lead_id: string;
  user_id: string;
  action: LeadInteractionAction;
  created_at: string;
}

// ============================================================
// Onboarding Types
// ============================================================

export type OnboardingEvent =
  | 'ACCOUNT_CREATED'
  | 'WEB_LOGIN'
  | 'BROWSER_FINGERPRINT_CAPTURED'
  | 'DESKTOP_DOWNLOADED'
  | 'DESKTOP_INSTALLED'
  | 'PLATFORM_CONNECTED'
  | 'KEYWORDS_SELECTED'
  | 'FIRST_LEAD_VIEWED';

export interface OnboardingEventRecord {
  id: string;
  user_id: string;
  event: OnboardingEvent;
  platform_connection_id: string | null;
  occurred_at: string;
  metadata: Record<string, unknown>;
  created_at: string;
}

export interface OnboardingStatus {
  account_created: boolean;
  web_login: boolean;
  browser_fingerprint_captured: boolean;
  desktop_downloaded: boolean;
  desktop_installed: boolean;
  platform_connected: boolean;
  keywords_selected: boolean;
  first_lead_viewed: boolean;
  completed: boolean;
}

// ============================================================
// Scraper Config Types
// ============================================================

export type ScraperPlatform = 'SLACK' | 'LINKEDIN' | 'REDDIT';

export interface ScraperConfig {
  platform: ScraperPlatform;
  version: string;
  config: ScraperConfigDetails;
  updated_at: string;
}

export interface ScraperConfigDetails {
  selectors: Record<string, string>;
  timing: {
    pageLoadDelay: number;
    actionDelay: number;
    scrollDelay: number;
  };
  retryStrategy: {
    maxRetries: number;
    backoffMultiplier: number;
    initialDelayMs: number;
  };
  [key: string]: unknown;
}

// ============================================================
// API Request/Response Types
// ============================================================

export interface PaginationParams {
  page?: number;
  limit?: number;
}

export interface PaginatedResponse<T> {
  data: T[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

export interface LeadFilters {
  status?: LeadStatus;
  platform?: PlatformType;
  keyword?: string;
  dateRange?: 'today' | 'this_week' | 'this_month' | 'all_time';
  sortBy?: 'newest' | 'oldest' | 'most_keywords';
}

export interface LeadsQueryParams extends PaginationParams, LeadFilters {}

export interface LeadStats {
  new: number;
  viewed: number;
  interested: number;
  not_interested: number;
  marked_later: number;
  archived: number;
  total: number;
}

export interface CreateKeywordGroupRequest {
  keywords: string[];
  active?: boolean;
}

export interface UpdateKeywordGroupRequest {
  keywords?: string[];
  active?: boolean;
}

export interface UpdateLeadStatusRequest {
  status: LeadStatus;
}

export interface CreateLeadInteractionRequest {
  action: LeadInteractionAction;
}

export interface UpdateProfileRequest {
  name?: string;
}

export interface StoreFingerprintRequest {
  fingerprint: Record<string, unknown>;
}

export interface TrackOnboardingEventRequest {
  event: OnboardingEvent;
  platform_connection_id?: string;
  metadata?: Record<string, unknown>;
}

// ============================================================
// Desktop App Types
// ============================================================

export interface SearchResultItem {
  message: string;
  channel: string;
  timestamp: string;
  permalink: string;
  sender?: string;
  timestampUnix?: number;
}

export interface SearchResult {
  workspaceName: string;
  workspaceUrl: string;
  results: SearchResultItem[];
}

export interface RegisterDesktopSessionRequest {
  device_label?: string;
  os_type?: string;
}

export interface UpdateDesktopSessionRequest {
  device_label?: string;
  last_seen_at?: string;
}

// ============================================================
// Error Types
// ============================================================

export interface ApiError {
  error: string;
  message: string;
  statusCode: number;
}
