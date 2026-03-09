'use client';

import { useState, useRef } from 'react';

interface Speaker {
  id: string;
  name: string;
  party?: string;
  title?: string;
  state?: string;
  connections: string[];
}

interface SpeakerNetworkProps {
  speakers: Speaker[];
  className?: string;
}

export default function SpeakerNetwork({ speakers, className = '' }: SpeakerNetworkProps) {
  const [selectedSpeaker, setSelectedSpeaker] = useState<string | null>(null);
  const [hoveredSpeaker, setHoveredSpeaker] = useState<string | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  const getPartyColor = (party?: string) => {
    if (!party) return 'bg-gray-400';
    switch (party.toUpperCase()) {
      case 'D': return 'bg-blue-500';
      case 'R': return 'bg-red-500';
      case 'I': return 'bg-purple-500';
      default: return 'bg-gray-400';
    }
  };

  const getSpeakerConnections = (speakerId: string) => {
    const speaker = speakers.find(s => s.id === speakerId);
    if (!speaker) return [];
    return speaker.connections;
  };

  const getConnectionStrength = (speaker1: Speaker, speaker2: Speaker) => {
    // Calculate connection strength based on shared appearances, topics, etc.
    const sharedConnections = speaker1.connections.filter(id => 
      speaker2.connections.includes(id)
    ).length;
    return Math.min(sharedConnections * 2, 5); // 1-5 strength
  };

  return (
    <div className={`bg-white rounded-lg shadow p-6 ${className}`}>
      <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
        <span className="mr-2">🕸️</span>
        Speaker Network
      </h3>
      
      <div className="mb-4">
        <p className="text-sm text-gray-600">
          Click on a speaker to see their connections and relationships.
        </p>
      </div>

      {/* Network Visualization */}
      <div 
        ref={containerRef}
        className="relative w-full h-64 bg-gray-50 rounded-lg border border-gray-200 overflow-hidden"
      >
        {speakers.map((speaker, index) => {
          const totalSpeakers = speakers.length;
          const angle = (index / totalSpeakers) * 2 * Math.PI;
          const radius = 80;
          const centerX = 150;
          const centerY = 120;
          const x = centerX + radius * Math.cos(angle);
          const y = centerY + radius * Math.sin(angle);
          
          const isSelected = selectedSpeaker === speaker.id;
          const isHovered = hoveredSpeaker === speaker.id;
          const connections = getSpeakerConnections(speaker.id);

          return (
            <div key={speaker.id}>
              {/* Connection Lines */}
              {isSelected && connections.map(connectionId => {
                const connectedSpeaker = speakers.find(s => s.id === connectionId);
                if (!connectedSpeaker) return null;
                
                const connIndex = speakers.findIndex(s => s.id === connectionId);
                const connAngle = (connIndex / totalSpeakers) * 2 * Math.PI;
                const connX = centerX + radius * Math.cos(connAngle);
                const connY = centerY + radius * Math.sin(connAngle);
                const strength = getConnectionStrength(speaker, connectedSpeaker);
                
                return (
                  <svg
                    key={`${speaker.id}-${connectionId}`}
                    className="absolute inset-0 pointer-events-none"
                    style={{ zIndex: 1 }}
                  >
                    <line
                      x1={x}
                      y1={y}
                      x2={connX}
                      y2={connY}
                      stroke={getPartyColor(speaker.party).replace('bg-', '').replace('-500', '')}
                      strokeWidth={strength}
                      strokeOpacity="0.6"
                      strokeDasharray={strength > 3 ? "none" : "5,5"}
                    />
                  </svg>
                );
              })}

              {/* Speaker Node */}
              <div
                className={`absolute w-12 h-12 rounded-full border-2 border-white shadow-lg cursor-pointer transition-all duration-200 ${
                  isSelected ? 'scale-125 ring-4 ring-blue-300' : 
                  isHovered ? 'scale-110 ring-2 ring-gray-300' : ''
                }`}
                style={{
                  left: x - 24,
                  top: y - 24,
                  backgroundColor: getPartyColor(speaker.party),
                  zIndex: isSelected ? 10 : 2
                }}
                onClick={() => setSelectedSpeaker(isSelected ? null : speaker.id)}
                onMouseEnter={() => setHoveredSpeaker(speaker.id)}
                onMouseLeave={() => setHoveredSpeaker(null)}
                title={`${speaker.name}${speaker.party ? ` (${speaker.party})` : ''}`}
              >
                <div className="w-full h-full flex items-center justify-center text-white text-xs font-bold">
                  {speaker.name.split(' ').map(n => n[0]).join('').toUpperCase()}
                </div>
              </div>

              {/* Speaker Label */}
              {(isSelected || isHovered) && (
                <div
                  className="absolute bg-white border border-gray-200 rounded px-2 py-1 text-xs shadow-lg whitespace-nowrap"
                  style={{
                    left: x + 20,
                    top: y - 10,
                    zIndex: 20
                  }}
                >
                  <div className="font-medium">{speaker.name}</div>
                  {speaker.party && (
                    <div className="text-gray-500">{speaker.party}</div>
                  )}
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Selected Speaker Details */}
      {selectedSpeaker && (() => {
        const speaker = speakers.find(s => s.id === selectedSpeaker);
        const connections = getSpeakerConnections(selectedSpeaker);
        
        if (!speaker) return null;
        
        return (
          <div className="mt-4 p-4 bg-blue-50 rounded-lg border border-blue-200">
            <h4 className="font-semibold text-blue-900 mb-2">
              {speaker.name}
              {speaker.party && (
                <span className={`ml-2 px-2 py-0.5 rounded text-xs font-medium ${getPartyColor(speaker.party)} text-white`}>
                  {speaker.party}
                </span>
              )}
            </h4>
            
            {speaker.title && (
              <p className="text-sm text-blue-700 mb-2">{speaker.title}</p>
            )}
            
            {connections.length > 0 && (
              <div>
                <p className="text-sm text-blue-700 mb-1">Connected to:</p>
                <div className="flex flex-wrap gap-1">
                  {connections.map(connectionId => {
                    const connectedSpeaker = speakers.find(s => s.id === connectionId);
                    if (!connectedSpeaker) return null;
                    
                    return (
                      <span
                        key={connectionId}
                        className="inline-flex items-center px-2 py-1 rounded text-xs bg-white border border-blue-200 text-blue-800"
                      >
                        <span 
                          className={`w-2 h-2 rounded-full mr-1 ${getPartyColor(connectedSpeaker.party)}`}
                        ></span>
                        {connectedSpeaker.name}
                      </span>
                    );
                  })}
                </div>
              </div>
            )}
          </div>
        );
      })()}

      {/* Legend */}
      <div className="mt-4 flex items-center justify-center space-x-4 text-xs text-gray-600">
        <div className="flex items-center space-x-1">
          <div className="w-3 h-3 rounded-full bg-blue-500"></div>
          <span>Democrat</span>
        </div>
        <div className="flex items-center space-x-1">
          <div className="w-3 h-3 rounded-full bg-red-500"></div>
          <span>Republican</span>
        </div>
        <div className="flex items-center space-x-1">
          <div className="w-3 h-3 rounded-full bg-gray-400"></div>
          <span>Independent</span>
        </div>
      </div>
    </div>
  );
} 