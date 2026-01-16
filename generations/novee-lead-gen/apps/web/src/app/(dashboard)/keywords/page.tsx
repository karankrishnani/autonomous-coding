'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useToast } from '@/components/Toast';

interface KeywordGroup {
  id: string;
  user_id: string;
  keywords: string[];
  active: boolean;
  created_at: string;
  updated_at: string;
}

type CategoryType = 'skills' | 'tools' | 'industry';

// Keyword suggestions by category
const keywordSuggestions: Record<CategoryType, string[]> = {
  skills: [
    'React', 'Next.js', 'TypeScript', 'Node.js', 'Python', 'JavaScript',
    'UI/UX Design', 'Product Design', 'Graphic Design', 'Motion Graphics',
    'Data Analysis', 'Machine Learning', 'DevOps', 'Cloud Architecture',
    'Mobile Development', 'iOS Development', 'Android Development',
    'Full Stack', 'Frontend', 'Backend', 'API Development',
    'Database Design', 'System Architecture', 'Technical Writing'
  ],
  tools: [
    'Figma', 'Sketch', 'Adobe XD', 'Photoshop', 'Illustrator',
    'AWS', 'Google Cloud', 'Azure', 'Docker', 'Kubernetes',
    'PostgreSQL', 'MongoDB', 'Redis', 'GraphQL', 'REST API',
    'Git', 'GitHub', 'GitLab', 'Jira', 'Notion',
    'Vercel', 'Netlify', 'Heroku', 'Firebase'
  ],
  industry: [
    'SaaS', 'E-commerce', 'Fintech', 'Healthcare', 'EdTech',
    'Real Estate', 'Marketing', 'Advertising', 'Media', 'Entertainment',
    'Startup', 'Enterprise', 'B2B', 'B2C', 'Marketplace',
    'AI/ML', 'Blockchain', 'Web3', 'IoT', 'Cybersecurity'
  ]
};

