'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';

interface Lead {
  id: string;
  content: string;
  platform: string;
  matchedKeywords: string[];
  status: string;
  createdAt: string;
  senderName?: string;
  sourceUrl?: string;
  channelName?: string;
}

// Transform API response to frontend format
function transformLead(apiLead: {
  id: string;
  matched_keywords: string[];
  status: string;
  created_at: string;
  first_viewed_at: string | null;
  post?: {
    content: string;
    platform: string;
    author_name?: string;
    sender_name?: string;
    source_url?: string;
    channel_name?: string;
  };
}): Lead {
  return {
    id: apiLead.id,
    content: apiLead.post?.content || '',
    platform: apiLead.post?.platform || '',
    matchedKeywords: apiLead.matched_keywords || [],
    status: apiLead.status,
    createdAt: apiLead.created_at,
    senderName: apiLead.post?.sender_name || apiLead.post?.author_name,
    sourceUrl: apiLead.post?.source_url,
    channelName: apiLead.post?.channel_name,
  };
}

// Platform icon component
function PlatformIcon({ platform }: { platform: string }) {
  const platformLower = platform.toLowerCase();

  if (platformLower === 'slack') {
    return (
      <svg className="w-5 h-5" viewBox="0 0 24 24" fill="currentColor">
        <path d="M5.042 15.165a2.528 2.528 0 0 1-2.52 2.523A2.528 2.528 0 0 1 0 15.165a2.527 2.527 0 0 1 2.522-2.52h2.52v2.52zm1.271 0a2.527 2.527 0 0 1 2.521-2.52 2.527 2.527 0 0 1 2.521 2.52v6.313A2.528 2.528 0 0 1 8.834 24a2.528 2.528 0 0 1-2.521-2.522v-6.313zM8.834 5.042a2.528 2.528 0 0 1-2.521-2.52A2.528 2.528 0 0 1 8.834 0a2.528 2.528 0 0 1 2.521 2.522v2.52H8.834zm0 1.271a2.528 2.528 0 0 1 2.521 2.521 2.528 2.528 0 0 1-2.521 2.521H2.522A2.528 2.528 0 0 1 0 8.834a2.528 2.528 0 0 1 2.522-2.521h6.312zm10.124 2.521a2.528 2.528 0 0 1 2.52-2.521A2.528 2.528 0 0 1 24 8.834a2.528 2.528 0 0 1-2.522 2.521h-2.52V8.834zm-1.271 0a2.528 2.528 0 0 1-2.521 2.521 2.528 2.528 0 0 1-2.521-2.521V2.522A2.528 2.528 0 0 1 15.166 0a2.528 2.528 0 0 1 2.521 2.522v6.312zm-2.521 10.124a2.528 2.528 0 0 1 2.521 2.52A2.528 2.528 0 0 1 15.166 24a2.528 2.528 0 0 1-2.521-2.522v-2.52h2.521zm0-1.271a2.528 2.528 0 0 1-2.521-2.521 2.528 2.528 0 0 1 2.521-2.521h6.312A2.528 2.528 0 0 1 24 15.166a2.528 2.528 0 0 1-2.522 2.521h-6.312z"/>
      </svg>
    );
  }

  if (platformLower === 'linkedin') {
    return (
      <svg className="w-5 h-5" viewBox="0 0 24 24" fill="currentColor">
        <path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433c-1.144 0-2.063-.926-2.063-2.065 0-1.138.92-2.063 2.063-2.063 1.14 0 2.064.925 2.064 2.063 0 1.139-.925 2.065-2.064 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z"/>
      </svg>
    );
  }

  // Default icon for unknown platforms
  return (
    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1" />
    </svg>
  );
}

