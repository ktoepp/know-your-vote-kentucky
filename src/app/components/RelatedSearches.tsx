'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';

interface RelatedSearch {
  id: string;
  query: string;
  type: 'related' | 'popular' | 'trending';
  count?: number;
  category?: string;
}

interface RelatedSearchesProps {
  currentQuery: string;
  className?: string;
}

export default function RelatedSearches({ currentQuery, className = "" }: RelatedSearchesProps) {
  const router = useRouter();
  const [relatedSearches, setRelatedSearches] = useState<RelatedSearch[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    if (currentQuery.trim()) {
      loadRelatedSearches(currentQuery);
    }
  }, [currentQuery]);

  const loadRelatedSearches = async (query: string) => {
    setIsLoading(true);
    try {
      const response = await fetch(`/api/search/related?q=${encodeURIComponent(query)}`);
      if (response.ok) {
        const data = await response.json();
        setRelatedSearches(data.searches || []);
      }
    } catch (error) {
      console.error('Failed to load related searches:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSearchClick = (searchQuery: string) => {
    router.push(`/search?q=${encodeURIComponent(searchQuery)}`);
  };

  const generateRelatedSearches = (query: string): RelatedSearch[] => {
    const baseQuery = query.toLowerCase();
    const searches: RelatedSearch[] = [];

    // Generate related searches based on common political topics
    if (baseQuery.includes('immigration') || baseQuery.includes('border')) {
      searches.push(
        { id: '1', query: 'Border Security Policy', type: 'related', category: 'immigration' },
        { id: '2', query: 'DACA Program', type: 'related', category: 'immigration' },
        { id: '3', query: 'Asylum Reform', type: 'related', category: 'immigration' }
      );
    }

    if (baseQuery.includes('healthcare') || baseQuery.includes('health')) {
      searches.push(
        { id: '4', query: 'Affordable Care Act', type: 'related', category: 'healthcare' },
        { id: '5', query: 'Medicare Reform', type: 'related', category: 'healthcare' },
        { id: '6', query: 'Prescription Drug Prices', type: 'related', category: 'healthcare' }
      );
    }

    if (baseQuery.includes('climate') || baseQuery.includes('environment')) {
      searches.push(
        { id: '7', query: 'Green New Deal', type: 'related', category: 'environment' },
        { id: '8', query: 'Carbon Tax', type: 'related', category: 'environment' },
        { id: '9', query: 'Renewable Energy', type: 'related', category: 'environment' }
      );
    }

    if (baseQuery.includes('economy') || baseQuery.includes('economic')) {
      searches.push(
        { id: '10', query: 'Inflation Policy', type: 'related', category: 'economy' },
        { id: '11', query: 'Tax Reform', type: 'related', category: 'economy' },
        { id: '12', query: 'Job Creation', type: 'related', category: 'economy' }
      );
    }

    if (baseQuery.includes('voting') || baseQuery.includes('election')) {
      searches.push(
        { id: '13', query: 'Voter ID Laws', type: 'related', category: 'voting' },
        { id: '14', query: 'Mail-in Voting', type: 'related', category: 'voting' },
        { id: '15', query: 'Election Security', type: 'related', category: 'voting' }
      );
    }

    // Add some popular searches
    searches.push(
      { id: '16', query: 'Supreme Court Decisions', type: 'popular', count: 1250 },
      { id: '17', query: 'Budget Negotiations', type: 'popular', count: 890 },
      { id: '18', query: 'Foreign Policy', type: 'popular', count: 756 },
      { id: '19', query: 'Gun Control Legislation', type: 'popular', count: 634 },
      { id: '20', query: 'Education Funding', type: 'popular', count: 521 }
    );

    // Add trending searches
    searches.push(
      { id: '21', query: 'Infrastructure Bill', type: 'trending', count: 2340 },
      { id: '22', query: 'Student Loan Forgiveness', type: 'trending', count: 1890 },
      { id: '23', query: 'Social Security Reform', type: 'trending', count: 1456 }
    );

    return searches.slice(0, 12); // Limit to 12 suggestions
  };

  const searches = relatedSearches.length > 0 ? relatedSearches : generateRelatedSearches(currentQuery);

  const getTypeIcon = (type: string) => {
    switch (type) {
      case 'related': return '🔗';
      case 'popular': return '🔥';
      case 'trending': return '📈';
      default: return '💡';
    }
  };

  const getTypeLabel = (type: string) => {
    switch (type) {
      case 'related': return 'Related';
      case 'popular': return 'Popular';
      case 'trending': return 'Trending';
      default: return 'Suggestion';
    }
  };

  const getTypeColor = (type: string) => {
    switch (type) {
      case 'related': return 'bg-blue-900 text-blue-200';
      case 'popular': return 'bg-orange-900 text-orange-200';
      case 'trending': return 'bg-green-900 text-green-200';
      default: return 'bg-[var(--bg-tertiary)] text-[var(--text-primary)]';
    }
  };

  if (isLoading) {
    return (
      <div className={`bg-[var(--bg-surface)] rounded-lg shadow-sm p-6 ${className}`}>
        <h3 className="text-lg font-semibold text-[var(--text-primary)] mb-4">Related Searches</h3>
        <div className="flex items-center justify-center py-8">
          <div className="inline-flex items-center">
            <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-blue-500" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
            </svg>
            Loading related searches...
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className={`bg-white rounded-lg shadow-sm p-6 ${className}`}>
      <h3 className="text-lg font-semibold text-gray-900 mb-4">People also searched for</h3>
      
      <div className="space-y-3">
        {searches.map((search) => (
          <button
            key={search.id}
            onClick={() => handleSearchClick(search.query)}
            className="w-full text-left p-3 rounded-lg border border-gray-200 hover:border-blue-300 hover:bg-blue-50 transition-colors duration-200 group"
          >
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-3">
                <span className="text-lg">{getTypeIcon(search.type)}</span>
                <div className="flex-1">
                  <div className="font-medium text-gray-900 group-hover:text-blue-600 transition-colors duration-200">
                    {search.query}
                  </div>
                  <div className="flex items-center space-x-2 mt-1">
                    <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${getTypeColor(search.type)}`}>
                      {getTypeLabel(search.type)}
                    </span>
                    {search.count && (
                      <span className="text-xs text-gray-500">
                        {search.count.toLocaleString()} searches
                      </span>
                    )}
                  </div>
                </div>
              </div>
              
              <svg className="w-4 h-4 text-gray-400 group-hover:text-blue-500 transition-colors duration-200" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
              </svg>
            </div>
          </button>
        ))}
      </div>

      <div className="mt-6 pt-4 border-t border-gray-100">
        <p className="text-sm text-gray-500 text-center">
          These suggestions are based on popular searches and related topics. 
          Click any suggestion to explore similar content.
        </p>
      </div>
    </div>
  );
} 