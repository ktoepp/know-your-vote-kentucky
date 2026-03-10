'use client';

import { useState, useRef, useEffect } from 'react';
import { useRouter } from 'next/navigation';

interface SearchResult {
  id: string;
  type: 'video' | 'speaker' | 'topic' | 'bill' | 'event';
  title: string;
  description: string;
  date?: string;
  url?: string;
  metadata?: {
    speakers?: string[];
    topics?: string[];
    bills?: string[];
    summary?: string;
    duration?: number;
    chamber?: string;
    eventType?: string;
    committee?: string;
  };
  relevanceScore: number;
}

interface SearchResultCardProps {
  result: SearchResult;
  onSaveSearch?: (query: string) => void;
  showSaveButton?: boolean;
  onNavigate?: (eventId: string) => void;
  searchContext?: {
    query?: string;
    filters?: Record<string, unknown>;
  };
}

export default function SearchResultCard({ 
  result, 
  onSaveSearch, 
  showSaveButton = true,
  onNavigate,
  searchContext
}: SearchResultCardProps) {
  const [isSaved, setIsSaved] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [showContextMenu, setShowContextMenu] = useState(false);
  const [contextMenuPosition, setContextMenuPosition] = useState({ x: 0, y: 0 });
  const cardRef = useRef<HTMLDivElement>(null);
  const router = useRouter();

  // Mobile touch state
  const [touchStart, setTouchStart] = useState<{ x: number; y: number } | null>(null);
  const [touchEnd, setTouchEnd] = useState<{ x: number; y: number } | null>(null);
  const [showMobileActions, setShowMobileActions] = useState(false);

  // Minimum swipe distance
  const minSwipeDistance = 50;

  const getTypeIcon = (type: string) => {
    switch (type) {
      case 'video': return '🎥';
      case 'event': return '📅';
      case 'speaker': return '👤';
      case 'topic': return '📝';
      case 'bill': return '📜';
      default: return '📄';
    }
  };

  const getTypeColor = (type: string) => {
    switch (type) {
      case 'video': return 'bg-blue-100 text-blue-800';
      case 'event': return 'bg-green-100 text-green-800';
      case 'speaker': return 'bg-green-100 text-green-800';
      case 'topic': return 'bg-purple-100 text-purple-800';
      case 'bill': return 'bg-orange-100 text-orange-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getTypeLabel = (type: string) => {
    switch (type) {
      case 'video': return 'Video';
      case 'event': return 'Event';
      case 'speaker': return 'Speaker';
      case 'topic': return 'Topic';
      case 'bill': return 'Bill';
      default: return 'Result';
    }
  };

  const formatDuration = (seconds?: number) => {
    if (!seconds) return '';
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    if (hours > 0) {
      return `${hours}h ${minutes}m`;
    }
    return `${minutes}m`;
  };

  const formatDate = (dateString?: string) => {
    if (!dateString) return 'N/A';
    
    // Handle empty strings
    if (dateString.trim() === '') return 'N/A';
    
    const date = new Date(dateString);
    
    // Check if date is valid
    if (isNaN(date.getTime())) {
      console.log('[SearchResultCard] Invalid date:', dateString);
      return 'N/A';
    }
    
    return date.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  };

  const handleSaveSearch = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (onSaveSearch) {
      onSaveSearch(result.title);
      setIsSaved(true);
      setTimeout(() => setIsSaved(false), 2000);
    }
  };

  const truncateText = (text: string, maxLength: number) => {
    if (text.length <= maxLength) return text;
    return text.substring(0, maxLength) + '...';
  };

  const handleCardClick = (e: React.MouseEvent) => {
    e.preventDefault();
    
    // Don't navigate if clicking on save button or context menu
    if ((e.target as HTMLElement).closest('button') || showContextMenu) {
      return;
    }

    navigateToEvent();
  };

  const navigateToEvent = () => {
    if (isLoading) return;

    setIsLoading(true);
    
    // Track navigation analytics
    if (typeof window !== 'undefined' && (window as unknown as Record<string, unknown>).gtag) {
      ((window as unknown as Record<string, unknown>).gtag as (command: string, eventName: string, params: Record<string, unknown>) => void)('event', 'event_detail_viewed', {
        event_id: result.id,
        source: 'search',
        context: searchContext,
        timestamp: new Date().toISOString()
      });
    }

    // Call custom navigation handler if provided
    if (onNavigate) {
      onNavigate(result.id);
      setIsLoading(false);
      return;
    }

    // Default navigation behavior
    const eventUrl = `/events/${result.id}`;
    const queryParams = new URLSearchParams();
    
    if (searchContext?.query) {
      queryParams.set('from', 'search');
      queryParams.set('query', searchContext.query);
    }
    
    const finalUrl = queryParams.toString() ? `${eventUrl}?${queryParams.toString()}` : eventUrl;
    
    router.push(finalUrl);
    
    // Reset loading state after navigation
    setTimeout(() => setIsLoading(false), 1000);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      navigateToEvent();
    } else if (e.key === 'Escape') {
      setShowContextMenu(false);
    }
  };

  const handleContextMenu = (e: React.MouseEvent) => {
    e.preventDefault();
    setContextMenuPosition({ x: e.clientX, y: e.clientY });
    setShowContextMenu(true);
  };

  const handleOpenInNewTab = () => {
    const eventUrl = `/events/${result.id}`;
    window.open(eventUrl, '_blank');
    setShowContextMenu(false);
  };

  const handleCopyLink = () => {
    const eventUrl = `${window.location.origin}/events/${result.id}`;
    navigator.clipboard.writeText(eventUrl);
    setShowContextMenu(false);
  };

  // Close context menu when clicking outside
  useEffect(() => {
    const handleClickOutside = () => setShowContextMenu(false);
    if (showContextMenu) {
      document.addEventListener('click', handleClickOutside);
      return () => document.removeEventListener('click', handleClickOutside);
    }
  }, [showContextMenu]);

  // Mobile touch handlers
  const handleTouchStart = (e: React.TouchEvent) => {
    setTouchStart({
      x: e.targetTouches[0].clientX,
      y: e.targetTouches[0].clientY,
    });
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    setTouchEnd({
      x: e.targetTouches[0].clientX,
      y: e.targetTouches[0].clientY,
    });
  };

  const handleTouchEnd = () => {
    if (!touchStart || !touchEnd) return;

    const distanceX = touchStart.x - touchEnd.x;
    const distanceY = touchStart.y - touchEnd.y;
    const isHorizontalSwipe = Math.abs(distanceX) > Math.abs(distanceY);

    if (isHorizontalSwipe && Math.abs(distanceX) > minSwipeDistance) {
      if (distanceX > 0) {
        // Swipe left - show mobile actions
        setShowMobileActions(true);
      } else {
        // Swipe right - hide mobile actions
        setShowMobileActions(false);
      }
    }

    setTouchStart(null);
    setTouchEnd(null);
  };

  // Long press handler for mobile context menu
  const [longPressTimeout, setLongPressTimeout] = useState<NodeJS.Timeout | null>(null);

  const handleLongPress = (e: React.TouchEvent) => {
    const timeout = setTimeout(() => {
      e.preventDefault();
      const touch = e.touches[0];
      setContextMenuPosition({ x: touch.clientX, y: touch.clientY });
      setShowContextMenu(true);
    }, 500);
    setLongPressTimeout(timeout);
  };

  const handleLongPressEnd = () => {
    if (longPressTimeout) {
      clearTimeout(longPressTimeout);
      setLongPressTimeout(null);
    }
  };

  const isEventType = result.type === 'event' || result.type === 'video';

  return (
    <>
      <div 
        ref={cardRef}
        className={`bg-white rounded-lg shadow-sm border border-gray-200 transition-all duration-200 ${
          isEventType 
            ? 'cursor-pointer hover:shadow-lg hover:border-blue-300 hover:scale-[1.02]' 
            : 'hover:shadow-md'
        } ${isLoading ? 'opacity-75 pointer-events-none' : ''}`}
        onClick={isEventType ? handleCardClick : undefined}
        onKeyDown={isEventType ? handleKeyDown : undefined}
        onContextMenu={isEventType ? handleContextMenu : undefined}
        onTouchStart={isEventType ? handleTouchStart : undefined}
        onTouchMove={isEventType ? handleTouchMove : undefined}
        onTouchEnd={isEventType ? handleTouchEnd : undefined}
        onTouchStartCapture={isEventType ? handleLongPress : undefined}
        onTouchEndCapture={isEventType ? handleLongPressEnd : undefined}
        tabIndex={isEventType ? 0 : undefined}
        role={isEventType ? 'button' : undefined}
        aria-label={isEventType ? `View details for ${result.title}` : undefined}
        style={{ touchAction: 'pan-y' }}
      >
        <div className="p-6 relative">
          {/* Loading Overlay */}
          {isLoading && (
            <div className="absolute inset-0 bg-white bg-opacity-75 flex items-center justify-center rounded-lg z-10">
              <div className="flex items-center space-x-2">
                <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-blue-600"></div>
                <span className="text-sm text-gray-600">Loading...</span>
              </div>
            </div>
          )}

          {/* Hover Overlay for Events */}
          {isEventType && (
            <div className="absolute inset-0 bg-blue-50 bg-opacity-0 hover:bg-opacity-10 transition-all duration-200 rounded-lg pointer-events-none flex items-center justify-center">
              <div className="opacity-0 hover:opacity-100 transition-opacity duration-200">
                <span className="text-blue-600 font-medium text-sm">View Full Event</span>
              </div>
            </div>
          )}

          {/* Mobile Action Buttons (shown on swipe) */}
          {showMobileActions && isEventType && (
            <div className="absolute right-0 top-0 bottom-0 bg-blue-500 flex flex-col justify-center items-center gap-2 p-2 rounded-r-lg">
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  navigateToEvent();
                }}
                className="bg-white text-blue-600 p-2 rounded-full shadow-lg"
                title="View Details"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                </svg>
              </button>
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  handleOpenInNewTab();
                }}
                className="bg-white text-blue-600 p-2 rounded-full shadow-lg"
                title="Open in New Tab"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                </svg>
              </button>
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  handleCopyLink();
                }}
                className="bg-white text-blue-600 p-2 rounded-full shadow-lg"
                title="Copy Link"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                </svg>
              </button>
            </div>
          )}

        {/* Header */}
        <div className="flex items-start justify-between mb-4">
          <div className="flex items-center space-x-3">
            <span className="text-2xl">{getTypeIcon(result.type)}</span>
            <div>
              <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getTypeColor(result.type)}`}>
                {getTypeLabel(result.type)}
              </span>
              {result.date && (
                <span className="ml-2 text-sm text-gray-500">
                  {formatDate(result.date)}
                </span>
              )}
            </div>
          </div>
          
          {showSaveButton && (
            <button
              onClick={handleSaveSearch}
              className={`p-2 rounded-md transition-colors duration-200 ${
                isSaved 
                  ? 'bg-green-100 text-green-600' 
                  : 'text-gray-400 hover:text-gray-600 hover:bg-gray-100'
              }`}
              title={isSaved ? 'Search saved!' : 'Save this search'}
                aria-label={isSaved ? 'Search saved!' : 'Save this search'}
            >
              <svg className="h-5 w-5" fill={isSaved ? 'currentColor' : 'none'} viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 5a2 2 0 012-2h10a2 2 0 012 2v16l-7-3.5L5 21V5z" />
              </svg>
            </button>
          )}
        </div>

        {/* Title and Description */}
        <div className="mb-4">
          <h3 className="text-lg font-semibold text-gray-900 mb-2">
                {result.title}
          </h3>
          
          <p className="text-gray-600 text-sm leading-relaxed">
            {truncateText(result.description, 200)}
          </p>
        </div>

        {/* Metadata */}
        <div className="space-y-3">
            {/* Summary snippet for videos/events */}
            {(result.type === 'video' || result.type === 'event') && result.metadata?.summary && (
            <div className="bg-gray-50 rounded-md p-3">
              <p className="text-sm text-gray-700 italic">
                &ldquo;{truncateText(result.metadata.summary, 150)}&rdquo;
              </p>
            </div>
          )}

          {/* Key information */}
          <div className="flex flex-wrap gap-2">
            {result.metadata?.duration && (
              <span className="inline-flex items-center px-2 py-1 rounded-md text-xs bg-gray-100 text-gray-700">
                <svg className="w-3 h-3 mr-1" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM9.555 7.168A1 1 0 008 8v4a1 1 0 001.555.832l3-2a1 1 0 000-1.664l-3-2z" clipRule="evenodd" />
                </svg>
                {formatDuration(result.metadata.duration)}
              </span>
            )}
            
            {result.metadata?.chamber && (
              <span className="inline-flex items-center px-2 py-1 rounded-md text-xs bg-blue-100 text-blue-700">
                {result.metadata.chamber}
              </span>
            )}
            
            {result.metadata?.eventType && (
              <span className="inline-flex items-center px-2 py-1 rounded-md text-xs bg-purple-100 text-purple-700">
                {result.metadata.eventType}
              </span>
            )}

              {result.metadata?.committee && (
                <span className="inline-flex items-center px-2 py-1 rounded-md text-xs bg-indigo-100 text-indigo-700">
                  {result.metadata.committee}
                </span>
              )}
          </div>

          {/* Speakers */}
          {result.metadata?.speakers && result.metadata.speakers.length > 0 && (
            <div>
              <h4 className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-1">
                Speakers
              </h4>
              <div className="flex flex-wrap gap-1">
                {result.metadata.speakers.slice(0, 3).map((speaker, index) => (
                  <span
                    key={index}
                    className="inline-flex items-center px-2 py-1 rounded-md text-xs bg-green-100 text-green-700"
                  >
                    👤 {speaker}
                  </span>
                ))}
                {result.metadata.speakers.length > 3 && (
                  <span className="text-xs text-gray-500">
                    +{result.metadata.speakers.length - 3} more
                  </span>
                )}
              </div>
            </div>
          )}

          {/* Topics */}
          {result.metadata?.topics && result.metadata.topics.length > 0 && (
            <div>
              <h4 className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-1">
                Topics
              </h4>
              <div className="flex flex-wrap gap-1">
                {result.metadata.topics.slice(0, 4).map((topic, index) => (
                  <span
                    key={index}
                    className="inline-flex items-center px-2 py-1 rounded-md text-xs bg-purple-100 text-purple-700"
                  >
                    📝 {topic}
                  </span>
                ))}
                {result.metadata.topics.length > 4 && (
                  <span className="text-xs text-gray-500">
                    +{result.metadata.topics.length - 4} more
                  </span>
                )}
              </div>
            </div>
          )}

          {/* Bills */}
          {result.metadata?.bills && result.metadata.bills.length > 0 && (
            <div>
              <h4 className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-1">
                Related Bills
              </h4>
              <div className="flex flex-wrap gap-1">
                {result.metadata.bills.slice(0, 2).map((bill, index) => (
                  <span
                    key={index}
                    className="inline-flex items-center px-2 py-1 rounded-md text-xs bg-orange-100 text-orange-700"
                  >
                    📜 {bill}
                  </span>
                ))}
                {result.metadata.bills.length > 2 && (
                  <span className="text-xs text-gray-500">
                    +{result.metadata.bills.length - 2} more
                  </span>
                )}
              </div>
            </div>
          )}
        </div>

          {/* Relevance Score and Action */}
        <div className="mt-4 pt-3 border-t border-gray-100">
          <div className="flex items-center justify-between text-xs text-gray-500">
            <span>Relevance: {Math.round(result.relevanceScore * 100)}%</span>
              {isEventType && (
                <span className="text-blue-600 font-medium">
                  View Full Event →
                </span>
            )}
            </div>
          </div>
        </div>
      </div>

      {/* Context Menu */}
      {showContextMenu && (
        <div 
          className="fixed z-50 bg-white rounded-lg shadow-lg border border-gray-200 py-1 min-w-[200px]"
          style={{ 
            left: contextMenuPosition.x, 
            top: contextMenuPosition.y,
            transform: 'translate(-50%, -100%)'
          }}
        >
          <button
            onClick={navigateToEvent}
            className="w-full text-left px-4 py-2 text-sm hover:bg-gray-100 flex items-center"
          >
            <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
            </svg>
            View Details
          </button>
          <button
            onClick={handleOpenInNewTab}
            className="w-full text-left px-4 py-2 text-sm hover:bg-gray-100 flex items-center"
          >
            <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
            </svg>
            Open in New Tab
          </button>
          <button
            onClick={handleCopyLink}
            className="w-full text-left px-4 py-2 text-sm hover:bg-gray-100 flex items-center"
          >
            <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
            </svg>
            Copy Link
          </button>
    </div>
      )}
    </>
  );
} 