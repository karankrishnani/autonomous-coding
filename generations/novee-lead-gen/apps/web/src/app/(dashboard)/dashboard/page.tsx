'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';

type TabType = 'newest' | 'viewed' | 'markedLater';

interface Lead {
  id: string;
  content: string;
  platform: string;
  matchedKeywords: string[];
  status: string;
  createdAt: string;
}

// Transform API response to frontend format
function transformLead(apiLead: {
  id: string;
  matched_keywords: string[];
  status: string;
  created_at: string;
  post?: {
    content: string;
    platform: string;
  };
}): Lead {
  return {
    id: apiLead.id,
    content: apiLead.post?.content || '',
    platform: apiLead.post?.platform || '',
    matchedKeywords: apiLead.matched_keywords || [],
    status: apiLead.status,
    createdAt: apiLead.created_at,
  };
}

interface PlatformConnection {
  id: string;
  platform: string;
  status: string;
}

export default function DashboardPage() {
  const [activeTab, setActiveTab] = useState<TabType>('newest');
  const [leads, setLeads] = useState<Lead[]>([]);
  const [loading, setLoading] = useState(true);
  const [userName, setUserName] = useState<string>('');
  const [activePlatforms, setActivePlatforms] = useState<number>(0);

  useEffect(() => {
    async function fetchData() {
      try {
        // Fetch leads and platform connections in parallel
        const [leadsResponse, platformsResponse] = await Promise.all([
          fetch('/api/leads'),
          fetch('/api/platforms/connections'),
        ]);

        if (leadsResponse.ok) {
          const data = await leadsResponse.json();
          const transformedLeads = (data.leads || []).map(transformLead);
          setLeads(transformedLeads);
          setUserName(data.userName || '');
        }

        if (platformsResponse.ok) {
          const platformsData = await platformsResponse.json();
          const connections: PlatformConnection[] = platformsData.connections || [];
          // Count connected platforms (status is CONNECTED)
          const connectedCount = connections.filter(
            (c) => c.status === 'CONNECTED'
          ).length;
          setActivePlatforms(connectedCount);
        }
      } catch (error) {
        console.error('Error fetching data:', error);
      } finally {
        setLoading(false);
      }
    }
    fetchData();
  }, []);

  // Filter leads based on active tab
  const filteredLeads = leads.filter((lead) => {
    switch (activeTab) {
      case 'newest':
        return lead.status === 'NEW';
      case 'viewed':
        return lead.status === 'VIEWED';
      case 'markedLater':
        return lead.status === 'MARKED_LATER';
      default:
        return true;
    }
  });

  const newestCount = leads.filter((l) => l.status === 'NEW').length;
  const viewedCount = leads.filter((l) => l.status === 'VIEWED').length;
  const viewedPercent = leads.length > 0 ? Math.round((viewedCount / leads.length) * 100) : 0;
  const markedLaterCount = leads.filter((l) => l.status === 'MARKED_LATER').length;

  const tabs = [
    { id: 'newest' as TabType, label: 'Newest', count: newestCount, showCount: true },
    { id: 'viewed' as TabType, label: 'View All', count: `${viewedPercent}%`, showCount: true },
    { id: 'markedLater' as TabType, label: 'Marked for Later', count: markedLaterCount, showCount: true },
  ];

  if (loading) {
    return (
      <div className="max-w-4xl">
        <div className="mb-8">
          <div className="h-8 w-24 bg-gray-200 rounded animate-pulse" />
        </div>
        <div className="card text-center py-16">
          <div className="w-16 h-16 bg-gray-200 rounded-full mx-auto mb-4 animate-pulse" />
          <div className="h-6 w-48 bg-gray-200 rounded mx-auto mb-2 animate-pulse" />
          <div className="h-4 w-64 bg-gray-200 rounded mx-auto animate-pulse" />
        </div>
      </div>
    );
  }

  // Calculate stats
  const totalLeads = leads.length;
  const leadsThisWeek = leads.filter((lead) => {
    const leadDate = new Date(lead.createdAt);
    const weekAgo = new Date();
    weekAgo.setDate(weekAgo.getDate() - 7);
    return leadDate >= weekAgo;
  }).length;

  return (
    <div className="max-w-4xl">
      {/* Page Header */}
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-gray-900">Leads</h1>
      </div>

      {/* Stats Section */}
      <div className="grid grid-cols-3 gap-4 mb-8">
        <div className="card p-4 text-center">
          <p className="text-3xl font-bold text-primary" data-testid="total-leads-count">{totalLeads}</p>
          <p className="text-sm text-gray-500">Total Leads</p>
        </div>
        <div className="card p-4 text-center">
          <p className="text-3xl font-bold text-green-600" data-testid="leads-this-week">{leadsThisWeek}</p>
          <p className="text-sm text-gray-500">This Week</p>
        </div>
        <div className="card p-4 text-center">
          <p className="text-3xl font-bold text-purple-600" data-testid="active-platforms">{activePlatforms}</p>
          <p className="text-sm text-gray-500">Active Platforms</p>
        </div>
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
        <select className="input-field max-w-xs">
          <option value="">Select your skills</option>
        </select>
        <select className="input-field max-w-xs">
          <option value="">Filter by Platform</option>
          <option value="slack">Slack</option>
          <option value="linkedin">LinkedIn</option>
        </select>
      </div>

      {/* Leads List or Empty State */}
      {filteredLeads.length > 0 ? (
        <div className="space-y-4">
          {filteredLeads.map((lead) => (
            <div key={lead.id} className="card p-6">
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <p className="text-gray-900 mb-2">{lead.content}</p>
                  <div className="flex items-center gap-2 text-sm text-gray-500">
                    <span className="capitalize">{lead.platform}</span>
                    <span>•</span>
                    <span>{new Date(lead.createdAt).toLocaleDateString()}</span>
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
                </div>
              </div>
            </div>
          ))}
        </div>
      ) : (
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
