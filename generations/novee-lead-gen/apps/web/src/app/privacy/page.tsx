import Link from 'next/link';

export default function PrivacyPage() {
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
        <h1 className="text-3xl font-bold text-gray-900 mb-8">Privacy Policy</h1>

        <div className="prose prose-gray max-w-none">
          <p className="text-gray-600 mb-6">
            Last updated: January 2026
          </p>

          <section className="mb-8">
            <h2 className="text-xl font-semibold text-gray-900 mb-4">1. Information We Collect</h2>
            <p className="text-gray-600 mb-4">
              Novee collects information you provide directly to us, including your name, email address,
              and the keywords you choose to monitor. We also collect information about your connected
              platforms (Slack, LinkedIn) to help you discover leads.
            </p>
          </section>

          <section className="mb-8">
            <h2 className="text-xl font-semibold text-gray-900 mb-4">2. How We Use Your Information</h2>
            <p className="text-gray-600 mb-4">
              We use the information we collect to provide, maintain, and improve our services.
              This includes matching your keywords against conversations in your connected platforms
              to surface relevant leads.
            </p>
          </section>

          <section className="mb-8">
            <h2 className="text-xl font-semibold text-gray-900 mb-4">3. Data Security</h2>
            <p className="text-gray-600 mb-4">
              Your platform credentials never leave your device. Our desktop app uses a secure
              persistent browser context to maintain your login sessions locally. We only read
              conversations - we never post or interact on your behalf.
            </p>
          </section>

          <section className="mb-8">
            <h2 className="text-xl font-semibold text-gray-900 mb-4">4. Your Rights</h2>
            <p className="text-gray-600 mb-4">
              You can disconnect your platforms at any time. When you delete your account,
              all your data is permanently removed from our systems.
            </p>
          </section>

          <section className="mb-8">
            <h2 className="text-xl font-semibold text-gray-900 mb-4">5. Contact Us</h2>
            <p className="text-gray-600 mb-4">
              If you have any questions about this Privacy Policy, please contact us at
              privacy@novee.tech.
            </p>
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
            <Link href="/privacy" className="text-primary font-medium">Privacy</Link>
            <Link href="/terms" className="hover:text-gray-900 transition-colors">Terms</Link>
            <Link href="/support" className="hover:text-gray-900 transition-colors">Support</Link>
          </nav>
        </div>
      </footer>
    </div>
  );
}
