import { getSessionUser } from '@/lib/auth';
import {
  getConnectionsForUser,
  getStatusColor,
  getStatusLabel,
  PlatformConnectionStatus,
  PlatformConnection,
} from '@/lib/platforms';
import { PlatformCard } from '@/components/PlatformCard';
import Link from 'next/link';

// Platform configuration
const PLATFORMS = [
  {
    id: 'SLACK' as const,
    name: 'Slack',
    iconBg: 'bg-purple-100',
    iconColor: 'text-purple-600',
    icon: (
      <svg className="w-8 h-8" viewBox="0 0 24 24" fill="currentColor">
        <path d="M5.042 15.165a2.528 2.528 0 0 1-2.52 2.523A2.528 2.528 0 0 1 0 15.165a2.527 2.527 0 0 1 2.522-2.52h2.52v2.52zM6.313 15.165a2.527 2.527 0 0 1 2.521-2.52 2.527 2.527 0 0 1 2.521 2.52v6.313A2.528 2.528 0 0 1 8.834 24a2.528 2.528 0 0 1-2.521-2.522v-6.313zM8.834 5.042a2.528 2.528 0 0 1-2.521-2.52A2.528 2.528 0 0 1 8.834 0a2.528 2.528 0 0 1 2.521 2.522v2.52H8.834zM8.834 6.313a2.528 2.528 0 0 1 2.521 2.521 2.528 2.528 0 0 1-2.521 2.521H2.522A2.528 2.528 0 0 1 0 8.834a2.528 2.528 0 0 1 2.522-2.521h6.312zM18.956 8.834a2.528 2.528 0 0 1 2.522-2.521A2.528 2.528 0 0 1 24 8.834a2.528 2.528 0 0 1-2.522 2.521h-2.522V8.834zM17.688 8.834a2.528 2.528 0 0 1-2.523 2.521 2.527 2.527 0 0 1-2.52-2.521V2.522A2.527 2.527 0 0 1 15.165 0a2.528 2.528 0 0 1 2.523 2.522v6.312zM15.165 18.956a2.528 2.528 0 0 1 2.523 2.522A2.528 2.528 0 0 1 15.165 24a2.527 2.527 0 0 1-2.52-2.522v-2.522h2.52zM15.165 17.688a2.527 2.527 0 0 1-2.52-2.523 2.526 2.526 0 0 1 2.52-2.52h6.313A2.527 2.527 0 0 1 24 15.165a2.528 2.528 0 0 1-2.522 2.523h-6.313z"/>
      </svg>
    ),
    available: true,
  },
  {
    id: 'LINKEDIN' as const,
    name: 'LinkedIn',
    iconBg: 'bg-blue-100',
    iconColor: 'text-blue-600',
    icon: (
      <svg className="w-8 h-8" viewBox="0 0 24 24" fill="currentColor">
        <path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433c-1.144 0-2.063-.926-2.063-2.065 0-1.138.92-2.063 2.063-2.063 1.14 0 2.064.925 2.064 2.063 0 1.139-.925 2.065-2.064 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z"/>
      </svg>
    ),
    available: false,
  },
];

interface PageProps {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}

