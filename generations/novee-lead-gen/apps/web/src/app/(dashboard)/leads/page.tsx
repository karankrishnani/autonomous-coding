'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { useSearchParams, useRouter, usePathname } from 'next/navigation';
import Link from 'next/link';

// Polling interval for real-time updates (5 seconds)
const POLLING_INTERVAL = 5000;

type TabType = 'newest' | 'interested' | 'notInterested' | 'markedLater' | 'archived';

const ITEMS_PER_PAGE = 20;

interface Lead {
  id: string;
  content: string;
  platform: string;
  matchedKeywords: string[];
  status: string;
  createdAt: string;
  isDemo?: boolean;
  senderName?: string;
  sourceUrl?: string;
}

// Transform API response to frontend format
function transformLead(apiLead: {
  id: string;
  matched_keywords: string[];
  status: string;
  created_at: string;
  isDemo?: boolean;
  sender_name?: string;
  post?: {
    content: string;
    platform: string;
    author_name?: string;
    sender_name?: string;
    source_url?: string;
  };
}): Lead {
  return {
    id: apiLead.id,
    content: apiLead.post?.content || '',
    platform: apiLead.post?.platform || '',
    matchedKeywords: apiLead.matched_keywords || [],
    status: apiLead.status,
    createdAt: apiLead.created_at,
    isDemo: apiLead.isDemo || false,
    senderName: apiLead.sender_name || apiLead.post?.sender_name || apiLead.post?.author_name,
    sourceUrl: apiLead.post?.source_url,
  };
}

// Platform icon component
function PlatformIcon({ platform }: { platform: string }) {
  const platformLower = platform.toLowerCase();

  if (platformLower === 'slack') {
    return (
      <svg className="w-4 h-4" viewBox="0 0 24 24" fill="currentColor">
        <path d="M5.042 15.165a2.528 2.528 0 0 1-2.52 2.523A2.528 2.528 0 0 1 0 15.165a2.527 2.527 0 0 1 2.522-2.52h2.52v2.52zm1.271 0a2.527 2.527 0 0 1 2.521-2.52 2.527 2.527 0 0 1 2.521 2.52v6.313A2.528 2.528 0 0 1 8.834 24a2.528 2.528 0 0 1-2.521-2.522v-6.313zM8.834 5.042a2.528 2.528 0 0 1-2.521-2.52A2.528 2.528 0 0 1 8.834 0a2.528 2.528 0 0 1 2.521 2.522v2.52H8.834zm0 1.271a2.528 2.528 0 0 1 2.521 2.521 2.528 2.528 0 0 1-2.521 2.521H2.522A2.528 2.528 0 0 1 0 8.834a2.528 2.528 0 0 1 2.522-2.521h6.312zm10.124 2.521a2.528 2.528 0 0 1 2.52-2.521A2.528 2.528 0 0 1 24 8.834a2.528 2.528 0 0 1-2.522 2.521h-2.52V8.834zm-1.271 0a2.528 2.528 0 0 1-2.521 2.521 2.528 2.528 0 0 1-2.521-2.521V2.522A2.528 2.528 0 0 1 15.166 0a2.528 2.528 0 0 1 2.521 2.522v6.312zm-2.521 10.124a2.528 2.528 0 0 1 2.521 2.52A2.528 2.528 0 0 1 15.166 24a2.528 2.528 0 0 1-2.521-2.522v-2.52h2.521zm0-1.271a2.528 2.528 0 0 1-2.521-2.521 2.528 2.528 0 0 1 2.521-2.521h6.312A2.528 2.528 0 0 1 24 15.166a2.528 2.528 0 0 1-2.522 2.521h-6.312z"/>
      </svg>
    );
  }

  if (platformLower === 'linkedin') {
    return (
      <svg className="w-4 h-4" viewBox="0 0 24 24" fill="currentColor">
        <path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433c-1.144 0-2.063-.926-2.063-2.065 0-1.138.92-2.063 2.063-2.063 1.14 0 2.064.925 2.064 2.063 0 1.139-.925 2.065-2.064 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z"/>
      </svg>
    );
  }

  // Default icon for unknown platforms
  return (
    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1" />
    </svg>
  );
}