// Format relative timestamp
function formatRelativeTime(dateString: string): string {
  const date = new Date(dateString);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffSeconds = Math.floor(diffMs / 1000);
  const diffMinutes = Math.floor(diffSeconds / 60);
  const diffHours = Math.floor(diffMinutes / 60);
  const diffDays = Math.floor(diffHours / 24);
  const diffWeeks = Math.floor(diffDays / 7);
  const diffMonths = Math.floor(diffDays / 30);

  if (diffSeconds < 60) {
    return 'Just now';
  } else if (diffMinutes < 60) {
    return `${diffMinutes} minute${diffMinutes === 1 ? '' : 's'} ago`;
  } else if (diffHours < 24) {
    return `${diffHours} hour${diffHours === 1 ? '' : 's'} ago`;
  } else if (diffDays < 7) {
    return `${diffDays} day${diffDays === 1 ? '' : 's'} ago`;
  } else if (diffWeeks < 4) {
    return `${diffWeeks} week${diffWeeks === 1 ? '' : 's'} ago`;
  } else if (diffMonths < 12) {
    return `${diffMonths} month${diffMonths === 1 ? '' : 's'} ago`;
  } else {
    return date.toLocaleDateString();
  }
}

// Get status display info
function getStatusInfo(status: string): { label: string; className: string } {
  switch (status) {
    case 'NEW':
      return { label: 'New', className: 'bg-blue-100 text-blue-700' };
    case 'INTERESTED':
      return { label: 'Interested', className: 'bg-green-100 text-green-700' };
    case 'NOT_INTERESTED':
      return { label: 'Not Interested', className: 'bg-red-100 text-red-700' };
    case 'MARKED_LATER':
      return { label: 'Marked for Later', className: 'bg-yellow-100 text-yellow-700' };
    case 'ARCHIVED':
      return { label: 'Archived', className: 'bg-gray-100 text-gray-700' };
    default:
      return { label: status, className: 'bg-gray-100 text-gray-700' };
  }
}