export default async function PlatformsPage({ searchParams }: PageProps) {
  const user = await getSessionUser();
  const params = await searchParams;

  // Get platform connections from database
  const connections = user ? await getConnectionsForUser(user.id) : [];

  // Test mode for verifying status badge colors
  // ?test=connected, ?test=disconnected, ?test=degraded, ?test=pending
  const testStatus = params.test as PlatformConnectionStatus | undefined;

  // Get status for a platform (real or test)
  const getDisplayStatus = (platformId: 'SLACK' | 'LINKEDIN') => {
    if (testStatus && ['CONNECTED', 'DISCONNECTED', 'DEGRADED', 'PENDING'].includes(testStatus.toUpperCase())) {
      return testStatus.toUpperCase() as PlatformConnectionStatus;
    }
    const connection = connections.find(c => c.platform === platformId);
    return connection?.status || 'DISCONNECTED';
  };

  // Get connection data for a platform (real or test)
  const getConnectionData = (platformId: 'SLACK' | 'LINKEDIN'): Partial<PlatformConnection> | null => {
    if (testStatus && ['CONNECTED', 'DISCONNECTED', 'DEGRADED', 'PENDING'].includes(testStatus.toUpperCase())) {
      // Return mock data for test mode with simulated last sync time
      const status = testStatus.toUpperCase() as PlatformConnectionStatus;
      if (status === 'CONNECTED' || status === 'DEGRADED') {
        return {
          last_checked_at: new Date(Date.now() - 30 * 60 * 1000).toISOString(), // 30 minutes ago
          connected_at: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString(), // 7 days ago
        };
      }
      return null;
    }
    const connection = connections.find(c => c.platform === platformId);
    return connection || null;
  };

  return (
    <div className="max-w-4xl">
      {/* Page Header */}
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-gray-900">Platform Connections</h1>
        <p className="text-gray-600 mt-1">
          Connect your social platforms to start discovering leads.
        </p>
      </div>

      {/* Test Mode Banner */}
      {testStatus && (
        <div className="mb-4 p-3 bg-amber-50 border border-amber-200 rounded-lg text-amber-800 text-sm">
          <strong>Test Mode:</strong> Showing all platforms with <code className="bg-amber-100 px-1 rounded">{testStatus.toUpperCase()}</code> status.
          <Link href="/platforms" className="ml-2 underline">Exit test mode</Link>
        </div>
      )}

      {/* Platform Cards */}
      <div className="space-y-4">
        {PLATFORMS.map((platform) => {
          const status = platform.available ? getDisplayStatus(platform.id) : null;
          const statusColor = status ? getStatusColor(status) : 'bg-gray-400';
          const statusLabel = status ? getStatusLabel(status) : 'Coming soon';
          const isDisconnected = status === 'DISCONNECTED';
          const isDegraded = status === 'DEGRADED';
          const connectionData = platform.available ? getConnectionData(platform.id) : null;
          const lastSyncTime = connectionData?.last_checked_at ?? null;
          const showLastSync = status === 'CONNECTED' || status === 'DEGRADED';
          const showTroubleshooting = isDisconnected || isDegraded;
          const connection = connections.find(c => c.platform === platform.id);

          return (
            <PlatformCard
              key={platform.id}
              platformId={platform.id}
              platformName={platform.name}
              status={status}
              statusColor={statusColor}
              statusLabel={statusLabel}
              icon={platform.icon}
              iconBg={platform.iconBg}
              iconColor={platform.iconColor}
              available={platform.available}
              showLastSync={showLastSync}
              lastSyncTime={lastSyncTime}
              showTroubleshooting={showTroubleshooting}
              connectionId={connection?.id}
            />
          );
        })}
      </div>

      {/* Desktop App Prompt */}
      <div className="mt-8 p-6 bg-blue-50 rounded-lg border border-blue-100">
        <div className="flex items-start gap-4">
          <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center flex-shrink-0">
            <svg className="w-6 h-6 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M5 17h14a2 2 0 002-2V5a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
            </svg>
          </div>
          <div>
            <h3 className="font-semibold text-gray-900 mb-1">Desktop App Required</h3>
            <p className="text-gray-600 text-sm mb-3">
              To connect platforms securely, you&apos;ll need to download our desktop app.
              Your credentials stay on your device - we never store them.
            </p>
            <Link href="/download" className="btn-primary inline-flex items-center gap-2">
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
              </svg>
              Download Desktop App
            </Link>
          </div>
        </div>
      </div>

      {/* Privacy Note */}
      <div className="mt-6 text-center text-sm text-gray-500">
        <p>
          <svg className="w-4 h-4 inline-block mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
          </svg>
          We only read conversations - we never post or interact on your behalf.
        </p>
      </div>
    </div>
  );
}
