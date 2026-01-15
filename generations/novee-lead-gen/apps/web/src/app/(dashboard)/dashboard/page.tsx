import { getSessionUser } from '@/lib/auth';
import Link from 'next/link';

export default async function DashboardPage() {
  const user = await getSessionUser();

  return (
    <div className="max-w-4xl">
      {/* Page Header */}
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-gray-900">Leads</h1>
      </div>

      {/* Tab Navigation */}
      <div className="flex items-center gap-6 border-b border-gray-200 mb-6">
        <button className="pb-4 border-b-2 border-primary text-primary font-medium">
          Newest <span className="ml-1 bg-blue-100 text-blue-700 px-2 py-0.5 rounded-full text-xs">0</span>
        </button>
        <button className="pb-4 text-gray-500 hover:text-gray-700">
          View All <span className="ml-1 text-gray-400 text-sm">0%</span>
        </button>
        <button className="pb-4 text-gray-500 hover:text-gray-700">
          Marked for Later <span className="ml-1 text-gray-400 text-sm">0</span>
        </button>
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

      {/* Empty State */}
      <div className="card text-center py-16">
        <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
          <svg className="w-8 h-8 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
          </svg>
        </div>
        <h2 className="text-xl font-semibold text-gray-900 mb-2">No leads yet</h2>
        <p className="text-gray-600 mb-6 max-w-md mx-auto">
          Connect your platforms and set up keywords to start finding leads.
          {user?.name && ` Welcome, ${user.name}!`}
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
