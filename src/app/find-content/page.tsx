'use client';

import { useState, useEffect } from 'react';

interface DiscoveredContent {
  id: string;
  title: string;
  date: string;
  type: string;
  chamber: string;
  source: 'legislature.ky.gov' | 'lrc.ky.gov' | 'ket.org';
  url?: string;
  description: string;
  contentId?: string;
}

export default function FindContentPage() {
  const [content, setContent] = useState<DiscoveredContent[]>([]);
  const [loading, setLoading] = useState(false);
  const [source, setSource] = useState<'legislature.ky.gov' | 'lrc.ky.gov' | 'both'>('legislature.ky.gov');
  const [days, setDays] = useState(7);
  const [customDateRange, setCustomDateRange] = useState(false);
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [error, setError] = useState<string | null>(null);

  const discoverContent = async () => {
    setLoading(true);
    setError(null);

    try {
      let url = `/api/discover-content?source=${source}&limit=20`;
      
      if (customDateRange && startDate && endDate) {
        // Calculate days between dates for the API
        const start = new Date(startDate);
        const end = new Date(endDate);
        const daysDiff = Math.ceil((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24));
        url += `&days=${daysDiff}`;
      } else {
        url += `&days=${days}`;
      }

      const response = await fetch(url);
      const result = await response.json();

      if (result.success) {
        setContent(result.data);
      } else {
        setError(result.error || 'Failed to discover content');
      }
    } catch {
      setError('Network error occurred');
    } finally {
      setLoading(false);
    }
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    // You could add a toast notification here
  };

  useEffect(() => {
    // Auto-discover content on page load
    discoverContent();
  }, []);

  return (
    <div className="min-h-screen bg-gray-50 p-8">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">
            Find Content IDs
          </h1>
          <p className="text-lg text-gray-600">
            Discover available Kentucky legislative content from official state government sources
          </p>
        </div>

        {/* Discovery Controls */}
        <div className="bg-white rounded-lg shadow p-6 mb-8">
          <h2 className="text-lg font-semibold mb-4">Discovery Settings</h2>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Source
              </label>
              <select
                value={source}
                onChange={(e) => setSource(e.target.value as 'legislature.ky.gov' | 'lrc.ky.gov' | 'both')}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="legislature.ky.gov">KY Legislature</option>
                <option value="lrc.ky.gov">KY LRC</option>
                <option value="ket.org">KET</option>
                <option value="both">All Sources</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Date Range
              </label>
              <select
                value={days}
                onChange={(e) => {
                  if (e.target.value === 'custom') {
                    setCustomDateRange(true);
                  } else {
                    setDays(parseInt(e.target.value));
                    setCustomDateRange(false);
                  }
                }}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value={1}>Last 1 day</option>
                <option value={3}>Last 3 days</option>
                <option value={7}>Last 7 days</option>
                <option value={14}>Last 14 days</option>
                <option value={30}>Last 30 days</option>
                <option value={60}>Last 60 days</option>
                <option value={90}>Last 90 days</option>
                <option value={180}>Last 6 months</option>
                <option value={365}>Last 1 year</option>
                <option value={730}>Last 2 years</option>
                <option value={1095}>Last 3 years</option>
                <option value="custom">Custom Range</option>
              </select>
            </div>

            {customDateRange && (
              <div className="md:col-span-2">
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Custom Date Range
                </label>
                <div className="grid grid-cols-2 gap-2">
                  <input
                    type="date"
                    value={startDate}
                    onChange={(e) => setStartDate(e.target.value)}
                    className="px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="Start Date"
                  />
                  <input
                    type="date"
                    value={endDate}
                    onChange={(e) => setEndDate(e.target.value)}
                    className="px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="End Date"
                  />
                </div>
              </div>
            )}

            <div className="flex items-end">
              <button
                onClick={discoverContent}
                disabled={loading || (customDateRange && (!startDate || !endDate))}
                className={`w-full py-2 px-4 rounded-md font-medium transition-colors ${
                  loading || (customDateRange && (!startDate || !endDate))
                    ? 'bg-gray-300 text-gray-500 cursor-not-allowed'
                    : 'bg-blue-600 text-white hover:bg-blue-700'
                }`}
              >
                {loading ? 'Discovering...' : 'Discover Content'}
              </button>
            </div>
          </div>
          
          {/* Quick Date Presets */}
          <div className="mt-4 pt-4 border-t border-gray-200">
            <h3 className="text-sm font-medium text-gray-700 mb-2">Quick Presets:</h3>
            <div className="flex flex-wrap gap-2">
              {[
                { label: 'This Week', days: 7 },
                { label: 'This Month', days: 30 },
                { label: 'Last 3 Months', days: 90 },
                { label: 'This Year', days: 365 },
                { label: 'Last Session', days: 730 },
                { label: 'All Available', days: 1095 }
              ].map((preset) => (
                <button
                  key={preset.days}
                  onClick={() => {
                    setDays(preset.days);
                    setCustomDateRange(false);
                  }}
                  className="px-3 py-1 text-xs bg-gray-100 text-gray-700 rounded-full hover:bg-gray-200 transition-colors"
                >
                  {preset.label}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Error Display */}
        {error && (
          <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-8">
            <div className="flex">
              <div className="flex-shrink-0">
                <svg className="h-5 w-5 text-red-400" viewBox="0 0 20 20" fill="currentColor">
                  <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                </svg>
              </div>
              <div className="ml-3">
                <h3 className="text-sm font-medium text-red-800">Discovery Error</h3>
                <div className="mt-2 text-sm text-red-700">{error}</div>
              </div>
            </div>
          </div>
        )}

        {/* Content List */}
        <div className="bg-white rounded-lg shadow">
          <div className="px-6 py-4 border-b border-gray-200">
            <h2 className="text-lg font-semibold text-gray-900">
              Available Content ({content.length} items)
            </h2>
          </div>

          {loading ? (
            <div className="p-6">
              <div className="animate-pulse space-y-4">
                {[...Array(5)].map((_, i) => (
                  <div key={i} className="border border-gray-200 rounded-lg p-4">
                    <div className="h-4 bg-gray-200 rounded w-3/4 mb-2"></div>
                    <div className="h-3 bg-gray-200 rounded w-1/2 mb-2"></div>
                    <div className="h-3 bg-gray-200 rounded w-1/3"></div>
                  </div>
                ))}
              </div>
            </div>
          ) : content.length === 0 ? (
            <div className="p-6 text-center">
              <div className="text-gray-400 text-6xl mb-4">🔍</div>
              <h3 className="text-lg font-medium text-gray-900 mb-2">No content found</h3>
              <p className="text-gray-600">
                Try adjusting your discovery settings or check if API keys are configured.
              </p>
            </div>
          ) : (
            <div className="divide-y divide-gray-200">
              {content.map((item) => (
                <div key={item.id} className="p-6 hover:bg-gray-50">
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center space-x-2 mb-2">
                        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                          item.source === 'legislature.ky.gov'
                            ? 'bg-blue-100 text-blue-800' 
                            : item.source === 'lrc.ky.gov'
                              ? 'bg-green-100 text-green-800'
                              : 'bg-purple-100 text-purple-800'
                        }`}>
                          {item.source}
                        </span>
                        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-800">
                          {item.type}
                        </span>
                        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-purple-100 text-purple-800">
                          {item.chamber}
                        </span>
                      </div>
                      
                      <h3 className="text-lg font-medium text-gray-900 mb-1">
                        {item.title}
                      </h3>
                      
                      <div className="text-sm text-gray-600 mb-2">
                        {item.description}
                      </div>
                      
                      <div className="text-sm text-gray-500">
                        Date: {(() => {
                          if (!item.date) return 'N/A';
                          if (item.date.trim() === '') return 'N/A';
                          const date = new Date(item.date);
                          if (isNaN(date.getTime())) {
                            console.log('[FindContent] Invalid date:', item.date);
                            return 'N/A';
                          }
                          return date.toLocaleDateString();
                        })()}
                      </div>
                    </div>

                    <div className="ml-4 flex flex-col space-y-2">
                      <div className="text-sm">
                        <span className="font-medium text-gray-700">Content ID:</span>
                        <div className="flex items-center space-x-2 mt-1">
                          <code className="bg-gray-100 px-2 py-1 rounded text-xs font-mono">
                            {item.id}
                          </code>
                          <button
                            onClick={() => copyToClipboard(item.id)}
                            className="text-blue-600 hover:text-blue-800 text-xs"
                          >
                            Copy
                          </button>
                        </div>
                      </div>

                      <button
                        onClick={() => {
                          const url = `/upload?contentId=${encodeURIComponent(item.contentId || item.id)}&source=${item.source}&contentType=${item.type}&date=${encodeURIComponent(item.date)}`;
                          window.open(url, '_blank');
                        }}
                        className="bg-blue-600 text-white px-3 py-1 rounded text-xs hover:bg-blue-700 transition-colors"
                      >
                        Process This Content
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Instructions */}
        <div className="mt-8 bg-blue-50 border border-blue-200 rounded-lg p-6">
          <h3 className="text-lg font-semibold text-blue-900 mb-3">How to Use Content IDs</h3>
          <div className="space-y-3 text-sm text-blue-800">
            <div>
              <strong>1. Copy the Content ID:</strong> Click the &ldquo;Copy&rdquo; button next to any content ID you want to process.
            </div>
            <div>
              <strong>2. Use in Process Content:</strong> Go to the &ldquo;Process Content&rdquo; page and paste the ID.
            </div>
            <div>
              <strong>3. Select Source:</strong> Choose the correct source (KY Legislature, KY LRC, or KET).
            </div>
            <div>
              <strong>4. Choose Content Type:</strong> Select the appropriate content type (proceedings, hearing, etc.).
            </div>
            <div>
              <strong>5. Process:</strong> Click &ldquo;Process Content&rdquo; to extract and analyze the transcript.
            </div>
          </div>
        </div>
      </div>
    </div>
  );
} 