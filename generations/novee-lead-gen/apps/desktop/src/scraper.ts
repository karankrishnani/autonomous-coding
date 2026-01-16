/**
 * Novee Desktop App - Scraper Module
 *
 * Implements Slack/LinkedIn scraping with retry logic and exponential backoff.
 * Uses remote configuration fetched from the web API.
 */

export interface ScraperConfig {
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
}

export interface ScraperResult {
  success: boolean;
  data?: unknown;
  error?: string;
  attempts: number;
  totalDuration: number;
}

export interface ScraperRunLog {
  timestamp: Date;
  platform: string;
  attempt: number;
  success: boolean;
  error?: string;
  duration: number;
}

/**
 * Delay execution for specified milliseconds
 */
function delay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * Scraper class with built-in retry logic and error handling
 */
export class Scraper {
  private config: ScraperConfig;
  private platform: string;
  private logs: ScraperRunLog[] = [];
  private onLog?: (log: ScraperRunLog) => void;

  constructor(
    platform: string,
    config: ScraperConfig,
    onLog?: (log: ScraperRunLog) => void
  ) {
    this.platform = platform;
    this.config = config;
    this.onLog = onLog;
  }

  /**
   * Get the retry configuration from the scraper config
   */
  getRetryConfig() {
    return {
      maxRetries: this.config.retryStrategy.maxRetries,
      backoffMs: this.config.retryStrategy.backoffMs,
    };
  }

  /**
   * Log a scraper run attempt
   */
  private log(entry: ScraperRunLog) {
    this.logs.push(entry);
    this.onLog?.(entry);
    console.log(
      `[Scraper] ${entry.platform} attempt ${entry.attempt}: ${
        entry.success ? 'SUCCESS' : `FAILED - ${entry.error}`
      } (${entry.duration}ms)`
    );
  }

  /**
   * Get all logged scraper runs
   */
  getLogs(): ScraperRunLog[] {
    return [...this.logs];
  }

  /**
   * Clear all logs
   */
  clearLogs() {
    this.logs = [];
  }

  /**
   * Execute a scraper operation with retry logic and exponential backoff
   *
   * @param operation - The async function to execute
   * @returns ScraperResult with success/failure status and metadata
   */
  async executeWithRetry<T>(
    operation: () => Promise<T>
  ): Promise<ScraperResult & { data?: T }> {
    const { maxRetries, backoffMs } = this.config.retryStrategy;
    const startTime = Date.now();
    let lastError: Error | undefined;
    let currentBackoff = backoffMs;
    let attempts = 0;

    for (let attempt = 1; attempt <= maxRetries + 1; attempt++) {
      attempts = attempt;
      const attemptStart = Date.now();

      try {
        const result = await operation();
        const duration = Date.now() - attemptStart;

        this.log({
          timestamp: new Date(),
          platform: this.platform,
          attempt,
          success: true,
          duration,
        });

        return {
          success: true,
          data: result,
          attempts,
          totalDuration: Date.now() - startTime,
        };
      } catch (error) {
        lastError = error as Error;
        const duration = Date.now() - attemptStart;

        this.log({
          timestamp: new Date(),
          platform: this.platform,
          attempt,
          success: false,
          error: lastError.message,
          duration,
        });

        // If we have more retries available, wait with exponential backoff
        if (attempt <= maxRetries) {
          console.log(
            `[Scraper] Waiting ${currentBackoff}ms before retry ${attempt + 1}/${maxRetries + 1}...`
          );
          await delay(currentBackoff);
          // Exponential backoff: double the delay each time
          currentBackoff *= 2;
        }
      }
    }

    // All retries exhausted
    return {
      success: false,
      error: lastError?.message || 'Unknown error',
      attempts,
      totalDuration: Date.now() - startTime,
    };
  }

  /**
   * Simulate a scraper operation for testing purposes
   * Can be configured to fail a certain number of times before succeeding
   */
  async simulateScrape(options: {
    failCount?: number;
    successData?: unknown;
    errorMessage?: string;
  }): Promise<ScraperResult> {
    let callCount = 0;
    const { failCount = 0, successData = { leads: [] }, errorMessage = 'Simulated failure' } = options;

    return this.executeWithRetry(async () => {
      callCount++;
      if (callCount <= failCount) {
        throw new Error(`${errorMessage} (attempt ${callCount})`);
      }
      return successData;
    });
  }
}

/**
 * Fetch scraper config from the web API
 */
export async function fetchScraperConfig(
  apiBaseUrl: string,
  platform: string,
  authToken: string
): Promise<ScraperConfig | null> {
  try {
    const response = await fetch(`${apiBaseUrl}/api/scraper-config/${platform}`, {
      headers: {
        Cookie: `novee_session=${authToken}`,
      },
    });

    if (!response.ok) {
      console.error(`[Scraper] Failed to fetch config: ${response.status}`);
      return null;
    }

    const data = await response.json();
    return data.config as ScraperConfig;
  } catch (error) {
    console.error('[Scraper] Failed to fetch config:', error);
    return null;
  }
}

