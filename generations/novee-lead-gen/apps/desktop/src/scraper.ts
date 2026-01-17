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

    const data = (await response.json()) as { config: ScraperConfig };
    return data.config;
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
// Scraper Error Logging (API Integration)
// =============================================================================

/**
 * Log a scraper error to the backend API
 *
 * This function is called when a scraper operation fails after all retries
 * are exhausted. It stores the error message in the platform_connections table
 * so it can be displayed in the web dashboard.
 *
 * @param apiBaseUrl - Base URL of the web API
 * @param platform - Platform that failed (SLACK or LINKEDIN)
 * @param errorMessage - Error message to log
 * @param authToken - User's authentication token
 */
export async function logScraperErrorToAPI(
  apiBaseUrl: string,
  platform: string,
  errorMessage: string,
  authToken: string
): Promise<{ success: boolean; error?: string }> {
  try {
    console.log(`[Scraper] Logging error to API: ${platform} - ${errorMessage}`);

    const response = await fetch(`${apiBaseUrl}/api/scraper/error`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Cookie: authToken,
      },
      body: JSON.stringify({
        platform: platform.toUpperCase(),
        error: errorMessage,
      }),
    });

    if (!response.ok) {
      const errorData = (await response.json()) as { error?: string };
      console.error(`[Scraper] Failed to log error to API: ${errorData.error || response.status}`);
      return { success: false, error: errorData.error || 'Failed to log error' };
    }

    const successData = (await response.json()) as { connection?: { status: string } };
    console.log(`[Scraper] Error logged successfully. Platform status: ${successData.connection?.status}`);
    return { success: true };
  } catch (error) {
    console.error('[Scraper] Failed to log error to API:', error);
    return { success: false, error: String(error) };
  }
}

/**
 * Log a successful scrape to the backend API
 *
 * This function is called when a scraper operation completes successfully.
 * It updates last_checked_at and clears last_error in the platform_connections table.
 *
 * @param apiBaseUrl - Base URL of the web API
 * @param platform - Platform that succeeded (SLACK or LINKEDIN)
 * @param authToken - User's authentication token
 */
export async function logScraperSuccessToAPI(
  apiBaseUrl: string,
  platform: string,
  authToken: string
): Promise<{ success: boolean; error?: string }> {
  try {
    console.log(`[Scraper] Logging success to API: ${platform}`);

    const response = await fetch(`${apiBaseUrl}/api/scraper/success`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Cookie: authToken,
      },
      body: JSON.stringify({
        platform: platform.toUpperCase(),
      }),
    });

    if (!response.ok) {
      const errorData = (await response.json()) as { error?: string };
      console.error(`[Scraper] Failed to log success to API: ${errorData.error || response.status}`);
      return { success: false, error: errorData.error || 'Failed to log success' };
    }

    const successData = (await response.json()) as { connection?: { status: string; last_checked_at?: string } };
    console.log(`[Scraper] Success logged. Platform status: ${successData.connection?.status}, last_checked_at: ${successData.connection?.last_checked_at}`);
    return { success: true };
  } catch (error) {
    console.error('[Scraper] Failed to log success to API:', error);
    return { success: false, error: String(error) };
  }
}

// =============================================================================
// Scheduler Types and Utilities
// =============================================================================

/**
 * Scheduled scrape run result
 */
export interface ScheduledRunResult {
  platform: string;
  startTime: Date;
  endTime: Date;
  success: boolean;
  leadsFound: number;
  error?: string;
  retryAttempts: number;
}

/**
 * Scraper scheduler state
 */
export interface ScraperSchedulerState {
  isRunning: boolean;
  lastRunResult: ScheduledRunResult | null;
  nextScheduledRun: Date | null;
  intervalMs: number;
}

/**
 * Simple scraper scheduler that continues running even after errors
 *
 * This ensures that:
 * 1. Scraper errors don't crash the scheduler
 * 2. Next scheduled run proceeds after a failure
 * 3. Errors are logged to the API for visibility
 */
export class ScraperScheduler {
  private intervalId: ReturnType<typeof setInterval> | null = null;
  private state: ScraperSchedulerState;
  private apiBaseUrl: string;
  private authToken: string;
  private platform: string;
  private scrapeFunction: () => Promise<{ success: boolean; leadsFound: number; error?: string }>;
  private onStateChange?: (state: ScraperSchedulerState) => void;

