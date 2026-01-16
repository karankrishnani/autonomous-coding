import { NextRequest, NextResponse } from 'next/server';
import { getSessionUser } from '@/lib/auth';

/**
 * In-memory storage for "known good" config
 */
let lastKnownGoodConfig: Record<string, unknown> | null = null;

/**
 * Default fallback config (used when fetch fails)
 */
const DEFAULT_FALLBACK_CONFIG = {
  version: '1.0.0-fallback',
  selectors: {},
  timing: {
    pageLoadDelay: 2000,
    actionDelay: 500,
    scrollDelay: 300,
  },
  retryStrategy: {
    maxRetries: 3,
    backoffMs: 1000,
  },
};

/**
 * POST /api/scraper/test-fallback - Test scraper config fallback behavior
 *
 * This endpoint simulates the desktop app's config fetch with fallback:
 * 1. First call: Stores config as "known good"
 * 2. Second call with simulateFail=true: Returns fallback config
 *
 * Request body:
 * - simulateFail: boolean - If true, simulates API failure
 * - config: object - Config to store as "known good" (optional)
 *
 * Response:
 * - configUsed: The config that was used (remote or fallback)
 * - isFallback: Whether the fallback config was used
 * - lastKnownGood: The stored "known good" config
 */
export async function POST(request: NextRequest) {
  try {
    // Check authentication
    const user = await getSessionUser();

    if (!user) {
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      );
    }

    const body = await request.json();
    const { simulateFail = false, config } = body;

    // Step 1: If config provided, store as "known good"
    if (config && typeof config === 'object') {
      lastKnownGoodConfig = {
        ...config,
        storedAt: new Date().toISOString(),
      };
      return NextResponse.json({
        success: true,
        step: 'store_known_good',
        message: 'Config stored as known good',
        lastKnownGoodConfig,
      });
    }

    // Step 2: Simulate fetch (with optional failure)
    if (simulateFail) {
      // Fetch failed - use fallback config
      const fallbackConfig = lastKnownGoodConfig || DEFAULT_FALLBACK_CONFIG;

      return NextResponse.json({
        success: true,
        step: 'fetch_failed_using_fallback',
        message: 'Config fetch failed, using fallback',
        configUsed: fallbackConfig,
        isFallback: true,
        fallbackSource: lastKnownGoodConfig ? 'last_known_good' : 'default',
        verification: {
          fetchFailed: true,
          fallbackUsed: true,
          hasLastKnownGood: !!lastKnownGoodConfig,
        },
      });
    }

    // Normal fetch - return current config from API
    const remoteConfig = {
      version: '2.0.0',
      selectors: {
        searchInput: '[data-qa="search-input"]',
        messageContainer: '.c-message',
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
    };

    // Update known good config on successful fetch
    lastKnownGoodConfig = {
      ...remoteConfig,
      storedAt: new Date().toISOString(),
    };

    return NextResponse.json({
      success: true,
      step: 'fetch_success',
      message: 'Config fetched successfully from API',
      configUsed: remoteConfig,
      isFallback: false,
      verification: {
        fetchFailed: false,
        fallbackUsed: false,
        configVersion: remoteConfig.version,
      },
    });
  } catch (error) {
    console.error('Config fallback test error:', error);
    return NextResponse.json(
      { error: 'Failed to test config fallback' },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/scraper/test-fallback - Clear stored "known good" config
 */
export async function DELETE() {
  try {
    const user = await getSessionUser();

    if (!user) {
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      );
    }

    lastKnownGoodConfig = null;
    return NextResponse.json({
      success: true,
      message: 'Known good config cleared',
    });
  } catch (error) {
    return NextResponse.json(
      { error: 'Failed to clear config' },
      { status: 500 }
    );
  }
}
