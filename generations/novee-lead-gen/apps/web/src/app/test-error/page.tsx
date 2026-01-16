'use client';

import { useState } from 'react';

function BuggyComponent() {
  // This component will throw an error when rendered
  throw new Error('Test error: This is a deliberate error to test the error boundary.');
}

export default function TestErrorPage() {
  const [showError, setShowError] = useState(false);

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-900 px-4">
      <div className="max-w-md w-full text-center">
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white mb-4">
          Error Boundary Test Page
        </h1>
        <p className="text-gray-600 dark:text-gray-400 mb-6">
          Click the button below to trigger a React rendering error. The error boundary should
          catch it and display a fallback UI.
        </p>

        {showError ? (
          <BuggyComponent />
        ) : (
          <button
            onClick={() => setShowError(true)}
            className="bg-red-600 text-white px-6 py-3 rounded-full font-medium hover:bg-red-700 transition-colors"
            data-testid="trigger-error-button"
          >
            Trigger Error
          </button>
        )}
      </div>
    </div>
  );
}