  constructor(options: {
    apiBaseUrl: string;
    authToken: string;
    platform: string;
    intervalMs: number;
    scrapeFunction: () => Promise<{ success: boolean; leadsFound: number; error?: string }>;
    onStateChange?: (state: ScraperSchedulerState) => void;
  }) {
    this.apiBaseUrl = options.apiBaseUrl;
    this.authToken = options.authToken;
    this.platform = options.platform;
    this.scrapeFunction = options.scrapeFunction;
    this.onStateChange = options.onStateChange;

    this.state = {
      isRunning: false,
      lastRunResult: null,
      nextScheduledRun: null,
      intervalMs: options.intervalMs,
    };
  }

  /**
   * Get current scheduler state
   */
  getState(): ScraperSchedulerState {
    return { ...this.state };
  }

  /**
   * Start the scheduler
   */
  start(): void {
    if (this.intervalId) {
      console.log(`[Scheduler] ${this.platform} scheduler already running`);
      return;
    }

    console.log(`[Scheduler] Starting ${this.platform} scheduler (interval: ${this.state.intervalMs}ms)`);

    // Calculate next run time
    this.state.nextScheduledRun = new Date(Date.now() + this.state.intervalMs);
    this.notifyStateChange();

    // Set up interval
    this.intervalId = setInterval(() => {
      this.runScrape();
    }, this.state.intervalMs);

    // Run immediately on start
    this.runScrape();
  }

  /**
   * Stop the scheduler
   */
  stop(): void {
    if (this.intervalId) {
      clearInterval(this.intervalId);
      this.intervalId = null;
      this.state.nextScheduledRun = null;
      console.log(`[Scheduler] ${this.platform} scheduler stopped`);
      this.notifyStateChange();
    }
  }

  /**
   * Run a single scrape cycle
   */
  private async runScrape(): Promise<void> {
    if (this.state.isRunning) {
      console.log(`[Scheduler] ${this.platform} scrape already in progress, skipping`);
      return;
    }

    this.state.isRunning = true;
    this.notifyStateChange();

    const startTime = new Date();
    console.log(`[Scheduler] ${this.platform} scrape starting at ${startTime.toISOString()}`);

    try {
      const result = await this.scrapeFunction();

      const endTime = new Date();
      this.state.lastRunResult = {
        platform: this.platform,
        startTime,
        endTime,
        success: result.success,
        leadsFound: result.leadsFound,
        error: result.error,
        retryAttempts: 0, // Retry attempts are handled within scrapeFunction
      };

      // Update platform connection at the END of scraping
      if (result.success) {
        // Log success to API to update last_checked_at
        await logScraperSuccessToAPI(
          this.apiBaseUrl,
          this.platform,
          this.authToken
        );
      } else if (result.error) {
        // Log error to API so it's visible in the dashboard
        await logScraperErrorToAPI(
          this.apiBaseUrl,
          this.platform,
          result.error,
          this.authToken
        );
      }

      console.log(`[Scheduler] ${this.platform} scrape completed: ${result.success ? 'SUCCESS' : 'FAILED'}`);

    } catch (error) {
      // Catch any unexpected errors to ensure scheduler continues
      const endTime = new Date();
      const errorMessage = error instanceof Error ? error.message : String(error);

      this.state.lastRunResult = {
        platform: this.platform,
        startTime,
        endTime,
        success: false,
        leadsFound: 0,
        error: errorMessage,
        retryAttempts: 0,
      };

      // Log error to API
      await logScraperErrorToAPI(
        this.apiBaseUrl,
        this.platform,
        errorMessage,
        this.authToken
      );

      console.error(`[Scheduler] ${this.platform} scrape error (scheduler continues):`, errorMessage);
    } finally {
      // Always update state and schedule next run
      this.state.isRunning = false;
      this.state.nextScheduledRun = new Date(Date.now() + this.state.intervalMs);
      this.notifyStateChange();
    }
  }

  /**
   * Notify listeners of state change
   */
  private notifyStateChange(): void {
    this.onStateChange?.(this.getState());
  }
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

    const data = (await response.json()) as { fingerprint: BrowserFingerprint };
    console.log('[Fingerprint] Successfully fetched fingerprint');
    return data.fingerprint;
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
