'use client';

import { useState } from 'react';

interface RetryLogEntry {
  attempt: number;
  timestamp: string;
  success: boolean;
  error?: string;
  backoffApplied?: number;
}

interface TestResult {
  success: boolean;
  attempts: number;
  logs: RetryLogEntry[];
  maxRetriesRespected: boolean;
  backoffApplied: boolean;
  totalDuration: number;
  config: {
    maxRetries: number;
    initialBackoffMs: number;
  };
  error?: string;
}

export default function ScraperTestPage() {
  const [failCount, setFailCount] = useState(2);
  const [platform, setPlatform] = useState('SLACK');
  const [isLoading, setIsLoading] = useState(false);
  const [result, setResult] = useState<TestResult | null>(null);
  const [error, setError] = useState<string | null>(null);

  const runTest = async () => {
    setIsLoading(true);
    setError(null);
    setResult(null);

    try {
      const response = await fetch('/api/scraper/test-retry', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ failCount, platform }),
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`);
      }

      const data = await response.json();
      setResult(data);
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="max-w-4xl mx-auto">
      <h1 className="text-2xl font-bold mb-2">Scraper Retry Logic Test</h1>
      <p className="text-gray-600 dark:text-gray-400 mb-6">
        Test the scraper retry logic with exponential backoff. Configure how many times
        the operation should fail before succeeding.
      </p>

      <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6 mb-6">
        <h2 className="text-lg font-semibold mb-4">Test Configuration</h2>

        <div className="grid grid-cols-2 gap-4 mb-4">
          <div>
            <label className="block text-sm font-medium mb-1">
              Fail Count (how many times to fail)
            </label>
            <input
              type="number"
              min="0"
              max="10"
              value={failCount}
              onChange={(e) => setFailCount(parseInt(e.target.value) || 0)}
              className="w-full px-3 py-2 border rounded-lg dark:bg-gray-700 dark:border-gray-600"
            />
          </div>

          <div>
            <label className="block text-sm font-medium mb-1">Platform</label>
            <select
              value={platform}
              onChange={(e) => setPlatform(e.target.value)}
              className="w-full px-3 py-2 border rounded-lg dark:bg-gray-700 dark:border-gray-600"
            >
              <option value="SLACK">Slack</option>
              <option value="LINKEDIN">LinkedIn</option>
            </select>
          </div>
        </div>

        <button
          onClick={runTest}
          disabled={isLoading}
          className="btn-primary"
        >
          {isLoading ? 'Running Test...' : 'Run Retry Test'}
        </button>
      </div>

      {error && (
        <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-4 mb-6">
          <p className="text-red-800 dark:text-red-200">Error: {error}</p>
        </div>
      )}

      {result && (
        <div className="space-y-6">
          {/* Summary */}
          <div className={`rounded-lg p-6 ${
            result.success
              ? 'bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800'
              : 'bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800'
          }`}>
            <h2 className="text-lg font-semibold mb-4">
              {result.success ? '✅ Test Passed' : '❌ Operation Failed (Max Retries Exhausted)'}
            </h2>

            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div>
                <p className="text-sm text-gray-600 dark:text-gray-400">Total Attempts</p>
                <p className="text-2xl font-bold">{result.attempts}</p>
              </div>
              <div>
                <p className="text-sm text-gray-600 dark:text-gray-400">Total Duration</p>
                <p className="text-2xl font-bold">{result.totalDuration}ms</p>
              </div>
              <div>
                <p className="text-sm text-gray-600 dark:text-gray-400">Max Retries</p>
                <p className="text-2xl font-bold">{result.config.maxRetries}</p>
              </div>
              <div>
                <p className="text-sm text-gray-600 dark:text-gray-400">Initial Backoff</p>
                <p className="text-2xl font-bold">{result.config.initialBackoffMs}ms</p>
              </div>
            </div>
          </div>

          {/* Verification Checks */}
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
            <h2 className="text-lg font-semibold mb-4">Verification Checks</h2>
            <ul className="space-y-2">
              <li className="flex items-center gap-2">
                <span className={result.logs.some(l => !l.success) ? 'text-green-500' : 'text-gray-400'}>
                  {result.logs.some(l => !l.success) ? '✓' : '○'}
                </span>
                <span>Scraper failure simulated</span>
              </li>
              <li className="flex items-center gap-2">
                <span className={result.attempts > 1 ? 'text-green-500' : 'text-gray-400'}>
                  {result.attempts > 1 ? '✓' : '○'}
                </span>
                <span>Retry attempts occurred ({result.attempts} total)</span>
              </li>
              <li className="flex items-center gap-2">
                <span className={result.backoffApplied ? 'text-green-500' : 'text-gray-400'}>
                  {result.backoffApplied ? '✓' : '○'}
                </span>
                <span>Exponential backoff applied</span>
              </li>
              <li className="flex items-center gap-2">
                <span className={result.maxRetriesRespected ? 'text-green-500' : 'text-red-500'}>
                  {result.maxRetriesRespected ? '✓' : '✗'}
                </span>
                <span>Max retries respected (max {result.config.maxRetries + 1} attempts)</span>
              </li>
            </ul>
          </div>

          {/* Retry Log */}
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
            <h2 className="text-lg font-semibold mb-4">Retry Log</h2>
            <div className="space-y-2">
              {result.logs.map((log, index) => (
                <div
                  key={index}
                  className={`p-3 rounded-lg ${
                    log.success
                      ? 'bg-green-50 dark:bg-green-900/20'
                      : 'bg-red-50 dark:bg-red-900/20'
                  }`}
                >
                  <div className="flex justify-between items-start">
                    <div>
                      <span className="font-medium">Attempt {log.attempt}</span>
                      <span className={`ml-2 text-sm ${log.success ? 'text-green-600' : 'text-red-600'}`}>
                        {log.success ? 'SUCCESS' : 'FAILED'}
                      </span>
                    </div>
                    <span className="text-xs text-gray-500">
                      {new Date(log.timestamp).toLocaleTimeString()}
                    </span>
                  </div>
                  {log.error && (
                    <p className="text-sm text-red-600 dark:text-red-400 mt-1">{log.error}</p>
                  )}
                  {log.backoffApplied && (
                    <p className="text-sm text-gray-500 mt-1">
                      Waiting {log.backoffApplied}ms before next attempt...
                    </p>
                  )}
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
