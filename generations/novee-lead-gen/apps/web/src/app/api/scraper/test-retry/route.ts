import { NextRequest, NextResponse } from 'next/server';
import { getSessionUser } from '@/lib/auth';

/**
 * Scraper configuration for testing
 */
interface ScraperConfig {
  retryStrategy: {
    maxRetries: number;
    backoffMs: number;
  };
}

/**
 * Delay execution for specified milliseconds
 */
function delay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * Scraper retry log entry
 */
interface RetryLogEntry {
  attempt: number;
  timestamp: string;
  success: boolean;
  error?: string;
  backoffApplied?: number;
}

/**
 * POST /api/scraper/test-retry - Test scraper retry logic
 *
 * This endpoint simulates the scraper retry logic with exponential backoff.
 * It can be configured to fail a certain number of times before succeeding.
 *
 * Request body:
 * - failCount: Number of times to fail before succeeding (default: 2)
 * - platform: Platform to use config from (default: 'SLACK')
 *
 * Response:
 * - success: Whether the operation ultimately succeeded
 * - attempts: Total number of attempts made
 * - logs: Array of retry log entries
 * - maxRetriesRespected: Whether max retries limit was respected
 * - backoffApplied: Whether exponential backoff was applied between retries
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
    const { failCount = 2, platform = 'SLACK' } = body;

    // Get scraper config
    const configs: Record<string, ScraperConfig> = {
      SLACK: {
        retryStrategy: {
          maxRetries: 3,
          backoffMs: 100, // Reduced for testing (normally 1000ms)
        },
      },
      LINKEDIN: {
        retryStrategy: {
          maxRetries: 3,
          backoffMs: 200, // Reduced for testing (normally 2000ms)
        },
      },
    };

    const config = configs[platform.toUpperCase()] || configs.SLACK;
    const { maxRetries, backoffMs } = config.retryStrategy;

    // Execute with retry logic
    const logs: RetryLogEntry[] = [];
    let callCount = 0;
    let currentBackoff = backoffMs;
    let success = false;
    let lastError: string | undefined;
    const startTime = Date.now();

    for (let attempt = 1; attempt <= maxRetries + 1; attempt++) {
      callCount++;
      const attemptTime = new Date().toISOString();

      try {
        // Simulate operation - fail if we haven't reached failCount yet
        if (callCount <= failCount) {
          throw new Error(`Simulated failure (attempt ${callCount})`);
        }

        // Success!
        success = true;
        logs.push({
          attempt,
          timestamp: attemptTime,
          success: true,
        });
        break;
      } catch (error) {
        lastError = (error as Error).message;
        logs.push({
          attempt,
          timestamp: attemptTime,
          success: false,
          error: lastError,
          backoffApplied: attempt <= maxRetries ? currentBackoff : undefined,
        });

        // If we have more retries, wait with exponential backoff
        if (attempt <= maxRetries) {
          await delay(currentBackoff);
          currentBackoff *= 2; // Exponential backoff
        }
      }
    }

    const totalDuration = Date.now() - startTime;

    // Verify max retries was respected
    const maxRetriesRespected = logs.length <= maxRetries + 1;

    // Verify backoff was applied (check that delays increased)
    let backoffApplied = true;
    if (logs.length > 1) {
      for (let i = 1; i < logs.length - 1; i++) {
        const prevBackoff = logs[i - 1].backoffApplied || 0;
        const currBackoff = logs[i].backoffApplied || 0;
        if (currBackoff > 0 && prevBackoff > 0 && currBackoff <= prevBackoff) {
          backoffApplied = false;
          break;
        }
      }
    }

    return NextResponse.json({
      success,
      attempts: logs.length,
      logs,
      maxRetriesRespected,
      backoffApplied,
      totalDuration,
      config: {
        maxRetries,
        initialBackoffMs: backoffMs,
      },
      error: success ? undefined : lastError,
    });
  } catch (error) {
    console.error('Scraper test-retry error:', error);
    return NextResponse.json(
      { error: 'Failed to run retry test' },
      { status: 500 }
    );
  }
}