export default function KeywordsPage() {
  const [keywordGroups, setKeywordGroups] = useState<KeywordGroup[]>([]);
  const [allKeywords, setAllKeywords] = useState<string[]>([]);
  const [newKeyword, setNewKeyword] = useState('');
  const [pendingKeywords, setPendingKeywords] = useState<string[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [isClearing, setIsClearing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [showClearConfirm, setShowClearConfirm] = useState(false);
  const [activeCategory, setActiveCategory] = useState<CategoryType>('skills');
  const [showAllSuggestions, setShowAllSuggestions] = useState(false);
  const [showUnsavedWarning, setShowUnsavedWarning] = useState(false);
  const [pendingNavigation, setPendingNavigation] = useState<string | null>(null);

  const router = useRouter();
  const { addToast } = useToast();

  // Number of suggestions to show initially
  const INITIAL_SUGGESTIONS_COUNT = 8;

  // Ref for tracking in-flight requests (prevents double-submit)
  const isSavingRef = useRef(false);
  const isClearingRef = useRef(false);

  // Check if there are unsaved changes
  const hasUnsavedChanges = pendingKeywords.length > 0;

  // Handle browser beforeunload event for unsaved changes
  useEffect(() => {
    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      if (hasUnsavedChanges) {
        e.preventDefault();
        e.returnValue = 'You have unsaved changes. Are you sure you want to leave?';
        return e.returnValue;
      }
    };

    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => window.removeEventListener('beforeunload', handleBeforeUnload);
  }, [hasUnsavedChanges]);

  // Intercept all link clicks when there are unsaved changes
  useEffect(() => {
    if (!hasUnsavedChanges) return;

    const handleClick = (e: MouseEvent) => {
      const target = e.target as HTMLElement;
      const link = target.closest('a');

      if (link && link.href) {
        const url = new URL(link.href);
        // Only intercept internal navigation (same origin) and different pages
        if (url.origin === window.location.origin && url.pathname !== '/keywords') {
          e.preventDefault();
          e.stopPropagation();
          setPendingNavigation(url.pathname);
          setShowUnsavedWarning(true);
        }
      }
    };

    // Use capture phase to intercept before other handlers
    document.addEventListener('click', handleClick, true);
    return () => document.removeEventListener('click', handleClick, true);
  }, [hasUnsavedChanges]);

  // Navigation handler that shows warning for unsaved changes
  const handleNavigation = useCallback((href: string) => {
    if (hasUnsavedChanges) {
      setPendingNavigation(href);
      setShowUnsavedWarning(true);
    } else {
      router.push(href);
    }
  }, [hasUnsavedChanges, router]);

  // Confirm navigation (discard changes)
  const confirmNavigation = useCallback(() => {
    if (pendingNavigation) {
      setPendingKeywords([]);
      setShowUnsavedWarning(false);
      router.push(pendingNavigation);
      setPendingNavigation(null);
    }
  }, [pendingNavigation, router]);

  // Cancel navigation (stay on page)
  const cancelNavigation = useCallback(() => {
    setShowUnsavedWarning(false);
    setPendingNavigation(null);
  }, []);

  // Fetch keywords on mount
  useEffect(() => {
    fetchKeywords();
  }, []);

  const fetchKeywords = async () => {
    try {
      setIsLoading(true);
      const response = await fetch('/api/keywords');
      if (!response.ok) {
        throw new Error('Failed to fetch keywords');
      }
      const data = await response.json();
      setKeywordGroups(data.keyword_groups || []);
      setAllKeywords(data.all_keywords || []);
    } catch (err) {
      // Handle network errors with user-friendly message
      if (err instanceof TypeError && err.message === 'Failed to fetch') {
        setError('Unable to connect to the server. Please check your internet connection and try again.');
      } else {
        setError(err instanceof Error ? err.message : 'Failed to load keywords');
      }
    } finally {
      setIsLoading(false);
    }
  };

  const handleAddPendingKeyword = () => {
    const trimmed = newKeyword.trim();
    if (trimmed.length < 2 || trimmed.length > 50) {
      setError('Keywords must be 2-50 characters');
      return;
    }
    if (pendingKeywords.includes(trimmed) || allKeywords.includes(trimmed)) {
      setError('Keyword already added');
      return;
    }
    setPendingKeywords([...pendingKeywords, trimmed]);
    setNewKeyword('');
    setError(null);
  };

  const handleAddSuggestion = (keyword: string) => {
    if (pendingKeywords.includes(keyword) || allKeywords.includes(keyword)) {
      return; // Already added
    }
    setPendingKeywords([...pendingKeywords, keyword]);
    setError(null);
  };

  const handleRemovePendingKeyword = (keyword: string) => {
    setPendingKeywords(pendingKeywords.filter(k => k !== keyword));
  };

  const handleSaveKeywords = async () => {
    // Prevent double-submit using ref (synchronous check)
    if (isSavingRef.current) {
      return;
    }

    if (pendingKeywords.length === 0) {
      setError('Add at least one keyword');
      return;
    }

    try {
      // Set ref immediately (synchronous) to prevent double-click
      isSavingRef.current = true;
      setIsSaving(true);
      setError(null);
      const response = await fetch('/api/keywords', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ keywords: pendingKeywords }),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Failed to save keywords');
      }

      // Refresh keywords list
      await fetchKeywords();
      setPendingKeywords([]);
      setShowForm(false);
      addToast('Keywords saved successfully!', 'success');
    } catch (err) {
      // Handle network errors with user-friendly message
      if (err instanceof TypeError && err.message === 'Failed to fetch') {
        setError('Unable to connect to the server. Please check your internet connection and try again.');
      } else {
        setError(err instanceof Error ? err.message : 'Failed to save keywords');
      }
    } finally {
      isSavingRef.current = false;
      setIsSaving(false);
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      handleAddPendingKeyword();
    }
  };

  const handleClearAllKeywords = async () => {
    // Prevent double-submit using ref (synchronous check)
    if (isClearingRef.current) {
      return;
    }

    try {
      // Set ref immediately (synchronous) to prevent double-click
      isClearingRef.current = true;
      setIsClearing(true);
      setError(null);
      const response = await fetch('/api/keywords', {
        method: 'DELETE',
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Failed to clear keywords');
      }

      // Refresh keywords list
      await fetchKeywords();
      setShowClearConfirm(false);
      addToast('All keywords cleared successfully!', 'success');
    } catch (err) {
      // Handle network errors with user-friendly message
      if (err instanceof TypeError && err.message === 'Failed to fetch') {
        setError('Unable to connect to the server. Please check your internet connection and try again.');
      } else {
        setError(err instanceof Error ? err.message : 'Failed to clear keywords');
      }
      setShowClearConfirm(false);
    } finally {
      isClearingRef.current = false;
      setIsClearing(false);
    }
  };

  const [deletingKeyword, setDeletingKeyword] = useState<string | null>(null);

  const handleDeleteKeyword = async (keyword: string) => {
    if (deletingKeyword) {
      return; // Prevent concurrent deletions
    }

    try {
      setDeletingKeyword(keyword);
      setError(null);

      const response = await fetch('/api/keywords', {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ keyword }),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Failed to delete keyword');
      }

      // Refresh keywords list
      await fetchKeywords();
      addToast(`Keyword "${keyword}" deleted`, 'success');
    } catch (err) {
      if (err instanceof TypeError && err.message === 'Failed to fetch') {
        setError('Unable to connect to the server. Please check your internet connection and try again.');
      } else {
        setError(err instanceof Error ? err.message : 'Failed to delete keyword');
      }
    } finally {
      setDeletingKeyword(null);
    }
  };

  const categories: { id: CategoryType; label: string }[] = [
    { id: 'skills', label: 'Skills' },
    { id: 'tools', label: 'Tools' },
    { id: 'industry', label: 'Industry' },
  ];

  if (isLoading) {
    return (
      <div className="max-w-4xl">
        <div className="mb-8">
          <h1 className="text-2xl font-bold text-gray-900">Keywords</h1>
          <p className="text-gray-600 mt-1">Loading...</p>
        </div>
      </div>
    );
  }

  const hasKeywords = allKeywords.length > 0;

  return (
    <div className="max-w-4xl">
      {/* Page Header */}
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-gray-900">Keywords</h1>
        <p className="text-gray-600 mt-1">
          Set up keywords to find relevant leads from your connected platforms.
        </p>
      </div>

      {/* Error Display */}
      {error && (
        <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm flex items-center gap-2" role="alert">
          <svg className="w-5 h-5 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20" aria-hidden="true">
            <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
          </svg>
          <span>{error}</span>
        </div>
      )}

      {/* Keywords Display */}
      {hasKeywords && !showForm && (
        <div className="card mb-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold text-gray-900">Your Keywords</h2>
            <div className="flex gap-2">
              <button
                onClick={() => setShowForm(true)}
                className="btn-secondary text-sm"
              >
                Add More
              </button>
              <button
                onClick={() => setShowClearConfirm(true)}
                className="px-3 py-1.5 text-sm text-red-600 hover:text-red-700 hover:bg-red-50 rounded-lg transition-colors"
              >
                Clear All
              </button>
            </div>
          </div>
          <div className="flex flex-wrap gap-2">
            {allKeywords.map((keyword) => (
              <span
                key={keyword}
                className="px-3 py-1 bg-blue-100 text-blue-800 rounded-full text-sm font-medium flex items-center gap-1"
              >
                {keyword}
                <button
                  onClick={() => handleDeleteKeyword(keyword)}
                  disabled={deletingKeyword === keyword}
                  className="ml-1 hover:text-blue-900 disabled:opacity-50"
                  aria-label={`Delete ${keyword}`}
                >
                  {deletingKeyword === keyword ? '...' : '×'}
                </button>
              </span>
            ))}
          </div>
          <p className="text-gray-500 text-sm mt-4">
            {keywordGroups.length} keyword group(s), {allKeywords.length} unique keyword(s)
          </p>
        </div>
      )}

      {/* Add Keywords Form */}
      {(showForm || !hasKeywords) && (
        <div className="card mb-6">
          <div className="flex items-center gap-2 mb-4">
            <h2 className="text-lg font-semibold text-gray-900">
              {hasKeywords ? 'Add More Keywords' : 'Add Your First Keywords'}
            </h2>
            {/* Help Icon with Tooltip */}
            <div className="relative group">
              <button
                type="button"
                className="text-gray-400 hover:text-gray-600 transition-colors"
                aria-label="Keyword best practices"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </button>
              {/* Tooltip */}
              <div className="absolute left-0 top-full mt-2 w-64 p-3 bg-gray-900 text-white text-sm rounded-lg shadow-lg opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-150 z-10">
                <p className="font-medium mb-2">Keyword Best Practices:</p>
                <ul className="list-disc list-inside space-y-1 text-gray-300">
                  <li>Use 2-50 characters per keyword</li>
                  <li>Be specific (e.g., "React" not "coding")</li>
                  <li>Include skills, tools, and industries</li>
                  <li>Add variations (e.g., "React", "ReactJS")</li>
                </ul>
                <div className="absolute -top-1 left-2 w-2 h-2 bg-gray-900 rotate-45"></div>
              </div>
            </div>
          </div>

          {/* Input Field */}
          <div className="flex gap-2 mb-4">
            <input
              type="text"
              value={newKeyword}
              onChange={(e) => setNewKeyword(e.target.value)}
              onKeyPress={handleKeyPress}
              placeholder="Enter a keyword (e.g., React, UX Design)"
              className="input-field flex-1"
              maxLength={50}
            />
            <button
              onClick={handleAddPendingKeyword}
              className="btn-secondary"
              disabled={!newKeyword.trim()}
            >
              Add
            </button>
          </div>

          {/* Pending Keywords */}
          {pendingKeywords.length > 0 && (
            <div className="mb-4">
              <p className="text-sm text-gray-600 mb-2">Keywords to save:</p>
              <div className="flex flex-wrap gap-2">
                {pendingKeywords.map((keyword) => (
                  <span
                    key={keyword}
                    className="px-3 py-1 bg-green-100 text-green-800 rounded-full text-sm font-medium flex items-center gap-1"
                  >
                    {keyword}
                    <button
                      onClick={() => handleRemovePendingKeyword(keyword)}
                      className="hover:text-green-900"
                      aria-label={`Remove ${keyword}`}
                    >
                      &times;
                    </button>
                  </span>
                ))}
              </div>
            </div>
          )}

          {/* Actions */}
          <div className="flex items-center gap-2">
            <button
              onClick={handleSaveKeywords}
              disabled={pendingKeywords.length === 0 || isSaving}
              className="btn-primary"
            >
              {isSaving ? 'Saving...' : 'Save Keywords'}
            </button>
            {hasKeywords && (
              <button
                onClick={() => {
                  setShowForm(false);
                  setPendingKeywords([]);
                  setError(null);
                }}
                className="btn-tertiary"
              >
                Cancel
              </button>
            )}
            {!hasKeywords && (
              <Link
                href="/leads"
                className="text-sm text-gray-500 hover:text-gray-700 transition-colors ml-2"
              >
                Skip for now
              </Link>
            )}
          </div>
        </div>
      )}

      {/* Keyword Suggestions */}
      {(showForm || !hasKeywords) && (
        <div className="card">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Suggested Keywords</h2>

          {/* Category Tabs */}
          <div className="flex gap-4 border-b border-gray-200 mb-4">
            {categories.map((cat) => (
              <button
                key={cat.id}
                onClick={() => setActiveCategory(cat.id)}
                className={`pb-3 px-1 border-b-2 transition-colors ${
                  activeCategory === cat.id
                    ? 'border-primary text-primary font-medium'
                    : 'border-transparent text-gray-500 hover:text-gray-700'
                }`}
              >
                {cat.label}
              </button>
            ))}
          </div>

          {/* Suggestions Grid */}
          <div className="flex flex-wrap gap-2">
            {(showAllSuggestions
              ? keywordSuggestions[activeCategory]
              : keywordSuggestions[activeCategory].slice(0, INITIAL_SUGGESTIONS_COUNT)
            ).map((keyword) => {
              const isAdded = pendingKeywords.includes(keyword) || allKeywords.includes(keyword);
              return (
                <button
                  key={keyword}
                  onClick={() => handleAddSuggestion(keyword)}
                  disabled={isAdded}
                  className={`px-3 py-1.5 rounded-full text-sm transition-colors ${
                    isAdded
                      ? 'bg-gray-100 text-gray-400 cursor-not-allowed'
                      : 'bg-gray-100 text-gray-700 hover:bg-primary hover:text-white'
                  }`}
                >
                  {isAdded ? '✓ ' : '+ '}{keyword}
                </button>
              );
            })}
          </div>

          {/* Show More / Show Less Button */}
          {keywordSuggestions[activeCategory].length > INITIAL_SUGGESTIONS_COUNT && (
            <button
              onClick={() => setShowAllSuggestions(!showAllSuggestions)}
              className="mt-4 text-sm text-primary hover:text-primary-dark font-medium flex items-center gap-1"
            >
              {showAllSuggestions ? (
                <>
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 15l7-7 7 7" />
                  </svg>
                  Show less
                </>
              ) : (
                <>
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                  </svg>
                  Show {keywordSuggestions[activeCategory].length - INITIAL_SUGGESTIONS_COUNT} more
                </>
              )}
            </button>
          )}
        </div>
      )}

      {/* Empty State (only if no keywords and not showing form) */}
      {!hasKeywords && !showForm && (
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
          <button onClick={() => setShowForm(true)} className="btn-primary">
            Add Your First Keyword
          </button>
        </div>
      )}

      {/* Clear All Confirmation Dialog */}
      {showClearConfirm && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg shadow-xl max-w-md w-full mx-4 p-6">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 bg-red-100 rounded-full flex items-center justify-center">
                <svg className="w-5 h-5 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                </svg>
              </div>
              <h3 className="text-lg font-semibold text-gray-900">Clear All Keywords?</h3>
            </div>
            <p className="text-gray-600 mb-6">
              Are you sure you want to delete all {allKeywords.length} keyword(s)? This action cannot be undone.
            </p>
            <div className="flex justify-end gap-3">
              <button
                onClick={() => setShowClearConfirm(false)}
                className="btn-tertiary"
                disabled={isClearing}
              >
                Cancel
              </button>
              <button
                onClick={handleClearAllKeywords}
                disabled={isClearing}
                className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors disabled:opacity-50"
              >
                {isClearing ? 'Clearing...' : 'Yes, Clear All'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Unsaved Changes Warning Dialog */}
      {showUnsavedWarning && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg shadow-xl max-w-md w-full mx-4 p-6">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 bg-yellow-100 rounded-full flex items-center justify-center">
                <svg className="w-5 h-5 text-yellow-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                </svg>
              </div>
              <h3 className="text-lg font-semibold text-gray-900">Unsaved Changes</h3>
            </div>
            <p className="text-gray-600 mb-6">
              You have {pendingKeywords.length} unsaved keyword{pendingKeywords.length === 1 ? '' : 's'}. Are you sure you want to leave? Your changes will be lost.
            </p>
            <div className="flex justify-end gap-3">
              <button
                onClick={cancelNavigation}
                className="btn-tertiary"
              >
                Stay on Page
              </button>
              <button
                onClick={confirmNavigation}
                className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors"
              >
                Leave Without Saving
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