// Check if a date is within a date range
function isWithinDateRange(dateString: string, range: string): boolean {
  if (!range) return true;

  const date = new Date(dateString);
  const now = new Date();

  // Get start of today
  const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate());

  // Get start of this week (Sunday)
  const startOfWeek = new Date(startOfToday);
  startOfWeek.setDate(startOfWeek.getDate() - startOfWeek.getDay());

  // Get start of this month
  const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);

  switch (range) {
    case 'today':
      return date >= startOfToday;
    case 'week':
      return date >= startOfWeek;
    case 'month':
      return date >= startOfMonth;
    default:
      return true;
  }
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

export default function LeadsPage() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const pathname = usePathname();
  const [activeTab, setActiveTab] = useState<TabType>('newest');

  const [leads, setLeads] = useState<Lead[]>([]);
  const [loading, setLoading] = useState(true);
  const [userName, setUserName] = useState<string>('');
  const [platformFilter, setPlatformFilter] = useState<string>('');
  const [skillFilter, setSkillFilter] = useState<string>('');
  const [userKeywords, setUserKeywords] = useState<string[]>([]);
  const [sortOrder, setSortOrder] = useState<'newest' | 'oldest' | 'most_keywords'>('newest');
  const [dateRange, setDateRange] = useState<string>('');
  const [updatingLeadId, setUpdatingLeadId] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [showingDemoLeads, setShowingDemoLeads] = useState(false);
  const [expandedLeads, setExpandedLeads] = useState<Set<string>>(new Set());

  // Pagination state
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalItems, setTotalItems] = useState(0);
  const [hasMore, setHasMore] = useState(false);

  // Real-time update state
  const [newLeadsCount, setNewLeadsCount] = useState(0);
  const lastLeadCountRef = useRef<number>(0);
  const isPollingRef = useRef<boolean>(true);

  // Update URL with current filters and pagination
  const updateURL = useCallback((params: Record<string, string | number | undefined>) => {
    const newParams = new URLSearchParams(searchParams.toString());

    Object.entries(params).forEach(([key, value]) => {
      if (value !== undefined && value !== '' && value !== 1) {
        newParams.set(key, String(value));
      } else {
        newParams.delete(key);
      }
    });

    const queryString = newParams.toString();
    router.push(queryString ? `${pathname}?${queryString}` : pathname, { scroll: false });
  }, [searchParams, router, pathname]);

  // Sync filters with URL params on mount and when searchParams change
  useEffect(() => {
    const status = searchParams.get('status');
    if (status === 'interested') setActiveTab('interested');
    else if (status === 'not_interested' || status === 'notInterested') setActiveTab('notInterested');
    else if (status === 'marked_later' || status === 'markedLater') setActiveTab('markedLater');
    else if (status === 'archived') setActiveTab('archived');
    else if (status === 'new' || status === 'newest') setActiveTab('newest');

    // Sync platform filter from URL (or reset to empty if not present)
    const platform = searchParams.get('platform');
    setPlatformFilter(platform ? platform.toLowerCase() : '');

    // Sync keyword/skill filter from URL (or reset to empty if not present)
    const keyword = searchParams.get('keyword') || searchParams.get('skill');
    setSkillFilter(keyword || '');

    // Sync date range from URL (or reset to empty if not present)
    const date = searchParams.get('date');
    setDateRange(date || '');

    // Sync sort order from URL (or reset to default if not present)
    const sort = searchParams.get('sort');
    if (sort === 'oldest' || sort === 'most_keywords') {
      setSortOrder(sort);
    } else {
      setSortOrder('newest');
    }

    // Sync page from URL
    const pageParam = searchParams.get('page');
    if (pageParam) {
      const page = parseInt(pageParam, 10);
      if (!isNaN(page) && page > 0) {
        setCurrentPage(page);
      }
    } else {
      setCurrentPage(1);
    }
  }, [searchParams]);

  // Test mode: inject a fake lead with a non-existent ID for testing graceful error handling
  const testMode = searchParams.get('test') === 'deleted-lead';

  // Auto-dismiss error after 5 seconds
  useEffect(() => {
    if (errorMessage) {
      const timer = setTimeout(() => setErrorMessage(null), 5000);
      return () => clearTimeout(timer);
    }
  }, [errorMessage]);

  // Function to update lead status
  const updateLeadStatus = async (leadId: string, newStatus: string) => {
    setUpdatingLeadId(leadId);
    setErrorMessage(null);
    try {
      const response = await fetch(`/api/leads/${leadId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ status: newStatus }),
      });

      if (response.ok) {
        // Update local state
        setLeads((prevLeads) =>
          prevLeads.map((lead) =>
            lead.id === leadId ? { ...lead, status: newStatus } : lead
          )
        );
      } else if (response.status === 404) {
        // Lead was deleted while viewing - handle gracefully
        setErrorMessage('This lead has been deleted or is no longer available.');
        // Remove from local state
        setLeads((prevLeads) => prevLeads.filter((lead) => lead.id !== leadId));
      } else {
        setErrorMessage('Failed to update lead. Please try again.');
      }
    } catch (error) {
      console.error('Error updating lead status:', error);
      setErrorMessage('Unable to connect to the server. Please check your connection.');
    } finally {
      setUpdatingLeadId(null);
    }
  };

  // Function to delete a lead
  const deleteLead = async (leadId: string) => {
    setUpdatingLeadId(leadId);
    setErrorMessage(null);
    try {
      const response = await fetch(`/api/leads/${leadId}`, {
        method: 'DELETE',
      });

      if (response.ok) {
        // Remove from local state
        setLeads((prevLeads) => prevLeads.filter((lead) => lead.id !== leadId));
      } else if (response.status === 404) {
        // Lead was already deleted
        setErrorMessage('This lead has already been deleted.');
        setLeads((prevLeads) => prevLeads.filter((lead) => lead.id !== leadId));
      } else {
        setErrorMessage('Failed to delete lead. Please try again.');
      }
    } catch (error) {
      console.error('Error deleting lead:', error);
      setErrorMessage('Unable to connect to the server. Please check your connection.');
    } finally {
      setUpdatingLeadId(null);
    }
  };

  // Fetch data function - used for initial load and polling
  const fetchLeads = useCallback(async (isPolling = false) => {
    if (!isPolling) {
      setLoading(true);
    }
    try {
      // Build query string for API request
      const queryParams = new URLSearchParams();
      queryParams.set('page', String(currentPage));
      queryParams.set('limit', String(ITEMS_PER_PAGE));

      // Fetch leads and keywords in parallel
      const [leadsResponse, keywordsResponse] = await Promise.all([
        fetch(`/api/leads?${queryParams.toString()}`),
        fetch('/api/keywords'),
      ]);

      if (leadsResponse.ok) {
        const data = await leadsResponse.json();
        let transformedLeads = (data.leads || []).map(transformLead);

        // Test mode: inject a fake lead with a non-existent ID
        if (testMode) {
          const testLead: Lead = {
            id: '00000000-0000-0000-0000-000000000000', // This ID doesn't exist in the backend
            content: 'TEST_DELETED_LEAD - This lead has been deleted on the server but is still displayed in the UI. Try clicking any action button to see the graceful error handling.',
            platform: 'SLACK',
            matchedKeywords: ['Test', 'Deleted'],
            status: 'NEW',
            createdAt: new Date().toISOString(),
          };
          transformedLeads = [testLead, ...transformedLeads];
        }

        // Check for new leads during polling
        if (isPolling && lastLeadCountRef.current > 0) {
          const currentTotal = data.total || 0;
          const newCount = currentTotal - lastLeadCountRef.current;
          if (newCount > 0) {
            setNewLeadsCount((prev) => prev + newCount);
          }
        }

        // Update the ref with current total
        lastLeadCountRef.current = data.total || 0;

        setLeads(transformedLeads);
        setUserName(data.userName || '');
        setShowingDemoLeads(data.showingDemoLeads || false);

        // Update pagination state from API response
        setTotalPages(data.totalPages || 1);
        setTotalItems(data.total || 0);
        setHasMore(data.hasMore || false);
      }

      if (keywordsResponse.ok) {
        const keywordsData = await keywordsResponse.json();
        setUserKeywords(keywordsData.all_keywords || []);
      }
    } catch (error) {
      console.error('Error fetching data:', error);
    } finally {
      if (!isPolling) {
        setLoading(false);
      }
    }
  }, [testMode, currentPage]);

  // Initial data fetch
  useEffect(() => {
    fetchLeads(false);
  }, [fetchLeads]);

  // Polling for real-time updates
  useEffect(() => {
    // Start polling after initial load
    const pollInterval = setInterval(() => {
      if (isPollingRef.current && !loading) {
        fetchLeads(true);
      }
    }, POLLING_INTERVAL);

    // Cleanup on unmount
    return () => {
      clearInterval(pollInterval);
    };
  }, [fetchLeads, loading]);

  // Reset new leads count when user actively views leads
  const handleNewLeadsClick = useCallback(() => {
    setNewLeadsCount(0);
    fetchLeads(false);
  }, [fetchLeads]);

  // Filter leads based on active tab and filters
  const filteredLeads = leads.filter((lead) => {
    // Filter by tab (status)
    let matchesTab = true;
    switch (activeTab) {
      case 'newest':
        matchesTab = lead.status === 'NEW';
        break;
      case 'interested':
        matchesTab = lead.status === 'INTERESTED';
        break;
      case 'notInterested':
        matchesTab = lead.status === 'NOT_INTERESTED';
        break;
      case 'markedLater':
        matchesTab = lead.status === 'MARKED_LATER';
        break;
      case 'archived':
        matchesTab = lead.status === 'ARCHIVED';
        break;
    }

    // Filter by platform
    const matchesPlatform = !platformFilter || lead.platform.toLowerCase() === platformFilter.toLowerCase();

    // Filter by skill/keyword
    const matchesSkill = !skillFilter || lead.matchedKeywords.some(
      (keyword) => keyword.toLowerCase().includes(skillFilter.toLowerCase())
    );

    // Filter by date range
    const matchesDateRange = isWithinDateRange(lead.createdAt, dateRange);

    return matchesTab && matchesPlatform && matchesSkill && matchesDateRange;
  });

  // Sort filtered leads
  const sortedLeads = [...filteredLeads].sort((a, b) => {
    if (sortOrder === 'most_keywords') {
      // Sort by number of matched keywords (descending)
      const keywordsA = a.matchedKeywords?.length || 0;
      const keywordsB = b.matchedKeywords?.length || 0;
      if (keywordsB !== keywordsA) {
        return keywordsB - keywordsA;
      }
      // If same number of keywords, sort by newest first
      return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
    }
    const dateA = new Date(a.createdAt).getTime();
    const dateB = new Date(b.createdAt).getTime();
    return sortOrder === 'newest' ? dateB - dateA : dateA - dateB;
  });

  // Check if filters are active (for showing different empty state)
  const hasActiveFilters = platformFilter !== '' || skillFilter !== '' || sortOrder !== 'newest' || dateRange !== '';

  const newestCount = leads.filter((l) => l.status === 'NEW').length;
  const interestedCount = leads.filter((l) => l.status === 'INTERESTED').length;
  const notInterestedCount = leads.filter((l) => l.status === 'NOT_INTERESTED').length;
  const markedLaterCount = leads.filter((l) => l.status === 'MARKED_LATER').length;
  const archivedCount = leads.filter((l) => l.status === 'ARCHIVED').length;

  const tabs = [
    { id: 'newest' as TabType, label: 'New', count: newestCount, showCount: true },
    { id: 'interested' as TabType, label: 'Interested', count: interestedCount, showCount: true },
    { id: 'notInterested' as TabType, label: 'Not Interested', count: notInterestedCount, showCount: true },
    { id: 'markedLater' as TabType, label: 'Marked for Later', count: markedLaterCount, showCount: true },
    { id: 'archived' as TabType, label: 'Archived', count: archivedCount, showCount: true },
  ];

  if (loading) {
    return (
      <div className="max-w-4xl">
        <div className="mb-8">
          <div className="h-8 w-24 bg-gray-200 rounded animate-pulse" />
        </div>
        <div className="card text-center py-16">
          {/* Loading Spinner */}
          <div className="w-16 h-16 mx-auto mb-4 flex items-center justify-center">
            <svg
              className="animate-spin h-10 w-10 text-primary"
              xmlns="http://www.w3.org/2000/svg"
              fill="none"
              viewBox="0 0 24 24"
            >
              <circle
                className="opacity-25"
                cx="12"
                cy="12"
                r="10"
                stroke="currentColor"
                strokeWidth="4"
              />
              <path
                className="opacity-75"
                fill="currentColor"
                d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
              />
            </svg>
          </div>
          <div className="h-6 w-48 bg-gray-200 rounded mx-auto mb-2 animate-pulse" />
          <div className="h-4 w-64 bg-gray-200 rounded mx-auto animate-pulse" />
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-4xl">
      {/* Error Message */}
      {errorMessage && (
        <div className="mb-4 p-4 bg-red-50 border border-red-200 rounded-lg flex items-center gap-3">
          <svg className="w-5 h-5 text-red-500 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          <p className="text-red-700 flex-1">{errorMessage}</p>
          <button
            onClick={() => setErrorMessage(null)}
            className="text-red-400 hover:text-red-600 transition-colors"
            aria-label="Dismiss error"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
      )}

      {/* New Leads Notification Banner */}
      {newLeadsCount > 0 && (
        <div className="mb-4 p-3 bg-green-50 border border-green-200 rounded-lg flex items-center justify-between">
          <div className="flex items-center gap-2">
            <svg className="w-5 h-5 text-green-600 animate-pulse" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
            </svg>
            <span className="text-green-800 font-medium">
              {newLeadsCount} new lead{newLeadsCount > 1 ? 's' : ''} available!
            </span>
          </div>
          <button
            onClick={handleNewLeadsClick}
            className="px-3 py-1.5 text-sm bg-green-600 text-white rounded-md hover:bg-green-700 transition-colors"
          >
            View New Leads
          </button>
        </div>
      )}

      {/* Page Header */}
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-gray-900">Leads</h1>
      </div>

      {/* Tab Navigation */}
      <div className="flex items-center gap-6 border-b border-gray-200 mb-6">
        {tabs.map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`pb-4 border-b-2 transition-colors ${
              activeTab === tab.id
                ? 'border-primary text-primary font-medium'
                : 'border-transparent text-gray-500 hover:text-gray-700'
            }`}
          >
            {tab.label}{' '}
            {tab.showCount && (
              <span
                className={`ml-1 px-2 py-0.5 rounded-full text-xs ${
                  activeTab === tab.id
                    ? 'bg-blue-100 text-blue-700'
                    : 'bg-gray-100 text-gray-600'
                }`}
              >
                {tab.count}
              </span>
            )}
          </button>
        ))}
      </div>

      {/* Filters */}
      <div className="flex items-center gap-4 mb-6">
        <select
          className="input-field max-w-xs"
          value={skillFilter}
          onChange={(e) => {
            const newValue = e.target.value;
            setSkillFilter(newValue);
            // Reset pagination and persist filter to URL
            setCurrentPage(1);
            updateURL({ page: 1, skill: newValue || undefined });
          }}
        >
          <option value="">{userKeywords.length > 0 ? 'All Skills' : 'Select your skills'}</option>
          {userKeywords.map((keyword) => (
            <option key={keyword} value={keyword}>
              {keyword}
            </option>
          ))}
        </select>
        <select
          className="input-field max-w-xs"
          value={platformFilter}
          onChange={(e) => {
            const newValue = e.target.value;
            setPlatformFilter(newValue);
            // Reset pagination and persist filter to URL
            setCurrentPage(1);
            updateURL({ page: 1, platform: newValue || undefined });
          }}
        >
          <option value="">All Platforms</option>
          <option value="slack">Slack</option>
          <option value="linkedin">LinkedIn</option>
        </select>
        <select
          className="input-field max-w-xs"
          value={dateRange}
          onChange={(e) => {
            const newValue = e.target.value;
            setDateRange(newValue);
            // Reset pagination and persist filter to URL
            setCurrentPage(1);
            updateURL({ page: 1, date: newValue || undefined });
          }}
          aria-label="Filter by date range"
        >
          <option value="">All Time</option>
          <option value="today">Today</option>
          <option value="week">This Week</option>
          <option value="month">This Month</option>
        </select>
        <select
          className="input-field max-w-xs"
          value={sortOrder}
          onChange={(e) => {
            const newValue = e.target.value as 'newest' | 'oldest' | 'most_keywords';
            setSortOrder(newValue);
            // Reset pagination and persist sort to URL
            setCurrentPage(1);
            updateURL({ page: 1, sort: newValue === 'newest' ? undefined : newValue });
          }}
          aria-label="Sort leads"
        >
          <option value="newest">Newest First</option>
          <option value="oldest">Oldest First</option>
          <option value="most_keywords">Most Keywords Matched</option>
        </select>
        {hasActiveFilters && (
          <button
            onClick={() => {
              setSkillFilter('');
              setPlatformFilter('');
              setDateRange('');
              setSortOrder('newest');
              // Reset pagination and clear all filters from URL
              setCurrentPage(1);
              updateURL({ page: 1, skill: undefined, platform: undefined, date: undefined, sort: undefined });
            }}
            className="text-sm text-gray-500 hover:text-gray-700"
          >
            Clear filters
          </button>
        )}
      </div>

      {/* Demo Leads Banner */}
      {showingDemoLeads && sortedLeads.length > 0 && (
        <div className="mb-6 p-4 bg-blue-50 border border-blue-200 rounded-lg">
          <div className="flex items-start gap-3">
            <div className="flex-shrink-0 w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center">
              <svg className="w-4 h-4 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
            <div className="flex-1">
              <h3 className="font-medium text-blue-900">These are example leads</h3>
              <p className="text-sm text-blue-700 mt-1">
                Connect your platforms and set up keywords to start finding real leads tailored to your skills.
                These examples show what your lead feed will look like once configured.
              </p>
              <p className="text-sm text-blue-600 mt-2 flex items-center gap-1">
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                Next scan scheduled after platform connection
              </p>
              <div className="mt-3 flex gap-3">
                <Link href="/platforms" className="text-sm font-medium text-blue-600 hover:text-blue-800">
                  Connect Platforms →
                </Link>
                <Link href="/keywords" className="text-sm font-medium text-blue-600 hover:text-blue-800">
                  Set Up Keywords →
                </Link>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Leads List or Empty State */}
      {sortedLeads.length > 0 ? (
        <div className="space-y-4">
          {sortedLeads.map((lead) => (
            <div key={lead.id} className={`card p-6 ${lead.isDemo ? 'border-dashed border-blue-200 bg-blue-50/30' : ''}`}>
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  {/* Demo badge */}
                  {lead.isDemo && (
                    <span className="inline-block px-2 py-0.5 text-xs font-medium bg-blue-100 text-blue-700 rounded mb-2">
                      Example Lead
                    </span>
                  )}
                  {/* Hot lead indicator for high keyword matches */}
                  {!lead.isDemo && lead.matchedKeywords.length >= 3 && (
                    <span className="inline-flex items-center gap-1 px-2 py-0.5 text-xs font-medium bg-orange-100 text-orange-700 rounded mb-2 ml-1">
                      <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M12.395 2.553a1 1 0 00-1.45-.385c-.345.23-.614.558-.822.88-.214.33-.403.713-.57 1.116-.334.804-.614 1.768-.84 2.734a31.365 31.365 0 00-.613 3.58 2.64 2.64 0 01-.945-1.067c-.328-.68-.398-1.534-.398-2.654A1 1 0 005.05 6.05 6.981 6.981 0 003 11a7 7 0 1011.95-4.95c-.592-.591-.98-.985-1.348-1.467-.363-.476-.724-1.063-1.207-2.03zM12.12 15.12A3 3 0 017 13s.879.5 2.5.5c0-1 .5-4 1.25-4.5.5 1 .786 1.293 1.371 1.879A2.99 2.99 0 0113 13a2.99 2.99 0 01-.879 2.121z" clipRule="evenodd" />
                      </svg>
                      Hot Lead
                    </span>
                  )}
                  {/* Sender Name - links to lead detail for real leads */}
                  {lead.senderName && (
                    <p className="text-sm text-gray-600 mb-1">
                      <span className="text-gray-500">by</span>{' '}
                      {!lead.isDemo ? (
                        <Link href={`/leads/${lead.id}`} className="font-medium text-gray-700 hover:text-primary transition-colors">
                          {lead.senderName}
                        </Link>
                      ) : (
                        <span className="font-medium text-gray-700">{lead.senderName}</span>
                      )}
                    </p>
                  )}
                  <p className="text-gray-900 mb-2">
                    {lead.content.length > 200 && !expandedLeads.has(lead.id)
                      ? `${lead.content.slice(0, 200)}...`
                      : lead.content}
                    {lead.content.length > 200 && (
                      <button
                        onClick={() => {
                          setExpandedLeads((prev) => {
                            const next = new Set(prev);
                            if (next.has(lead.id)) {
                              next.delete(lead.id);
                            } else {
                              next.add(lead.id);
                            }
                            return next;
                          });
                        }}
                        className="ml-1 text-primary hover:text-primary-dark text-sm font-medium"
                      >
                        {expandedLeads.has(lead.id) ? 'Show less' : 'Show more'}
                      </button>
                    )}
                  </p>
                  <div className="flex items-center gap-2 text-sm text-gray-500">
                    <span className="flex items-center gap-1">
                      <PlatformIcon platform={lead.platform} />
                      <span className="capitalize">{lead.platform}</span>
                    </span>
                    <span>•</span>
                    <span title={new Date(lead.createdAt).toLocaleString()}>{formatRelativeTime(lead.createdAt)}</span>
                  </div>
                  {lead.matchedKeywords.length > 0 && (
                    <div className="flex flex-wrap gap-2 mt-2">
                      {lead.matchedKeywords.map((keyword) => (
                        <span
                          key={keyword}
                          className="px-2 py-1 bg-blue-50 text-blue-700 text-xs rounded-full"
                        >
                          {keyword}
                        </span>
                      ))}
                    </div>
                  )}
                  {/* Action Buttons - Hidden for demo leads */}
                  {lead.isDemo ? (
                    <div className="flex items-center gap-2 mt-4 pt-4 border-t border-gray-100">
                      <span className="text-sm text-gray-400 italic">
                        Actions available on real leads
                      </span>
                    </div>
                  ) : (
                  <div className="flex items-center gap-2 mt-4 pt-4 border-t border-gray-100">
                    {/* View Details link */}
                    <Link
                      href={`/leads/${lead.id}`}
                      className="px-3 py-1.5 text-sm bg-primary/10 text-primary rounded-md hover:bg-primary/20 transition-colors"
                    >
                      View Details
                    </Link>
                    {lead.status !== 'ARCHIVED' && (
                      <>
                        {lead.status !== 'INTERESTED' && (
                          <button
                            onClick={() => updateLeadStatus(lead.id, 'INTERESTED')}
                            disabled={updatingLeadId === lead.id}
                            className="px-3 py-1.5 text-sm bg-green-50 text-green-700 rounded-md hover:bg-green-100 transition-colors disabled:opacity-50"
                          >
                            {updatingLeadId === lead.id ? '...' : 'Interested'}
                          </button>
                        )}
                        {lead.status !== 'NOT_INTERESTED' && (
                          <button
                            onClick={() => updateLeadStatus(lead.id, 'NOT_INTERESTED')}
                            disabled={updatingLeadId === lead.id}
                            className="px-3 py-1.5 text-sm bg-red-50 text-red-700 rounded-md hover:bg-red-100 transition-colors disabled:opacity-50"
                          >
                            {updatingLeadId === lead.id ? '...' : 'Not Interested'}
                          </button>
                        )}
                        {lead.status !== 'MARKED_LATER' && (
                          <button
                            onClick={() => updateLeadStatus(lead.id, 'MARKED_LATER')}
                            disabled={updatingLeadId === lead.id}
                            className="px-3 py-1.5 text-sm bg-yellow-50 text-yellow-700 rounded-md hover:bg-yellow-100 transition-colors disabled:opacity-50"
                          >
                            {updatingLeadId === lead.id ? '...' : 'Mark for Later'}
                          </button>
                        )}
                        {lead.status !== 'NEW' && (
                          <button
                            onClick={() => updateLeadStatus(lead.id, 'NEW')}
                            disabled={updatingLeadId === lead.id}
                            className="px-3 py-1.5 text-sm bg-blue-50 text-blue-700 rounded-md hover:bg-blue-100 transition-colors disabled:opacity-50"
                          >
                            {updatingLeadId === lead.id ? '...' : 'Move to New'}
                          </button>
                        )}
                        <button
                          onClick={() => updateLeadStatus(lead.id, 'ARCHIVED')}
                          disabled={updatingLeadId === lead.id}
                          className="px-3 py-1.5 text-sm bg-gray-100 text-gray-600 rounded-md hover:bg-gray-200 transition-colors disabled:opacity-50"
                        >
                          {updatingLeadId === lead.id ? '...' : 'Archive'}
                        </button>
                      </>
                    )}
                    {lead.status === 'ARCHIVED' && (
                      <button
                        onClick={() => updateLeadStatus(lead.id, 'NEW')}
                        disabled={updatingLeadId === lead.id}
                        className="px-3 py-1.5 text-sm bg-blue-50 text-blue-700 rounded-md hover:bg-blue-100 transition-colors disabled:opacity-50"
                      >
                        {updatingLeadId === lead.id ? '...' : 'Restore'}
                      </button>
                    )}
                    {/* Open Source button - opens permalink in new tab */}
                    {lead.sourceUrl && (
                      <a
                        href={lead.sourceUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="px-3 py-1.5 text-sm bg-primary/10 text-primary rounded-md hover:bg-primary/20 transition-colors inline-flex items-center gap-1"
                      >
                        Open Source
                        <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                        </svg>
                      </a>
                    )}
                    {/* Delete button - always available */}
                    <button
                      onClick={() => deleteLead(lead.id)}
                      disabled={updatingLeadId === lead.id}
                      className="px-3 py-1.5 text-sm bg-red-50 text-red-600 rounded-md hover:bg-red-100 transition-colors disabled:opacity-50 ml-auto"
                      aria-label={`Delete lead ${lead.id}`}
                    >
                      {updatingLeadId === lead.id ? '...' : 'Delete'}
                    </button>
                  </div>
                  )}
                </div>
              </div>
            </div>
          ))}

          {/* Pagination Controls */}
          {totalPages > 1 && (
            <div className="mt-8 flex items-center justify-between border-t border-gray-200 pt-6">
              <div className="text-sm text-gray-600">
                Showing page {currentPage} of {totalPages} ({totalItems} total leads)
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => {
                    const newPage = currentPage - 1;
                    setCurrentPage(newPage);
                    updateURL({ page: newPage });
                  }}
                  disabled={currentPage === 1}
                  className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                  aria-label="Previous page"
                >
                  Previous
                </button>
                <span className="px-4 py-2 text-sm font-medium text-gray-900 bg-gray-100 border border-gray-300 rounded-md">
                  {currentPage}
                </span>
                <button
                  onClick={() => {
                    const newPage = currentPage + 1;
                    setCurrentPage(newPage);
                    updateURL({ page: newPage });
                  }}
                  disabled={currentPage >= totalPages || !hasMore}
                  className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                  aria-label="Next page"
                >
                  Next
                </button>
              </div>
            </div>
          )}
        </div>
      ) : hasActiveFilters ? (
        /* No results from filters - but we have leads */
        <div className="card text-center py-16">
          <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <svg
              className="w-8 h-8 text-gray-400"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
              />
            </svg>
          </div>
          <h2 className="text-xl font-semibold text-gray-900 mb-2">No results found</h2>
          <p className="text-gray-600 mb-6 max-w-md mx-auto">
            No leads match your current filters. Try adjusting your search criteria or clearing filters.
          </p>
          <div className="space-y-4">
            <button
              onClick={() => {
                setSkillFilter('');
                setPlatformFilter('');
                setDateRange('');
                setSortOrder('newest');
                // Reset pagination and clear all filters from URL
                setCurrentPage(1);
                updateURL({ page: 1, skill: undefined, platform: undefined, date: undefined, sort: undefined });
              }}
              className="btn-primary"
            >
              Clear All Filters
            </button>
            <p className="text-sm text-gray-500">
              <strong>Suggestions:</strong> Try broader skill terms, check a different platform, or view all leads.
            </p>
          </div>
        </div>
      ) : (
        /* No leads at all */
        <div className="card text-center py-16">
          <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <svg
              className="w-8 h-8 text-gray-400"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10"
              />
            </svg>
          </div>
          <h2 className="text-xl font-semibold text-gray-900 mb-2">No leads yet</h2>
          <p className="text-gray-600 mb-6 max-w-md mx-auto">
            Connect your platforms and set up keywords to start finding leads.
            {userName && ` Welcome, ${userName}!`}
          </p>
          <div className="flex items-center justify-center gap-4">
            <Link href="/platforms" className="btn-primary">
              Connect Platforms
            </Link>
            <Link href="/keywords" className="btn-tertiary">
              Set Up Keywords
            </Link>
          </div>
        </div>
      )}

      {/* Footer */}
      <div className="text-center mt-12">
        <Link
          href="#"
          className="inline-flex items-center gap-2 text-primary hover:text-primary-dark transition-colors btn-primary"
        >
          Back to the top
        </Link>
      </div>
    </div>
  );
}
