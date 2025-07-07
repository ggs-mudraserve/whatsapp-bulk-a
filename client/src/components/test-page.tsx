import React from 'react';

export default function TestPage() {
  return (
    <div className="min-h-screen bg-gray-50 p-8">
      <div className="max-w-4xl mx-auto">
        <div className="bg-white rounded-lg shadow p-8">
          <h1 className="text-3xl font-bold text-green-600 mb-4">✅ Page Rendering Successfully!</h1>
          <p className="text-gray-700 mb-4">
            This test page confirms that React routing and component rendering are working correctly.
          </p>
          <div className="bg-blue-50 p-4 rounded border border-blue-200 mb-4">
            <h2 className="font-semibold text-blue-800 mb-2">Debug Information:</h2>
            <ul className="text-blue-700 space-y-1">
              <li>• Current URL: {window.location.pathname}</li>
              <li>• Component: TestPage</li>
              <li>• Time: {new Date().toLocaleTimeString()}</li>
            </ul>
          </div>
          <div className="bg-yellow-50 p-4 rounded border border-yellow-200">
            <p className="text-yellow-800">
              <strong>Next Step:</strong> Since this basic page works, the issue with the inbox 
              is likely in the specific component logic or API calls, not the routing system.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}