/**
 * Create a scraper instance with config from the API
 * Falls back to default config if API fetch fails
 */
export async function createScraper(
  apiBaseUrl: string,
  platform: string,
  authToken: string,
  onLog?: (log: ScraperRunLog) => void
): Promise<Scraper> {
  // Try to fetch remote config
  const remoteConfig = await fetchScraperConfig(apiBaseUrl, platform, authToken);

  // Use remote config or fall back to defaults
  const config: ScraperConfig = remoteConfig || {
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

  return new Scraper(platform, config, onLog);
}

// =============================================================================
// Browser Fingerprint Support
// =============================================================================

/**
 * Browser fingerprint data structure
 * Collected from the web app and applied to Playwright browser context
 */
export interface BrowserFingerprint {
  userAgent: string;
  language: string;
  languages: string[];
  platform: string;
  screenWidth: number;
  screenHeight: number;
  colorDepth: number;
  timezone: string;
  timezoneOffset: number;
  webglVendor?: string;
  webglRenderer?: string;
  fonts?: string[];
  plugins?: string[];
  hardwareConcurrency?: number;
  deviceMemory?: number;
}

/**
 * Fetch user's browser fingerprint from the web API
 * The fingerprint is collected from the web app and stored for the desktop app to use
 */
export async function fetchBrowserFingerprint(
  apiBaseUrl: string,
  authToken: string
): Promise<BrowserFingerprint | null> {
  try {
    const response = await fetch(`${apiBaseUrl}/api/user/fingerprint`, {
      headers: {
        Cookie: `novee_session=${authToken}`,
      },
    });

    if (!response.ok) {
      if (response.status === 404) {
        console.log('[Fingerprint] No fingerprint stored for user');
        return null;
      }
      console.error(`[Fingerprint] Failed to fetch: ${response.status}`);
      return null;
    }

    const data = await response.json();
    console.log('[Fingerprint] Successfully fetched fingerprint');
    return data.fingerprint as BrowserFingerprint;
  } catch (error) {
    console.error('[Fingerprint] Failed to fetch:', error);
    return null;
  }
}

/**
 * Playwright browser context options derived from fingerprint
 * Use this when creating a new browser context in Playwright
 */
export interface PlaywrightContextOptions {
  userAgent: string;
  locale: string;
  viewport: { width: number; height: number };
  colorScheme?: 'light' | 'dark';
  timezoneId: string;
  extraHTTPHeaders?: Record<string, string>;
}

/**
 * Convert a browser fingerprint to Playwright context options
 * This helps reduce detection when scraping Slack/LinkedIn
 */
export function applyFingerprintToContext(
  fingerprint: BrowserFingerprint
): PlaywrightContextOptions {
  console.log('[Fingerprint] Applying fingerprint to browser context');
  console.log(`[Fingerprint] User Agent: ${fingerprint.userAgent}`);
  console.log(`[Fingerprint] Viewport: ${fingerprint.screenWidth}x${fingerprint.screenHeight}`);
  console.log(`[Fingerprint] Timezone: ${fingerprint.timezone}`);
  console.log(`[Fingerprint] Language: ${fingerprint.language}`);

  return {
    userAgent: fingerprint.userAgent,
    locale: fingerprint.language || 'en-US',
    viewport: {
      width: fingerprint.screenWidth || 1920,
      height: fingerprint.screenHeight || 1080,
    },
    timezoneId: fingerprint.timezone || 'America/New_York',
    extraHTTPHeaders: {
      'Accept-Language': fingerprint.languages?.join(',') || fingerprint.language || 'en-US',
    },
  };
}

/**
 * Create Playwright browser context with fingerprint applied
 * This is the main function used by the desktop app to create authenticated browser sessions
 *
 * Example usage:
 * ```typescript
 * const fingerprint = await fetchBrowserFingerprint(apiUrl, authToken);
 * if (fingerprint) {
 *   const contextOptions = applyFingerprintToContext(fingerprint);
 *   const context = await browser.newContext(contextOptions);
 * }
 * ```
 */
export async function createFingerprintedContext(
  apiBaseUrl: string,
  authToken: string
): Promise<PlaywrightContextOptions | null> {
  // Fetch the fingerprint from the API
  const fingerprint = await fetchBrowserFingerprint(apiBaseUrl, authToken);

  if (!fingerprint) {
    console.log('[Fingerprint] No fingerprint available, using defaults');
    return null;
  }

  // Convert to Playwright context options
  return applyFingerprintToContext(fingerprint);
}
