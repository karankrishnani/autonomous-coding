import { getSessionUser } from '@/lib/auth';
import { getConnectionById, getStatusColor, getStatusLabel } from '@/lib/platforms';
import { getScrapeLogsByConnectionId, getScrapeStats } from '@/lib/scrape-logs';
import Link from 'next/link';
import { notFound } from 'next/navigation';

interface PageProps {
  params: Promise<{ connectionId: string }>;
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}

// Platform icons
const platformIcons = {
  SLACK: (
    <svg className="w-8 h-8" viewBox="0 0 24 24" fill="currentColor">
      <path d="M5.042 15.165a2.528 2.528 0 0 1-2.52 2.523A2.528 2.528 0 0 1 0 15.165a2.527 2.527 0 0 1 2.522-2.52h2.52v2.52zM6.313 15.165a2.527 2.527 0 0 1 2.521-2.52 2.527 2.527 0 0 1 2.521 2.52v6.313A2.528 2.528 0 0 1 8.834 24a2.528 2.528 0 0 1-2.521-2.522v-6.313zM8.834 5.042a2.528 2.528 0 0 1-2.521-2.52A2.528 2.528 0 0 1 8.834 0a2.528 2.528 0 0 1 2.521 2.522v2.52H8.834zM8.834 6.313a2.528 2.528 0 0 1 2.521 2.521 2.528 2.528 0 0 1-2.521 2.521H2.522A2.528 2.528 0 0 1 0 8.834a2.528 2.528 0 0 1 2.522-2.521h6.312zM18.956 8.834a2.528 2.528 0 0 1 2.522-2.521A2.528 2.528 0 0 1 24 8.834a2.528 2.528 0 0 1-2.522 2.521h-2.522V8.834zM17.688 8.834a2.528 2.528 0 0 1-2.523 2.521 2.527 2.527 0 0 1-2.52-2.521V2.522A2.527 2.527 0 0 1 15.165 0a2.528 2.528 0 0 1 2.523 2.522v6.312zM15.165 18.956a2.528 2.528 0 0 1 2.523 2.522A2.528 2.528 0 0 1 15.165 24a2.527 2.527 0 0 1-2.52-2.522v-2.522h2.52zM15.165 17.688a2.527 2.527 0 0 1-2.52-2.523 2.526 2.526 0 0 1 2.52-2.52h6.313A2.527 2.527 0 0 1 24 15.165a2.528 2.528 0 0 1-2.522 2.523h-6.313z"/>
    </svg>
  ),
  LINKEDIN: (
    <svg className="w-8 h-8" viewBox="0 0 24 24" fill="currentColor">
      <path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433c-1.144 0-2.063-.926-2.063-2.065 0-1.138.92-2.063 2.063-2.063 1.14 0 2.064.925 2.064 2.063 0 1.139-.925 2.065-2.064 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z"/>
    </svg>
  ),
};

const platformIconBg = {
  SLACK: 'bg-purple-100',
  LINKEDIN: 'bg-blue-100',
};

const platformIconColor = {
  SLACK: 'text-purple-600',
  LINKEDIN: 'text-blue-600',
};

function formatRelativeTime(dateString: string): string {
  const date = new Date(dateString);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMins = Math.floor(diffMs / (1000 * 60));
  const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

  if (diffMins < 1) return 'Just now';
  if (diffMins < 60) return `${diffMins} minute${diffMins !== 1 ? 's' : ''} ago`;
  if (diffHours < 24) return `${diffHours} hour${diffHours !== 1 ? 's' : ''} ago`;
  if (diffDays < 7) return `${diffDays} day${diffDays !== 1 ? 's' : ''} ago`;

  return date.toLocaleDateString();
}

function formatDuration(startedAt: string, completedAt: string | null): string {
  if (!completedAt) return 'In progress...';

  const start = new Date(startedAt);
  const end = new Date(completedAt);
  const diffMs = end.getTime() - start.getTime();
  const diffSecs = Math.floor(diffMs / 1000);

  if (diffSecs < 60) return `${diffSecs}s`;
  const mins = Math.floor(diffSecs / 60);
  const secs = diffSecs % 60;
  return `${mins}m ${secs}s`;
}

