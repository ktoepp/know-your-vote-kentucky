'use client';

import React, { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { canonicalizeKyBillSearchInput } from '@/lib/ky-search-bills';

interface SearchSuggestion {
  id: string;
  type: 'video' | 'speaker' | 'topic' | 'bill' | 'trending' | 'history';
  title: string;
  subtitle?: string;
  icon: string;
  url?: string;
}

interface SearchFilters {
  dateRange: string;
  chamber: string;
  committee: string;
  type: string;
}

interface TrendingTopic {
  id: string;
  title: string;
  count: number;
  category: string;
}

export default function SearchBar({
  placeholder = 'Bills (e.g. HB 23), topics, legislators…',
  showFilters = true,
  className = '',
}: {
  placeholder?: string;
  showFilters?: boolean;
  className?: string;
}) {
  const router = useRouter();
  const [query, setQuery] = useState('');
  const [suggestions, setSuggestions] = useState<SearchSuggestion[]>([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [filters, setFilters] = useState<SearchFilters>({
    dateRange: '',
    chamber: '',
    committee: '',
    type: 'all'
  });
  const [showFiltersPanel, setShowFiltersPanel] = useState(false);
  const [trendingTopics, setTrendingTopics] = useState<TrendingTopic[]>([]);
  const [searchHistory, setSearchHistory] = useState<string[]>([]);
  const searchRef = useRef<HTMLDivElement>(null);

  // Load search history from localStorage
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const history = localStorage.getItem('searchHistory');
      if (history) {
        try {
          const parsedHistory = JSON.parse(history);
          if (Array.isArray(parsedHistory)) {
            setSearchHistory(parsedHistory);
          }
        } catch (error) {
          console.error('Failed to parse search history:', error);
        }
      }
    }
  }, []);

  // Load trending topics
  useEffect(() => {
    loadTrendingTopics();
  }, []);

  const loadTrendingTopics = async () => {
    try {
      const response = await fetch('/api/search/trending');
      if (response.ok) {
        const data = await response.json();
        setTrendingTopics(data.topics || []);
      }
    } catch (error) {
      console.error('Failed to load trending topics:', error);
    }
  };

  const getSuggestions = async (searchQuery: string) => {
    if (!searchQuery.trim()) {
      // Show trending topics and recent searches
      const trendingSuggestions: SearchSuggestion[] = trendingTopics.slice(0, 3).map(topic => ({
        id: `trending-${topic.id}`,
        type: 'trending' as const,
        title: topic.title,
        subtitle: `${topic.count} recent mentions`,
        icon: '🔥'
      }));

      const historySuggestions: SearchSuggestion[] = searchHistory.slice(0, 3).map((term, index) => ({
        id: `history-${index}`,
        type: 'history' as const,
        title: term,
        subtitle: 'Recent search',
        icon: '🕒'
      }));

      setSuggestions([...trendingSuggestions, ...historySuggestions]);
      return;
    }

    setIsLoading(true);
    try {
      const response = await fetch(`/api/search/suggestions?q=${encodeURIComponent(searchQuery)}`);
      if (response.ok) {
        const data = await response.json();
        setSuggestions(data.suggestions || []);
      }
    } catch (error) {
      console.error('Failed to get suggestions:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleInputChange = (value: string) => {
    setQuery(value);
    if (value.trim()) {
      getSuggestions(value);
      setShowSuggestions(true);
    } else {
      setShowSuggestions(true);
      getSuggestions('');
    }
  };

  const handleSearch = (searchQuery?: string) => {
    const finalQuery = searchQuery || query;
    const trimmed = finalQuery.trim();
    if (!trimmed) return;

    const qForNavigation = canonicalizeKyBillSearchInput(trimmed);

    // Save to search history
    const newHistory = [qForNavigation, ...searchHistory.filter((h) => h !== qForNavigation)].slice(0, 10);
    setSearchHistory(newHistory);
    if (typeof window !== 'undefined') {
      localStorage.setItem('searchHistory', JSON.stringify(newHistory));
    }

    // Build search URL with filters
    const params = new URLSearchParams();
    params.set('q', qForNavigation);
    if (filters.dateRange) params.set('dateRange', filters.dateRange);
    if (filters.chamber) params.set('chamber', filters.chamber);
    if (filters.committee) params.set('committee', filters.committee);
    if (filters.type !== 'all') params.set('type', filters.type);

    router.push(`/search?${params.toString()}`);
    setShowSuggestions(false);
  };

  const handleSuggestionClick = (suggestion: SearchSuggestion) => {
    if (suggestion.url) {
      router.push(suggestion.url);
    } else {
      setQuery(suggestion.title);
      handleSearch(suggestion.title);
    }
    setShowSuggestions(false);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleSearch();
    } else if (e.key === 'Escape') {
      setShowSuggestions(false);
    }
  };

  // Close suggestions when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (searchRef.current && !searchRef.current.contains(event.target as Node)) {
        setShowSuggestions(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  return (
    <div ref={searchRef} className={`relative ${className}`}>
      {/* Main Search Input */}
      <div className="relative">
        <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
          <svg className="h-5 w-5 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
          </svg>
        </div>
        
        <input
          type="text"
          value={query}
          onChange={(e) => handleInputChange(e.target.value)}
          onKeyDown={handleKeyDown}
          onFocus={() => setShowSuggestions(true)}
          placeholder={placeholder}
          className="block w-full pl-10 pr-12 py-3 border border-gray-300 rounded-lg leading-5 bg-white placeholder-gray-500 focus:outline-none focus:placeholder-gray-400 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
        />
        
        <div className="absolute inset-y-0 right-0 flex items-center">
          {showFilters && (
            <button
              onClick={() => setShowFiltersPanel(!showFiltersPanel)}
              className="p-2 text-gray-400 hover:text-gray-600 mr-2"
              title="Search filters"
            >
              <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 4a1 1 0 011-1h16a1 1 0 011 1v2.586a1 1 0 01-.293.707l-6.414 6.414a1 1 0 00-.293.707V17l-4 4v-6.586a1 1 0 00-.293-.707L3.293 7.207A1 1 0 013 6.5V4z" />
              </svg>
            </button>
          )}
          
          <button
            onClick={() => handleSearch()}
            className="px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 mr-2"
          >
            Search
          </button>
        </div>
      </div>

      {/* Filters Panel */}
      {showFilters && showFiltersPanel && (
        <div className="absolute top-full left-0 right-0 mt-2 bg-white border border-gray-200 rounded-lg shadow-lg p-4 z-20">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Date Range</label>
              <select
                value={filters.dateRange}
                onChange={(e) => setFilters({ ...filters, dateRange: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="">Any time</option>
                <option value="today">Today</option>
                <option value="week">This week</option>
                <option value="month">This month</option>
                <option value="quarter">This quarter</option>
                <option value="year">This year</option>
              </select>
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Chamber</label>
              <select
                value={filters.chamber}
                onChange={(e) => setFilters({ ...filters, chamber: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="">All chambers</option>
                <option value="house">House</option>
                <option value="senate">Senate</option>
                <option value="joint">Joint</option>
              </select>
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Committee</label>
              <select
                value={filters.committee}
                onChange={(e) => setFilters({ ...filters, committee: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="">All committees</option>
                <option value="appropriations">Appropriations</option>
                <option value="budget">Budget</option>
                <option value="finance">Finance</option>
                <option value="foreign-relations">Foreign Relations</option>
                <option value="judiciary">Judiciary</option>
              </select>
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Type</label>
              <select
                value={filters.type}
                onChange={(e) => setFilters({ ...filters, type: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="all">All types</option>
                <option value="video">Videos</option>
                <option value="speaker">Speakers</option>
                <option value="topic">Topics</option>
                <option value="bill">Bills</option>
              </select>
            </div>
          </div>
        </div>
      )}

      {/* Suggestions Dropdown */}
      {showSuggestions && (
        <div className="absolute top-full left-0 right-0 mt-2 bg-white border border-gray-200 rounded-lg shadow-lg z-30 max-h-96 overflow-y-auto">
          {isLoading ? (
            <div className="p-4 text-center text-gray-500">
              <div className="inline-flex items-center">
                <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-blue-500" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
                Loading suggestions...
              </div>
            </div>
          ) : suggestions.length > 0 ? (
            <div>
              {suggestions.map((suggestion) => (
                <button
                  key={suggestion.id}
                  onClick={() => handleSuggestionClick(suggestion)}
                  className="w-full px-4 py-3 text-left hover:bg-gray-50 focus:bg-gray-50 focus:outline-none border-b border-gray-100 last:border-b-0"
                >
                  <div className="flex items-center space-x-3">
                    <span className="text-lg">{suggestion.icon}</span>
                    <div className="flex-1 min-w-0">
                      <div className="text-sm font-medium text-gray-900 truncate">
                        {suggestion.title}
                      </div>
                      {suggestion.subtitle && (
                        <div className="text-sm text-gray-500 truncate">
                          {suggestion.subtitle}
                        </div>
                      )}
                    </div>
                    {suggestion.type === 'trending' && (
                      <span className="text-xs bg-red-100 text-red-800 px-2 py-1 rounded-full">
                        Trending
                      </span>
                    )}
                  </div>
                </button>
              ))}
            </div>
          ) : query.trim() ? (
            <div className="p-4 text-center text-gray-500">
              No suggestions found for &ldquo;{query}&rdquo;
            </div>
          ) : null}
        </div>
      )}
    </div>
  );
} 