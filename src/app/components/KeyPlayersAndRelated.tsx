'use client';

import React from 'react';
import { useRouter } from 'next/navigation';
import { Typography } from '@mui/material';

interface KeyPlayer {
  name: string;
  role: string;
  party?: string;
  state?: string;
  keyStatements?: string[];
}

interface RelatedContent {
  id: string;
  title: string;
  date: string;
  type: string;
  connectionType: string;
  similarityScore?: number;
}

interface KeyPlayersAndRelatedProps {
  keyPlayers: KeyPlayer[];
  relatedContent: RelatedContent[];
  onContentClick?: (contentId: string) => void;
  className?: string;
}

export default function KeyPlayersAndRelated({
  keyPlayers,
  relatedContent,
  onContentClick,
  className = ''
}: KeyPlayersAndRelatedProps) {
  const router = useRouter();

  const handleContentClick = (contentId: string) => {
    if (onContentClick) {
      onContentClick(contentId);
    } else {
      router.push(`/video/${contentId}`);
    }
  };

  const getPartyColor = (party?: string) => {
    if (!party) return 'bg-gray-100 text-gray-800';
    switch (party.toLowerCase()) {
      case 'd':
      case 'democrat':
        return 'bg-blue-100 text-blue-800';
      case 'r':
      case 'republican':
        return 'bg-red-100 text-red-800';
      case 'i':
      case 'independent':
        return 'bg-purple-100 text-purple-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const getConnectionColor = (type: string) => {
    switch (type.toLowerCase()) {
      case 'speaker':
        return 'bg-orange-100 text-orange-800';
      case 'topic':
        return 'bg-green-100 text-green-800';
      case 'bill':
        return 'bg-purple-100 text-purple-800';
      case 'committee':
        return 'bg-blue-100 text-blue-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  return (
    <div className={`grid grid-cols-1 lg:grid-cols-2 gap-6 ${className}`}>
      {/* Key Players */}
      <div className="bg-white rounded-lg shadow">
        <div className="px-4 py-3 border-b border-gray-200">
          <h3 className="text-lg font-semibold text-gray-900">Key Players</h3>
          <p className="text-sm text-gray-600">Primary speakers and decision makers</p>
        </div>
        
        <div className="p-4">
          {keyPlayers.length === 0 ? (
            <div className="text-center py-8 text-gray-500">
              <div className="text-2xl mb-2">👥</div>
              <p className="text-sm">No key players identified</p>
            </div>
          ) : (
            <div className="space-y-4">
              {keyPlayers.slice(0, 5).map((player, index) => (
                <div key={index} className="border border-gray-200 rounded-lg p-3">
                  <div className="flex items-start justify-between mb-2">
                    <div className="flex-1">
                      <h4 className="font-medium text-gray-900">{player.name}</h4>
                      <p className="text-sm text-gray-600">{player.role}</p>
                    </div>
                    <div className="flex items-center space-x-2">
                      {player.party && (
                        <span className={`px-2 py-1 rounded-full text-xs font-medium ${getPartyColor(player.party)}`}>
                          {player.party}
                        </span>
                      )}
                      {player.state && (
                        <span className="text-xs text-gray-500">{player.state}</span>
                      )}
                    </div>
                  </div>
                  
                  {player.keyStatements && player.keyStatements.length > 0 && (
                    <div className="mt-2">
                      <p className="text-xs text-gray-500 mb-1">Key statement:</p>
                      <Typography variant="body2" color="text.secondary">
                        &ldquo;{player.keyStatements[0]}&rdquo;
                      </Typography>
                    </div>
                  )}
                </div>
              ))}
              
              {keyPlayers.length > 5 && (
                <div className="text-center pt-2">
                  <span className="text-sm text-gray-500">
                    +{keyPlayers.length - 5} more speakers
                  </span>
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Related Content */}
      <div className="bg-white rounded-lg shadow">
        <div className="px-4 py-3 border-b border-gray-200">
          <h3 className="text-lg font-semibold text-gray-900">Related Content</h3>
          <p className="text-sm text-gray-600">Connected transcripts and documents</p>
        </div>
        
        <div className="p-4">
          {relatedContent.length === 0 ? (
            <div className="text-center py-8 text-gray-500">
              <div className="text-2xl mb-2">🔗</div>
              <p className="text-sm">No related content found</p>
            </div>
          ) : (
            <div className="space-y-3">
              {relatedContent.slice(0, 6).map((content) => (
                <div 
                  key={content.id}
                  className="border border-gray-200 rounded-lg p-3 hover:bg-gray-50 cursor-pointer transition-colors"
                  onClick={() => handleContentClick(content.id)}
                >
                  <div className="flex items-start justify-between mb-2">
                    <h4 className="font-medium text-gray-900 text-sm line-clamp-2 flex-1">
                      {content.title}
                    </h4>
                    <span className={`px-2 py-1 rounded-full text-xs font-medium ml-2 ${getConnectionColor(content.connectionType)}`}>
                      {content.connectionType}
                    </span>
                  </div>
                  
                  <div className="flex items-center justify-between text-xs text-gray-500">
                    <span>{content.date}</span>
                    <span className="capitalize">{content.type}</span>
                    {content.similarityScore && (
                      <span className="text-blue-600">
                        {Math.round(content.similarityScore * 100)}% match
                      </span>
                    )}
                  </div>
                </div>
              ))}
              
              {relatedContent.length > 6 && (
                <div className="text-center pt-2">
                  <span className="text-sm text-gray-500">
                    +{relatedContent.length - 6} more items
                  </span>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
} 