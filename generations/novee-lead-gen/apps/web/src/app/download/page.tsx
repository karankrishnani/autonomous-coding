'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';

type Platform = 'mac' | 'windows' | 'linux' | 'unknown';
type TabType = 'video' | 'text' | 'help';

interface PlatformInfo {
  name: string;
  icon: string;
  downloadUrl: string;
  installerFormat: string;
}

const platformData: Record<Exclude<Platform, 'unknown'>, PlatformInfo> = {
  mac: {
    name: 'macOS',
    icon: '',
    downloadUrl: '/downloads/novee-desktop-mac.dmg',
    installerFormat: '.dmg',
  },
  windows: {
    name: 'Windows',
    icon: '',
    downloadUrl: '/downloads/novee-desktop-win.exe',
    installerFormat: '.exe',
  },
  linux: {
    name: 'Linux',
    icon: '',
    downloadUrl: '/downloads/novee-desktop-linux.AppImage',
    installerFormat: '.AppImage',
  },
};

function detectPlatform(): Platform {
  if (typeof window === 'undefined') return 'unknown';

  const userAgent = window.navigator.userAgent.toLowerCase();
  const platform = window.navigator.platform.toLowerCase();

  if (platform.includes('mac') || userAgent.includes('mac')) {
    return 'mac';
  }
  if (platform.includes('win') || userAgent.includes('win')) {
    return 'windows';
  }
  if (platform.includes('linux') || userAgent.includes('linux')) {
    return 'linux';
  }

  return 'unknown';
}