export default async function PlatformDetailPage({ params, searchParams }: PageProps) {
  const user = await getSessionUser();
  const { connectionId } = await params;
  const queryParams = await searchParams;

  if (!user) {
    notFound();
  }

  // Check for test mode (e.g., test-slack-connection)
  const isTestMode = connectionId.startsWith('test-') && connectionId.endsWith('-connection');
  const testPlatform = isTestMode ? connectionId.replace('test-', '').replace('-connection', '').toUpperCase() : null;

  // Get the connection (real or mock for test mode)
  let connection = await getConnectionById(user.id, connectionId);

  // If test mode and no real connection found, create mock data
  if (!connection && isTestMode && (testPlatform === 'SLACK' || testPlatform === 'LINKEDIN')) {
    connection = {
      id: connectionId,
      user_id: user.id,
      platform: testPlatform as 'SLACK' | 'LINKEDIN',
      status: 'CONNECTED',
      metadata: {
        workspaces: [
          { name: 'Acme Corp', url: 'https://acmecorp.slack.com' },
          { name: 'Design Community', url: 'https://designcommunity.slack.com' },
          { name: 'React Developers', url: 'https://reactdevs.slack.com' },
        ],
      },
      last_checked_at: new Date(Date.now() - 30 * 60 * 1000).toISOString(),
      last_error: null,
      connected_at: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString(),
      created_at: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString(),
      updated_at: new Date(Date.now() - 30 * 60 * 1000).toISOString(),
    };
  }

  if (!connection) {
    notFound();
  }

  // Get scrape logs and stats (empty for test mode)
  const scrapeLogs = isTestMode ? [] : await getScrapeLogsByConnectionId(connectionId, 10);
  const stats = isTestMode ? { totalScrapes: 0, successfulScrapes: 0, failedScrapes: 0, totalMessagesFound: 0, totalLeadsCreated: 0 } : await getScrapeStats(connectionId);

  const statusColor = getStatusColor(connection.status);
  const statusLabel = getStatusLabel(connection.status);
  const platform = connection.platform as 'SLACK' | 'LINKEDIN';
  const icon = platformIcons[platform];
  const iconBg = platformIconBg[platform];
  const iconColor = platformIconColor[platform];

  return (
    <div className="max-w-4xl">
      {/* Breadcrumb */}
      <div className="mb-6">
        <Link
          href="/platforms"
          className="text-sm text-gray-500 hover:text-gray-700 flex items-center gap-1"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
          Back to Platforms
        </Link>
      </div>

      {/* Platform Header */}
      <div className="bg-white rounded-xl border border-gray-200 p-6 mb-6">
        <div className="flex items-center gap-4">
          <div className={`w-14 h-14 ${iconBg} ${iconColor} rounded-xl flex items-center justify-center`}>
            {icon}
          </div>
          <div className="flex-1">
            <h1 className="text-2xl font-bold text-gray-900">
              {platform === 'SLACK' ? 'Slack' : 'LinkedIn'} Connection
            </h1>
            <div className="flex items-center gap-2 mt-1">
              <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${statusColor}`}>
                {statusLabel}
              </span>
              {connection.connected_at && (
                <span className="text-sm text-gray-500">
                  Connected {formatRelativeTime(connection.connected_at)}
                </span>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Connected Workspaces (for Slack) */}
      {platform === 'SLACK' && connection.metadata &&
       Array.isArray((connection.metadata as { workspaces?: Array<{ name: string; url: string }> }).workspaces) &&
       ((connection.metadata as { workspaces: Array<{ name: string; url: string }> }).workspaces.length > 0) && (
        <div className="bg-white rounded-xl border border-gray-200 p-6 mb-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Connected Workspaces</h2>
          <div className="space-y-3">
            {((connection.metadata as { workspaces: Array<{ name: string; url: string }> }).workspaces).map((workspace, index) => (
              <div key={index} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-purple-100 text-purple-600 rounded-lg flex items-center justify-center">
                    <svg className="w-5 h-5" viewBox="0 0 24 24" fill="currentColor">
                      <path d="M5.042 15.165a2.528 2.528 0 0 1-2.52 2.523A2.528 2.528 0 0 1 0 15.165a2.527 2.527 0 0 1 2.522-2.52h2.52v2.52zM6.313 15.165a2.527 2.527 0 0 1 2.521-2.52 2.527 2.527 0 0 1 2.521 2.52v6.313A2.528 2.528 0 0 1 8.834 24a2.528 2.528 0 0 1-2.521-2.522v-6.313z"/>
                    </svg>
                  </div>
                  <div>
                    <p className="font-medium text-gray-900">{workspace.name}</p>
                    {workspace.url && (
                      <p className="text-sm text-gray-500 truncate max-w-xs">{workspace.url}</p>
                    )}
                  </div>
                </div>
                <span className="text-xs text-green-600 bg-green-50 px-2 py-1 rounded-full">Active</span>
              </div>
            ))}
          </div>
          <p className="text-sm text-gray-500 mt-4">
            {((connection.metadata as { workspaces: Array<{ name: string; url: string }> }).workspaces).length} workspace{((connection.metadata as { workspaces: Array<{ name: string; url: string }> }).workspaces).length !== 1 ? 's' : ''} connected
          </p>
        </div>
      )}

      {/* Stats Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
        <div className="bg-white rounded-lg border border-gray-200 p-4">
          <p className="text-sm text-gray-500">Total Scrapes</p>
          <p className="text-2xl font-bold text-gray-900">{stats.totalScrapes}</p>
        </div>
        <div className="bg-white rounded-lg border border-gray-200 p-4">
          <p className="text-sm text-gray-500">Successful</p>
          <p className="text-2xl font-bold text-green-600">{stats.successfulScrapes}</p>
        </div>
        <div className="bg-white rounded-lg border border-gray-200 p-4">
          <p className="text-sm text-gray-500">Messages Found</p>
          <p className="text-2xl font-bold text-gray-900">{stats.totalMessagesFound}</p>
        </div>
        <div className="bg-white rounded-lg border border-gray-200 p-4">
          <p className="text-sm text-gray-500">Leads Created</p>
          <p className="text-2xl font-bold text-blue-600">{stats.totalLeadsCreated}</p>
        </div>
      </div>

      {/* Scrape History */}
      <div className="bg-white rounded-xl border border-gray-200">
        <div className="p-4 border-b border-gray-200">
          <h2 className="text-lg font-semibold text-gray-900">Scrape History</h2>
          <p className="text-sm text-gray-500">Recent scrape operations and their results</p>
        </div>

        {scrapeLogs.length === 0 ? (
          <div className="p-8 text-center">
            <svg className="w-12 h-12 text-gray-300 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
            </svg>
            <p className="text-gray-500 mb-2">No scrapes yet</p>
            <p className="text-sm text-gray-400">
              Scrapes will appear here once your desktop app starts scanning for leads.
            </p>
          </div>
        ) : (
          <div className="divide-y divide-gray-100">
            {scrapeLogs.map((log) => (
              <div key={log.id} className="p-4 hover:bg-gray-50">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    {/* Status indicator */}
                    <div className={`w-2 h-2 rounded-full ${
                      log.status === 'COMPLETED' ? 'bg-green-500' :
                      log.status === 'FAILED' ? 'bg-red-500' :
                      'bg-yellow-500 animate-pulse'
                    }`} />

                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-medium text-gray-900">
                          {log.status === 'COMPLETED' ? 'Completed' :
                           log.status === 'FAILED' ? 'Failed' : 'Running'}
                        </span>
                        <span className="text-sm text-gray-500">
                          {formatRelativeTime(log.started_at)}
                        </span>
                      </div>

                      {log.status === 'COMPLETED' && (
                        <p className="text-sm text-gray-600">
                          Found {log.messages_found} message{log.messages_found !== 1 ? 's' : ''},
                          created {log.leads_created} lead{log.leads_created !== 1 ? 's' : ''}
                        </p>
                      )}

                      {log.status === 'FAILED' && log.error_message && (
                        <p className="text-sm text-red-600 mt-1">
                          {log.error_message}
                        </p>
                      )}
                    </div>
                  </div>

                  <div className="text-right">
                    <span className="text-sm text-gray-500">
                      Duration: {formatDuration(log.started_at, log.completed_at)}
                    </span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Error Details */}
      {connection.last_error && (
        <div className="mt-6 bg-red-50 border border-red-200 rounded-lg p-4">
          <div className="flex items-start gap-3">
            <svg className="w-5 h-5 text-red-500 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <div>
              <h3 className="font-medium text-red-800">Last Error</h3>
              <p className="text-sm text-red-700 mt-1">{connection.last_error}</p>
              {connection.last_checked_at && (
                <p className="text-xs text-red-500 mt-2">
                  Occurred {formatRelativeTime(connection.last_checked_at)}
                </p>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
