import { NextRequest, NextResponse } from 'next/server';
import { getSessionUser } from '@/lib/auth';

/**
 * Scraper configurations for each platform
 * In production, these would be stored in the database (scraper_configs table)
 * and could be updated without app deployment
 */
const scraperConfigs: Record<string, {
  version: string;
  selectors: Record<string, string>;
  timing: {
    pageLoadDelay: number;
    actionDelay: number;
    scrollDelay: number;
  };
  retryStrategy: {
    maxRetries: number;
    backoffMs: number;
  };
}> = {
  SLACK: {
    version: '1.0.0',
    selectors: {
      searchInput: '[data-qa="search-input"]',
      searchResults: '[data-qa="search-results"]',
      messageContainer: '.c-message',
      messageText: '.c-message__body',
      messageSender: '.c-message__sender_link',
      messageTimestamp: '.c-timestamp',
      channelName: '.p-channel_sidebar__name',
      showMoreButton: '.c-message__show_more',
      modalOverlay: '.c-modal--overlay',
    },
    timing: {
      pageLoadDelay: 2000,
      actionDelay: 500,
      scrollDelay: 300,
    },
    retryStrategy: {
      maxRetries: 3,
      backoffMs: 1000,
    },
  },
  LINKEDIN: {
    version: '1.0.0',
    selectors: {
      searchInput: '.search-global-typeahead__input',
      searchResults: '.search-results-container',
      postContainer: '.feed-shared-update-v2',
      postText: '.feed-shared-update-v2__description',
      postAuthor: '.update-components-actor__name',
      postTimestamp: '.update-components-actor__sub-description',
    },
    timing: {
      pageLoadDelay: 3000,
      actionDelay: 800,
      scrollDelay: 500,
    },
    retryStrategy: {
      maxRetries: 3,
      backoffMs: 2000,
    },
  },
};

/**
 * GET /api/scraper-config/[platform] - Get scraper config for a platform
 *
 * This endpoint returns the scraper configuration for the specified platform.
 * The desktop app fetches this config before each scrape run.
 *
 * For security, this endpoint requires authentication.
 * In the future, we might want to allow public read access for the desktop app
 * with a separate API key mechanism.
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ platform: string }> }
) {
  try {
    // Check authentication
    const user = await getSessionUser();

    if (!user) {
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      );
    }

    const { platform } = await params;
    const platformUpper = platform.toUpperCase();

    // Check if platform is supported
    const config = scraperConfigs[platformUpper];

    if (!config) {
      return NextResponse.json(
        {
          error: `Unknown platform: ${platform}`,
          supported_platforms: Object.keys(scraperConfigs),
        },
        { status: 404 }
      );
    }

    return NextResponse.json({
      platform: platformUpper,
      config,
      updated_at: new Date().toISOString(),
    });
  } catch (error) {
    console.error('Scraper config error:', error);
    return NextResponse.json(
      { error: 'Failed to retrieve scraper config' },
      { status: 500 }
    );
  }
}