export default function DownloadPage() {
  const [platform, setPlatform] = useState<Platform>('unknown');
  const [activeTab, setActiveTab] = useState<TabType>('text');

  useEffect(() => {
    setPlatform(detectPlatform());
  }, []);

  const currentPlatform = platform !== 'unknown' ? platformData[platform] : platformData.mac;

  const tabs: { id: TabType; label: string }[] = [
    { id: 'video', label: 'Video Walkthrough' },
    { id: 'text', label: 'Text Instructions' },
    { id: 'help', label: 'Schedule Help' },
  ];

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="h-16 border-b border-gray-200 bg-white flex items-center justify-between px-6">
        <Link href="/" className="flex items-center gap-2">
          <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center">
            <span className="text-primary font-bold text-sm">O</span>
          </div>
          <span className="font-bold tracking-wide text-gray-900">NOVEE</span>
        </Link>
        <Link href="/download" className="btn-primary text-sm">
          Download for Desktop
        </Link>
      </header>

      {/* Progress Bar */}
      <div className="bg-white border-b border-gray-200 px-6 py-4">
        <div className="max-w-4xl mx-auto">
          <div className="flex items-center justify-between mb-2">
            <p className="text-sm font-medium text-gray-700">Onboarding Progress</p>
            <span className="text-sm text-gray-500">Step 1 of 3</span>
          </div>
          {/* Visual Progress Bar */}
          <div className="w-full h-2 bg-gray-200 rounded-full overflow-hidden mb-3">
            <div
              className="h-full bg-primary rounded-full transition-all duration-300"
              style={{ width: '33%' }}
              role="progressbar"
              aria-valuenow={1}
              aria-valuemin={0}
              aria-valuemax={3}
              aria-label="Onboarding progress: Step 1 of 3"
            />
          </div>
          {/* Step Indicators - Clickable Navigation */}
          <div className="flex justify-between">
            <Link href="/download" className="flex items-center gap-2 group cursor-pointer hover:opacity-80 transition-opacity">
              <div className="w-6 h-6 rounded-full bg-primary text-white text-xs font-medium flex items-center justify-center">1</div>
              <span className="text-sm font-medium text-primary group-hover:underline">Platform Setup</span>
            </Link>
            <Link href="/keywords" className="flex items-center gap-2 group cursor-pointer hover:opacity-80 transition-opacity">
              <div className="w-6 h-6 rounded-full bg-gray-200 text-gray-500 text-xs font-medium flex items-center justify-center group-hover:bg-gray-300">2</div>
              <span className="text-sm text-gray-500 group-hover:underline">Keywords</span>
            </Link>
            <Link href="/leads" className="flex items-center gap-2 group cursor-pointer hover:opacity-80 transition-opacity">
              <div className="w-6 h-6 rounded-full bg-gray-200 text-gray-500 text-xs font-medium flex items-center justify-center group-hover:bg-gray-300">3</div>
              <span className="text-sm text-gray-500 group-hover:underline">Start Finding Leads</span>
            </Link>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <main className="max-w-4xl mx-auto px-6 py-12">
        <div className="grid md:grid-cols-2 gap-12">
          {/* Left Column - Download Info */}
          <div>
            <h1 className="text-3xl font-bold text-gray-900 mb-4">Download the Desktop App</h1>
            <p className="text-gray-600 mb-8">
              The desktop app is essential for Novee to connect with your social platforms like Slack and LinkedIn.
              This ensures your data remains private while allowing you to save time searching for new leads.
            </p>

            {/* Features */}
            <div className="space-y-6 mb-8">
              <div className="flex items-start gap-4">
                <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center flex-shrink-0">
                  <svg className="w-5 h-5 text-primary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                  </svg>
                </div>
                <div>
                  <h3 className="font-semibold text-gray-900">Secure Data Privacy</h3>
                  <p className="text-gray-600 text-sm">Your data is encrypted at rest/in-transit, preventing unauthorized access.</p>
                </div>
              </div>

              <div className="flex items-start gap-4">
                <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center flex-shrink-0">
                  <svg className="w-5 h-5 text-primary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                  </svg>
                </div>
                <div>
                  <h3 className="font-semibold text-gray-900">Real-Time Access</h3>
                  <p className="text-gray-600 text-sm">Connect instantly to Slack, LinkedIn, and other platforms for immediate lead updates.</p>
                </div>
              </div>

              <div className="flex items-start gap-4">
                <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center flex-shrink-0">
                  <svg className="w-5 h-5 text-primary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2V6zM14 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V6zM4 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2v-2zM14 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2z" />
                  </svg>
                </div>
                <div>
                  <h3 className="font-semibold text-gray-900">Platform Integration</h3>
                  <p className="text-gray-600 text-sm">Seamlessly integrate with your existing platforms and utilize audit for low-code in the background.</p>
                </div>
              </div>
            </div>

            {/* Download Button */}
            <a
              href={currentPlatform.downloadUrl}
              className="btn-primary inline-flex items-center gap-2"
              data-platform={platform}
              data-format={currentPlatform.installerFormat}
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
              </svg>
              Download for {currentPlatform.name} ({currentPlatform.installerFormat})
            </a>

            {/* Other Platforms */}
            <div className="mt-4">
              <p className="text-sm text-gray-500">
                Not on {currentPlatform.name}?{' '}
                {platform !== 'mac' && (
                  <a href={platformData.mac.downloadUrl} className="text-primary hover:underline">macOS</a>
                )}
                {platform !== 'mac' && platform !== 'windows' && ' • '}
                {platform !== 'windows' && (
                  <a href={platformData.windows.downloadUrl} className="text-primary hover:underline">Windows</a>
                )}
                {platform !== 'linux' && ' • '}
                {platform !== 'linux' && (
                  <a href={platformData.linux.downloadUrl} className="text-primary hover:underline">Linux</a>
                )}
              </p>
            </div>
          </div>

          {/* Right Column - Leads Preview */}
          <div className="bg-white rounded-xl border border-gray-200 p-6">
            <h3 className="font-semibold text-gray-900 mb-4">Leads</h3>
            <div className="space-y-3">
              {[1, 2, 3].map((i) => (
                <div key={i} className="flex items-center gap-3">
                  <div className="w-8 h-8 bg-gray-200 rounded-full animate-pulse" />
                  <div className="flex-1">
                    <div className="h-3 bg-gray-200 rounded w-3/4 mb-1 animate-pulse" />
                    <div className="h-2 bg-gray-100 rounded w-1/2 animate-pulse" />
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Install Guide Section */}
        <div className="mt-16">
          <h2 className="text-2xl font-bold text-gray-900 text-center mb-2">Install Guide</h2>

          {/* Tabs */}
          <div className="flex justify-center gap-8 border-b border-gray-200 mb-8">
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
                {tab.label}
              </button>
            ))}
          </div>

          {/* Tab Content */}
          {activeTab === 'text' && (
            <div className="max-w-2xl mx-auto">
              <h3 className="text-xl font-semibold text-gray-900 mb-6 text-center">Installation Instructions</h3>
              <p className="text-gray-600 text-center mb-8">Follow these simple steps to install the Novee desktop app.</p>

              <div className="space-y-6">
                <div className="flex items-start gap-4">
                  <div className="w-8 h-8 bg-primary rounded-full flex items-center justify-center flex-shrink-0 text-white font-bold">1</div>
                  <div>
                    <h4 className="font-semibold text-gray-900">Download the App</h4>
                    <p className="text-gray-600 text-sm">Click the download button for your operating system ({currentPlatform.name}). The download will begin automatically and save to your default downloads folder.</p>
                  </div>
                </div>

                <div className="flex items-start gap-4">
                  <div className="w-8 h-8 bg-primary rounded-full flex items-center justify-center flex-shrink-0 text-white font-bold">2</div>
                  <div>
                    <h4 className="font-semibold text-gray-900">Run the Installer</h4>
                    <p className="text-gray-600 text-sm">Locate the downloaded file in your downloads folder and double-click to run it. Follow the installation prompts and accept the terms of service when prompted.</p>
                  </div>
                </div>

                <div className="flex items-start gap-4">
                  <div className="w-8 h-8 bg-primary rounded-full flex items-center justify-center flex-shrink-0 text-white font-bold">3</div>
                  <div>
                    <h4 className="font-semibold text-gray-900">Launch & Connect</h4>
                    <p className="text-gray-600 text-sm">Open the Novee app from your desktop or applications folder. Sign in with your Novee account credentials to begin connecting your platforms like Slack and LinkedIn.</p>
                  </div>
                </div>

                <div className="flex items-start gap-4">
                  <div className="w-8 h-8 bg-primary rounded-full flex items-center justify-center flex-shrink-0 text-white font-bold">4</div>
                  <div>
                    <h4 className="font-semibold text-gray-900">Automatic Updates</h4>
                    <p className="text-gray-600 text-sm">The app will automatically keep itself updated with the latest features and security improvements. You&apos;ll receive notifications when updates are available.</p>
                  </div>
                </div>
              </div>

              <div className="text-center mt-8">
                <a href={currentPlatform.downloadUrl} className="btn-primary inline-flex items-center gap-2">
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                  </svg>
                  Download for Desktop
                </a>
              </div>
            </div>
          )}

          {activeTab === 'video' && (
            <div className="max-w-2xl mx-auto text-center">
              <div className="bg-gray-100 rounded-xl aspect-video flex items-center justify-center">
                <div className="text-center">
                  <svg className="w-16 h-16 mx-auto mb-2 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664z" />
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  <p className="text-gray-600">Video walkthrough coming soon</p>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'help' && (
            <div className="max-w-2xl mx-auto text-center">
              <p className="text-gray-600 mb-6">Need help getting started? Schedule a call with our support team.</p>
              <a href="mailto:support@novee.io" className="btn-secondary">
                Schedule a Call
              </a>
            </div>
          )}
        </div>

        {/* FAQ Section */}
        <div className="mt-16">
          <h2 className="text-2xl font-bold text-gray-900 mb-8">Frequently Asked Questions</h2>
          <div className="space-y-4">
            <details className="bg-white rounded-lg border border-gray-200 p-4">
              <summary className="font-medium text-gray-900 cursor-pointer">What platforms does the desktop app connect to?</summary>
              <p className="mt-3 text-gray-600 text-sm">The Novee desktop app currently supports Slack and LinkedIn. We&apos;re actively working on adding more platforms.</p>
            </details>
            <details className="bg-white rounded-lg border border-gray-200 p-4">
              <summary className="font-medium text-gray-900 cursor-pointer">How does the desktop app ensure my data privacy?</summary>
              <p className="mt-3 text-gray-600 text-sm">Your credentials are stored locally on your device using secure encryption. We never store your platform passwords on our servers.</p>
            </details>
            <details className="bg-white rounded-lg border border-gray-200 p-4">
              <summary className="font-medium text-gray-900 cursor-pointer">Do I still need LinkedIn Sales Navigator?</summary>
              <p className="mt-3 text-gray-600 text-sm">No, Novee works with your regular LinkedIn account. Sales Navigator is not required.</p>
            </details>
          </div>
        </div>

        {/* Bottom CTA */}
        <div className="text-center mt-12">
          <a href={currentPlatform.downloadUrl} className="btn-primary inline-flex items-center gap-2">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
            </svg>
            Download for Desktop
          </a>
        </div>
      </main>

      {/* Footer */}
      <footer className="border-t border-gray-200 py-8 mt-12 bg-white">
        <div className="max-w-4xl mx-auto px-6 flex items-center justify-between text-sm text-gray-500">
          <span>&copy; 2026 Novee. All rights reserved.</span>
          <nav className="flex items-center gap-6">
            <Link href="/privacy" className="hover:text-gray-900 transition-colors">Privacy</Link>
            <Link href="/terms" className="hover:text-gray-900 transition-colors">Terms</Link>
            <Link href="/support" className="hover:text-gray-900 transition-colors">Support</Link>
          </nav>
        </div>
      </footer>
    </div>
  );
}