export default function LeadDetailPage() {
  const params = useParams();
  const router = useRouter();
  const leadId = params.id as string;

  const [lead, setLead] = useState<Lead | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [updatingStatus, setUpdatingStatus] = useState(false);

  // Fetch lead data
  useEffect(() => {
    async function fetchLead() {
      try {
        const response = await fetch(`/api/leads/${leadId}`);

        if (response.ok) {
          const data = await response.json();
          setLead(transformLead(data.lead));
        } else if (response.status === 404) {
          setError('Lead not found');
        } else {
          setError('Failed to load lead');
        }
      } catch (err) {
        console.error('Error fetching lead:', err);
        setError('Failed to load lead');
      } finally {
        setLoading(false);
      }
    }

    if (leadId) {
      fetchLead();
    }
  }, [leadId]);

  // Update lead status
  const updateLeadStatus = async (newStatus: string) => {
    if (!lead) return;

    setUpdatingStatus(true);
    try {
      const response = await fetch(`/api/leads/${leadId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ status: newStatus }),
      });

      if (response.ok) {
        setLead({ ...lead, status: newStatus });
      } else {
        console.error('Failed to update lead status');
      }
    } catch (err) {
      console.error('Error updating lead:', err);
    } finally {
      setUpdatingStatus(false);
    }
  };

  // Delete lead
  const deleteLead = async () => {
    if (!lead) return;

    if (!confirm('Are you sure you want to delete this lead?')) return;

    try {
      const response = await fetch(`/api/leads/${leadId}`, {
        method: 'DELETE',
      });

      if (response.ok) {
        router.push('/leads');
      } else {
        console.error('Failed to delete lead');
      }
    } catch (err) {
      console.error('Error deleting lead:', err);
    }
  };

  if (loading) {
    return (
      <div className="max-w-4xl">
        {/* Breadcrumb skeleton */}
        <div className="h-6 w-48 bg-gray-200 rounded animate-pulse mb-8" />

        <div className="card p-8">
          <div className="animate-pulse space-y-4">
            <div className="h-6 w-3/4 bg-gray-200 rounded" />
            <div className="h-4 w-1/2 bg-gray-200 rounded" />
            <div className="h-32 bg-gray-200 rounded" />
          </div>
        </div>
      </div>
    );
  }

  if (error || !lead) {
    return (
      <div className="max-w-4xl">
        {/* Breadcrumbs */}
        <nav aria-label="Breadcrumb" className="mb-8">
          <ol className="flex items-center gap-2 text-sm">
            <li>
              <Link href="/dashboard" className="text-gray-500 hover:text-gray-700 transition-colors">
                Dashboard
              </Link>
            </li>
            <li className="text-gray-400">&gt;</li>
            <li>
              <Link href="/leads" className="text-gray-500 hover:text-gray-700 transition-colors">
                Leads
              </Link>
            </li>
            <li className="text-gray-400">&gt;</li>
            <li className="text-gray-900 font-medium">Lead</li>
          </ol>
        </nav>

        <div className="card text-center py-16">
          <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <svg className="w-8 h-8 text-red-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
            </svg>
          </div>
          <h2 className="text-xl font-semibold text-gray-900 mb-2">{error || 'Lead not found'}</h2>
          <p className="text-gray-600 mb-6">
            This lead may have been deleted or you don&apos;t have permission to view it.
          </p>
          <Link href="/leads" className="btn-primary">
            Back to Leads
          </Link>
        </div>
      </div>
    );
  }

  const statusInfo = getStatusInfo(lead.status);

  return (
    <div className="max-w-4xl">
      {/* Breadcrumbs */}
      <nav aria-label="Breadcrumb" className="mb-8">
        <ol className="flex items-center gap-2 text-sm">
          <li>
            <Link href="/dashboard" className="text-gray-500 hover:text-gray-700 transition-colors">
              Dashboard
            </Link>
          </li>
          <li className="text-gray-400">&gt;</li>
          <li>
            <Link href="/leads" className="text-gray-500 hover:text-gray-700 transition-colors">
              Leads
            </Link>
          </li>
          <li className="text-gray-400">&gt;</li>
          <li className="text-gray-900 font-medium">Lead</li>
        </ol>
      </nav>

      {/* Lead Detail Card */}
      <div className="card p-8">
        {/* Header */}
        <div className="flex items-start justify-between mb-6">
          <div>
            <div className="flex items-center gap-3 mb-2">
              <span className={`px-3 py-1 rounded-full text-sm font-medium ${statusInfo.className}`}>
                {statusInfo.label}
              </span>
              {lead.matchedKeywords.length >= 3 && (
                <span className="inline-flex items-center gap-1 px-2 py-0.5 text-xs font-medium bg-orange-100 text-orange-700 rounded">
                  <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M12.395 2.553a1 1 0 00-1.45-.385c-.345.23-.614.558-.822.88-.214.33-.403.713-.57 1.116-.334.804-.614 1.768-.84 2.734a31.365 31.365 0 00-.613 3.58 2.64 2.64 0 01-.945-1.067c-.328-.68-.398-1.534-.398-2.654A1 1 0 005.05 6.05 6.981 6.981 0 003 11a7 7 0 1011.95-4.95c-.592-.591-.98-.985-1.348-1.467-.363-.476-.724-1.063-1.207-2.03zM12.12 15.12A3 3 0 017 13s.879.5 2.5.5c0-1 .5-4 1.25-4.5.5 1 .786 1.293 1.371 1.879A2.99 2.99 0 0113 13a2.99 2.99 0 01-.879 2.121z" clipRule="evenodd" />
                  </svg>
                  Hot Lead
                </span>
              )}
            </div>
            {lead.senderName && (
              <h1 className="text-2xl font-bold text-gray-900">
                Lead from {lead.senderName}
              </h1>
            )}
          </div>
          <button
            onClick={deleteLead}
            className="px-3 py-1.5 text-sm bg-red-50 text-red-600 rounded-md hover:bg-red-100 transition-colors"
          >
            Delete
          </button>
        </div>

        {/* Meta info */}
        <div className="flex items-center gap-4 text-sm text-gray-500 mb-6 pb-6 border-b border-gray-200">
          <span className="flex items-center gap-2">
            <PlatformIcon platform={lead.platform} />
            <span className="capitalize">{lead.platform}</span>
          </span>
          {lead.channelName && (
            <>
              <span>•</span>
              <span>#{lead.channelName}</span>
            </>
          )}
          <span>•</span>
          <span title={new Date(lead.createdAt).toLocaleString()}>
            {formatRelativeTime(lead.createdAt)}
          </span>
        </div>

        {/* Content */}
        <div className="mb-6">
          <h2 className="text-sm font-medium text-gray-700 mb-2">Message Content</h2>
          <p className="text-gray-900 whitespace-pre-wrap leading-relaxed">
            {lead.content}
          </p>
        </div>

        {/* Keywords */}
        {lead.matchedKeywords.length > 0 && (
          <div className="mb-6">
            <h2 className="text-sm font-medium text-gray-700 mb-2">Matched Keywords</h2>
            <div className="flex flex-wrap gap-2">
              {lead.matchedKeywords.map((keyword) => (
                <span
                  key={keyword}
                  className="px-3 py-1.5 bg-blue-50 text-blue-700 text-sm rounded-full"
                >
                  {keyword}
                </span>
              ))}
            </div>
          </div>
        )}

        {/* Source URL */}
        {lead.sourceUrl && (
          <div className="mb-6">
            <h2 className="text-sm font-medium text-gray-700 mb-2">Source</h2>
            <a
              href={lead.sourceUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 text-primary hover:text-primary-dark transition-colors"
            >
              View Original Post
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
              </svg>
            </a>
          </div>
        )}

        {/* Action Buttons */}
        <div className="pt-6 border-t border-gray-200">
          <h2 className="text-sm font-medium text-gray-700 mb-3">Actions</h2>
          <div className="flex flex-wrap items-center gap-3">
            {lead.status !== 'INTERESTED' && (
              <button
                onClick={() => updateLeadStatus('INTERESTED')}
                disabled={updatingStatus}
                className="px-4 py-2 text-sm bg-green-50 text-green-700 rounded-md hover:bg-green-100 transition-colors disabled:opacity-50"
              >
                {updatingStatus ? 'Updating...' : 'Mark as Interested'}
              </button>
            )}
            {lead.status !== 'NOT_INTERESTED' && (
              <button
                onClick={() => updateLeadStatus('NOT_INTERESTED')}
                disabled={updatingStatus}
                className="px-4 py-2 text-sm bg-red-50 text-red-700 rounded-md hover:bg-red-100 transition-colors disabled:opacity-50"
              >
                {updatingStatus ? 'Updating...' : 'Mark as Not Interested'}
              </button>
            )}
            {lead.status !== 'MARKED_LATER' && (
              <button
                onClick={() => updateLeadStatus('MARKED_LATER')}
                disabled={updatingStatus}
                className="px-4 py-2 text-sm bg-yellow-50 text-yellow-700 rounded-md hover:bg-yellow-100 transition-colors disabled:opacity-50"
              >
                {updatingStatus ? 'Updating...' : 'Mark for Later'}
              </button>
            )}
            {lead.status !== 'ARCHIVED' && (
              <button
                onClick={() => updateLeadStatus('ARCHIVED')}
                disabled={updatingStatus}
                className="px-4 py-2 text-sm bg-gray-100 text-gray-600 rounded-md hover:bg-gray-200 transition-colors disabled:opacity-50"
              >
                {updatingStatus ? 'Updating...' : 'Archive'}
              </button>
            )}
            {lead.status === 'ARCHIVED' && (
              <button
                onClick={() => updateLeadStatus('NEW')}
                disabled={updatingStatus}
                className="px-4 py-2 text-sm bg-blue-50 text-blue-700 rounded-md hover:bg-blue-100 transition-colors disabled:opacity-50"
              >
                {updatingStatus ? 'Updating...' : 'Restore'}
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Back link */}
      <div className="mt-6">
        <Link
          href="/leads"
          className="inline-flex items-center gap-2 text-gray-600 hover:text-gray-900 transition-colors"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
          </svg>
          Back to Leads
        </Link>
      </div>
    </div>
  );
}
