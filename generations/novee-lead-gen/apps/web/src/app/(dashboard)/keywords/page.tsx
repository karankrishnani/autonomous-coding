export default function KeywordsPage() {
  return (
    <div className="max-w-4xl">
      {/* Page Header */}
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-gray-900">Keywords</h1>
        <p className="text-gray-600 mt-1">
          Set up keywords to find relevant leads from your connected platforms.
        </p>
      </div>

      {/* Keywords Management - Coming Soon */}
      <div className="card text-center py-16">
        <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
          <svg className="w-8 h-8 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 7h.01M7 3h5c.512 0 1.024.195 1.414.586l7 7a2 2 0 010 2.828l-7 7a2 2 0 01-2.828 0l-7-7A1.994 1.994 0 013 12V7a4 4 0 014-4z" />
          </svg>
        </div>
        <h2 className="text-xl font-semibold text-gray-900 mb-2">No keywords set up yet</h2>
        <p className="text-gray-600 mb-6 max-w-md mx-auto">
          Add keywords to start finding leads that match your skills and interests.
        </p>
        <button className="btn-primary">
          Add Your First Keyword
        </button>
      </div>
    </div>
  );
}
