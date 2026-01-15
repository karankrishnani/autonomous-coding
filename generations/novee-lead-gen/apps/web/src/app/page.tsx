import Link from 'next/link';

export default function HomePage() {
  return (
    <div className="min-h-screen bg-white">
      {/* Header */}
      <header className="h-16 border-b border-gray-200 flex items-center px-6">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center">
            <span className="text-primary font-bold text-sm">O</span>
          </div>
          <span className="font-bold tracking-wide text-gray-900">NOVEE</span>
        </div>
        <nav className="ml-auto flex items-center gap-4">
          <Link href="/login" className="text-gray-600 hover:text-gray-900 transition-colors">
            Login
          </Link>
          <Link href="/signup" className="btn-primary">
            Get Started
          </Link>
        </nav>
      </header>

      {/* Hero Section */}
      <main className="max-w-6xl mx-auto px-6 py-24">
        <div className="text-center">
          <h1 className="text-5xl font-bold text-gray-900 mb-6">
            Find Your Next Client
            <br />
            <span className="text-primary">Before the Competition</span>
          </h1>
          <p className="text-xl text-gray-600 mb-8 max-w-2xl mx-auto">
            Novee monitors Slack and LinkedIn for real-time opportunities where clients are actively
            seeking help. No more cold outreach – discover warm leads from actual conversations.
          </p>
          <div className="flex items-center justify-center gap-4">
            <Link href="/signup" className="btn-primary text-lg px-8 py-4">
              Start Finding Leads
            </Link>
            <Link href="/login" className="btn-tertiary text-lg px-8 py-4">
              Sign In
            </Link>
          </div>
        </div>

        {/* Features Grid */}
        <div className="grid md:grid-cols-3 gap-8 mt-24">
          <div className="card text-center">
            <div className="w-12 h-12 bg-primary/10 rounded-lg flex items-center justify-center mx-auto mb-4">
              <svg
                className="w-6 h-6 text-primary"
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
            <h3 className="text-lg font-semibold text-gray-900 mb-2">Real-Time Discovery</h3>
            <p className="text-gray-600">
              Monitor conversations as they happen. Get alerted when someone posts about needing
              your skills.
            </p>
          </div>

          <div className="card text-center">
            <div className="w-12 h-12 bg-secondary/10 rounded-lg flex items-center justify-center mx-auto mb-4">
              <svg
                className="w-6 h-6 text-secondary"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"
                />
              </svg>
            </div>
            <h3 className="text-lg font-semibold text-gray-900 mb-2">Privacy First</h3>
            <p className="text-gray-600">
              We only read – never post. Your credentials stay on your device, fully under your
              control.
            </p>
          </div>

          <div className="card text-center">
            <div className="w-12 h-12 bg-accent/10 rounded-lg flex items-center justify-center mx-auto mb-4">
              <svg
                className="w-6 h-6 text-accent"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6"
                />
              </svg>
            </div>
            <h3 className="text-lg font-semibold text-gray-900 mb-2">Warm Leads Only</h3>
            <p className="text-gray-600">
              No more cold outreach. Connect with prospects who are actively looking for your
              expertise.
            </p>
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="border-t border-gray-200 py-8 mt-24">
        <div className="max-w-6xl mx-auto px-6 flex items-center justify-between text-sm text-gray-500">
          <span>&copy; {new Date().getFullYear()} Novee. All rights reserved.</span>
          <nav className="flex items-center gap-6">
            <Link href="/privacy" className="hover:text-gray-900 transition-colors">
              Privacy
            </Link>
            <Link href="/terms" className="hover:text-gray-900 transition-colors">
              Terms
            </Link>
            <Link href="/support" className="hover:text-gray-900 transition-colors">
              Support
            </Link>
          </nav>
        </div>
      </footer>
    </div>
  );
}
