import Link from 'next/link';

export default function SupportPage() {
  return (
    <div className="min-h-screen bg-white">
      {/* Header */}
      <header className="h-16 border-b border-gray-200 flex items-center px-6">
        <Link href="/" className="flex items-center gap-2">
          <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center">
            <span className="text-primary font-bold text-sm">O</span>
          </div>
          <span className="font-bold tracking-wide text-gray-900">NOVEE</span>
        </Link>
      </header>

      {/* Content */}
      <main className="max-w-3xl mx-auto px-6 py-12">
        <h1 className="text-3xl font-bold text-gray-900 mb-8">Help & Support</h1>

        <div className="space-y-8">
          {/* Contact Section */}
          <section className="card p-6">
            <h2 className="text-xl font-semibold text-gray-900 mb-4">Contact Us</h2>
            <p className="text-gray-600 mb-4">
              Have questions or need help? We&apos;re here for you.
            </p>
            <div className="space-y-3">
              <p className="text-gray-600">
                <span className="font-medium">Email:</span>{' '}
                <a href="mailto:support@novee.tech" className="text-primary hover:underline">
                  support@novee.tech
                </a>
              </p>
              <p className="text-gray-600">
                <span className="font-medium">Response time:</span> Within 24 hours
              </p>
            </div>
          </section>

          {/* FAQ Section */}
          <section className="card p-6">
            <h2 className="text-xl font-semibold text-gray-900 mb-4">Frequently Asked Questions</h2>

            <div className="space-y-6">
              <div>
                <h3 className="font-medium text-gray-900 mb-2">How does Novee find leads?</h3>
                <p className="text-gray-600">
                  Novee monitors your connected platforms (Slack, LinkedIn) for conversations
                  matching your selected keywords. When a match is found, it appears in your
                  lead feed.
                </p>
              </div>

              <div>
                <h3 className="font-medium text-gray-900 mb-2">Is my data secure?</h3>
                <p className="text-gray-600">
                  Yes! Your platform credentials never leave your device. Our desktop app
                  uses a secure persistent browser context to maintain your login sessions
                  locally.
                </p>
              </div>

              <div>
                <h3 className="font-medium text-gray-900 mb-2">Why do I need the desktop app?</h3>
                <p className="text-gray-600">
                  The desktop app allows us to securely monitor your platforms without
                  storing your credentials on our servers. This keeps your data safe
                  and under your control.
                </p>
              </div>

              <div>
                <h3 className="font-medium text-gray-900 mb-2">Can I disconnect a platform?</h3>
                <p className="text-gray-600">
                  Yes! You can disconnect any platform at any time from the Platforms page.
                  Your data from that platform will be removed from your leads.
                </p>
              </div>
            </div>
          </section>

          {/* Documentation Section */}
          <section className="card p-6">
            <h2 className="text-xl font-semibold text-gray-900 mb-4">Getting Started</h2>
            <div className="space-y-4">
              <div className="flex items-start gap-4">
                <div className="w-8 h-8 bg-primary/10 rounded-full flex items-center justify-center flex-shrink-0">
                  <span className="text-primary font-bold">1</span>
                </div>
                <div>
                  <h3 className="font-medium text-gray-900">Create your account</h3>
                  <p className="text-gray-600 text-sm">Sign up with your email or Google account.</p>
                </div>
              </div>
              <div className="flex items-start gap-4">
                <div className="w-8 h-8 bg-primary/10 rounded-full flex items-center justify-center flex-shrink-0">
                  <span className="text-primary font-bold">2</span>
                </div>
                <div>
                  <h3 className="font-medium text-gray-900">Download the desktop app</h3>
                  <p className="text-gray-600 text-sm">Install our secure desktop app to connect platforms.</p>
                </div>
              </div>
              <div className="flex items-start gap-4">
                <div className="w-8 h-8 bg-primary/10 rounded-full flex items-center justify-center flex-shrink-0">
                  <span className="text-primary font-bold">3</span>
                </div>
                <div>
                  <h3 className="font-medium text-gray-900">Connect your platforms</h3>
                  <p className="text-gray-600 text-sm">Link Slack or LinkedIn to start monitoring.</p>
                </div>
              </div>
              <div className="flex items-start gap-4">
                <div className="w-8 h-8 bg-primary/10 rounded-full flex items-center justify-center flex-shrink-0">
                  <span className="text-primary font-bold">4</span>
                </div>
                <div>
                  <h3 className="font-medium text-gray-900">Set up keywords</h3>
                  <p className="text-gray-600 text-sm">Choose keywords that match your skills and services.</p>
                </div>
              </div>
            </div>
          </section>
        </div>

        <div className="mt-12 pt-8 border-t border-gray-200">
          <Link href="/" className="text-primary hover:text-primary-dark transition-colors">
            &larr; Back to Home
          </Link>
        </div>
      </main>

      {/* Footer */}
      <footer className="border-t border-gray-200 py-8 mt-12">
        <div className="max-w-3xl mx-auto px-6 flex items-center justify-between text-sm text-gray-500">
          <span>&copy; 2026 Novee. All rights reserved.</span>
          <nav className="flex items-center gap-6">
            <Link href="/privacy" className="hover:text-gray-900 transition-colors">Privacy</Link>
            <Link href="/terms" className="hover:text-gray-900 transition-colors">Terms</Link>
            <Link href="/support" className="text-primary font-medium">Support</Link>
          </nav>
        </div>
      </footer>
    </div>
  );
}
