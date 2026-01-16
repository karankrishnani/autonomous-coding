'use client';

import { useState } from 'react';
import Link from 'next/link';
import { PlatformConnection, PlatformConnectionStatus } from '@/lib/platforms';

interface PlatformCardProps {
  platformId: 'SLACK' | 'LINKEDIN';
  platformName: string;
  status: PlatformConnectionStatus | null;
  statusColor: string;
  statusLabel: string;
  icon: React.ReactNode;
  iconBg: string;
  iconColor: string;
  available: boolean;
  showLastSync: boolean;
  lastSyncTime: string | null;
  showTroubleshooting: boolean;
  connectionId?: string;
  onDisconnect?: () => void;
}

// Format relative time for last sync
function formatLastSync(dateString: string | null): string {
  if (!dateString) return 'Never';

  const date = new Date(dateString);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMins = Math.floor(diffMs / (1000 * 60));
  const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

  if (diffMins < 1) return 'Just now';
  if (diffMins < 60) return `${diffMins} minute${diffMins === 1 ? '' : 's'} ago`;
  if (diffHours < 24) return `${diffHours} hour${diffHours === 1 ? '' : 's'} ago`;
  if (diffDays < 7) return `${diffDays} day${diffDays === 1 ? '' : 's'} ago`;

  return date.toLocaleDateString();
}

export function PlatformCard({
  platformId,
  platformName,
  status,
  statusColor,
  statusLabel,
  icon,
  iconBg,
  iconColor,
  available,
  showLastSync,
  lastSyncTime,
  showTroubleshooting,
  connectionId,
  onDisconnect,
}: PlatformCardProps) {
  const [showDisconnectConfirm, setShowDisconnectConfirm] = useState(false);
  const [isDisconnecting, setIsDisconnecting] = useState(false);

  const isConnected = status === 'CONNECTED';
  const isDisconnected = status === 'DISCONNECTED';
  const isDegraded = status === 'DEGRADED';

  const handleDisconnect = async () => {
    if (!connectionId) return;

    setIsDisconnecting(true);
    try {
      const res = await fetch('/api/platforms/connections', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ connectionId }),
      });

      if (res.ok) {
        setShowDisconnectConfirm(false);
        onDisconnect?.();
        // Reload page to reflect changes
        window.location.reload();
      } else {
        const data = await res.json();
        alert(data.error || 'Failed to disconnect platform');
      }
    } catch (error) {
      alert('Failed to disconnect platform');
    } finally {
      setIsDisconnecting(false);
    }
  };

  return (
    <>
      <div className="card">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div className={`w-12 h-12 ${iconBg} rounded-lg flex items-center justify-center ${iconColor}`}>
              {icon}
            </div>
            <div>
              <h3 className="font-semibold text-gray-900">{platformName}</h3>
              <p className="text-sm text-gray-500 flex items-center gap-1.5">
                <span
                  className={`w-2 h-2 rounded-full ${statusColor}`}
                  aria-hidden="true"
                  data-status={status || 'unavailable'}
                ></span>
                {statusLabel}
              </p>
              {showLastSync && (
                <p className="text-xs text-gray-400 mt-0.5">
                  Last scraped: {formatLastSync(lastSyncTime)}
                </p>
              )}
            </div>
          </div>
          {available ? (
            isConnected ? (
              <div className="flex items-center gap-2">
                {connectionId && (
                  <Link
                    href={`/platforms/${connectionId}`}
                    className="px-3 py-2 text-sm text-gray-600 hover:text-gray-800 hover:bg-gray-100 rounded-lg transition-colors"
                  >
                    View Details
                  </Link>
                )}
                <button className="btn-secondary">
                  Reconnect
                </button>
                <button
                  onClick={() => setShowDisconnectConfirm(true)}
                  className="px-3 py-2 text-sm text-red-600 hover:text-red-700 hover:bg-red-50 rounded-lg transition-colors"
                >
                  Disconnect
                </button>
              </div>
            ) : isDegraded ? (
              <div className="flex items-center gap-2">
                {connectionId && (
                  <Link
                    href={`/platforms/${connectionId}`}
                    className="px-3 py-2 text-sm text-gray-600 hover:text-gray-800 hover:bg-gray-100 rounded-lg transition-colors"
                  >
                    View Details
                  </Link>
                )}
                <button className="btn-primary">
                  Reconnect
                </button>
              </div>
            ) : isDisconnected ? (
              <button className="btn-primary">
                Reconnect
              </button>
            ) : (
              <button className="btn-primary">
                Connect
              </button>
            )
          ) : (
            <button className="btn-secondary" disabled>
              Coming Soon
            </button>
          )}
        </div>
        {/* Troubleshooting Tips */}
        {available && showTroubleshooting && (
          <div className="mt-4 pt-4 border-t border-gray-100">
            <div className="flex items-start gap-2 text-sm">
              <svg className="w-4 h-4 text-amber-500 flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <div className="text-gray-600">
                <p className="font-medium text-gray-700 mb-1">Troubleshooting Tips:</p>
                <ul className="list-disc list-inside space-y-0.5 text-gray-500">
                  <li>Make sure the desktop app is running</li>
                  <li>Try logging out and back into {platformName}</li>
                  <li>Check your internet connection</li>
                  <li>Restart the desktop app if issues persist</li>
                </ul>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Disconnect Confirmation Modal */}
      {showDisconnectConfirm && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg shadow-xl max-w-md w-full mx-4 p-6">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 bg-red-100 rounded-full flex items-center justify-center">
                <svg className="w-5 h-5 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                </svg>
              </div>
              <h3 className="text-lg font-semibold text-gray-900">Disconnect {platformName}?</h3>
            </div>
            <p className="text-gray-600 mb-6">
              Are you sure you want to disconnect {platformName}? You will need to reconnect through the desktop app to resume lead scanning.
            </p>
            <div className="flex justify-end gap-3">
              <button
                onClick={() => setShowDisconnectConfirm(false)}
                className="btn-tertiary"
                disabled={isDisconnecting}
              >
                Cancel
              </button>
              <button
                onClick={handleDisconnect}
                disabled={isDisconnecting}
                className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors disabled:opacity-50"
              >
                {isDisconnecting ? 'Disconnecting...' : 'Yes, Disconnect'}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
