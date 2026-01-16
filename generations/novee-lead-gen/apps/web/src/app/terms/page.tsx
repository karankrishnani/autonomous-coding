import Link from 'next/link';

export default function TermsPage() {
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
        <h1 className="text-3xl font-bold text-gray-900 mb-8">Terms of Service</h1>

        <div className="prose prose-gray max-w-none">
          <p className="text-gray-600 mb-6">
            Last updated: January 2026
          </p>

          <section className="mb-8">
            <h2 className="text-xl font-semibold text-gray-900 mb-4">1. Acceptance of Terms</h2>
            <p className="text-gray-600 mb-4">
              By accessing or using Novee, you agree to be bound by these Terms of Service.
              If you do not agree to these terms, please do not use our service.
            </p>
          </section>

          <section className="mb-8">
            <h2 className="text-xl font-semibold text-gray-900 mb-4">2. Description of Service</h2>
            <p className="text-gray-600 mb-4">
              Novee is a lead generation platform that helps you discover client opportunities
              by monitoring your connected platforms (Slack, LinkedIn) for relevant conversations
              matching your selected keywords.
            </p>
          </section>

          <section className="mb-8">
            <h2 className="text-xl font-semibold text-gray-900 mb-4">3. User Responsibilities</h2>
            <p className="text-gray-600 mb-4">
              You are responsible for maintaining the security of your account credentials.
              You agree to use Novee only for lawful purposes and in accordance with the
              terms of service of your connected platforms.
            </p>
          </section>

          <section className="mb-8">
            <h2 className="text-xl font-semibold text-gray-900 mb-4">4. Privacy</h2>
            <p className="text-gray-600 mb-4">
              Your use of Novee is also governed by our Privacy Policy.
              Please review our <Link href="/privacy" className="text-primary hover:underline">Privacy Policy</Link> to
              understand how we collect and use your information.
            </p>
          </section>

          <section className="mb-8">
            <h2 className="text-xl font-semibold text-gray-900 mb-4">5. Limitation of Liability</h2>
            <p className="text-gray-600 mb-4">
              Novee is provided &quot;as is&quot; without warranties of any kind.
              We are not liable for any damages arising from your use of the service.
            </p>
          </section>

          <section className="mb-8">
            <h2 className="text-xl font-semibold text-gray-900 mb-4">6. Contact</h2>
            <p className="text-gray-600 mb-4">
              If you have any questions about these Terms, please contact us at legal@novee.io.
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
            <Link href="/privacy" className="hover:text-gray-900 transition-colors">Privacy</Link>
            <Link href="/terms" className="text-primary font-medium">Terms</Link>
            <Link href="/support" className="hover:text-gray-900 transition-colors">Support</Link>
          </nav>
        </div>
      </footer>
    </div>
  );
}
