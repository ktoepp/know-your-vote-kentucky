'use client';

import { useState, useRef, useEffect } from 'react';
import { Typography } from '@mui/material';

interface TermDefinition {
  term: string;
  definition: string;
  category: 'political' | 'legal' | 'procedural' | 'economic';
  example?: string;
}

interface InteractiveTermTooltipProps {
  children: React.ReactNode;
  term: string;
  definition?: string;
  category?: TermDefinition['category'];
  example?: string;
}

const politicalTerms: { [key: string]: TermDefinition } = {
  'filibuster': {
    term: 'filibuster',
    definition: 'A procedural tactic used in the Senate to delay or prevent a vote on a bill by extending debate.',
    category: 'procedural',
    example: 'Senators used a filibuster to block the voting rights bill.'
  },
  'cloture': {
    term: 'cloture',
    definition: 'A procedure to end a filibuster and bring a bill to a vote, requiring 60 votes in the Senate.',
    category: 'procedural',
    example: 'The Senate invoked cloture to end debate on the infrastructure bill.'
  },
  'omnibus': {
    term: 'omnibus',
    definition: 'A bill that combines multiple appropriations or legislative measures into a single package.',
    category: 'procedural',
    example: 'Congress passed an omnibus spending bill to fund the government.'
  },
  'reconciliation': {
    term: 'reconciliation',
    definition: 'A special parliamentary procedure that allows certain budget-related bills to pass with a simple majority.',
    category: 'procedural',
    example: 'The Build Back Better Act was passed through budget reconciliation.'
  },
  'earmark': {
    term: 'earmark',
    definition: 'A provision in legislation that directs funds to a specific project or recipient.',
    category: 'procedural',
    example: 'The bill included an earmark for a new bridge in the senator\'s state.'
  },
  'continuing resolution': {
    term: 'continuing resolution',
    definition: 'A temporary funding measure that maintains current spending levels when Congress hasn\'t passed a budget.',
    category: 'procedural',
    example: 'Congress passed a continuing resolution to avoid a government shutdown.'
  },
  'deficit': {
    term: 'deficit',
    definition: 'The amount by which government spending exceeds revenue in a given year.',
    category: 'economic',
    example: 'The federal deficit reached $3 trillion during the pandemic.'
  },
  'debt ceiling': {
    term: 'debt ceiling',
    definition: 'The maximum amount of money the federal government can borrow to pay its bills.',
    category: 'economic',
    example: 'Congress must raise the debt ceiling to avoid defaulting on obligations.'
  },
  'entitlement': {
    term: 'entitlement',
    definition: 'A government program that provides benefits to eligible individuals, such as Social Security or Medicare.',
    category: 'political',
    example: 'Social Security is the largest entitlement program in the federal budget.'
  },
  'discretionary spending': {
    term: 'discretionary spending',
    definition: 'Government spending that Congress appropriates annually, such as defense and education.',
    category: 'economic',
    example: 'Defense spending accounts for about half of all discretionary spending.'
  }
};

export default function InteractiveTermTooltip({ 
  children, 
  term, 
  definition, 
  category = 'political',
  example 
}: InteractiveTermTooltipProps) {
  const [showTooltip, setShowTooltip] = useState(false);
  const [position, setPosition] = useState({ x: 0, y: 0 });
  const tooltipRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLSpanElement>(null);

  const termData = politicalTerms[term.toLowerCase()] || {
    term,
    definition: definition || 'Definition not available',
    category,
    example
  };

  const getCategoryColor = (cat: TermDefinition['category']) => {
    switch (cat) {
      case 'political': return 'bg-blue-100 text-blue-800 border-blue-200';
      case 'legal': return 'bg-purple-100 text-purple-800 border-purple-200';
      case 'procedural': return 'bg-green-100 text-green-800 border-green-200';
      case 'economic': return 'bg-orange-100 text-orange-800 border-orange-200';
      default: return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  const getCategoryIcon = (cat: TermDefinition['category']) => {
    switch (cat) {
      case 'political': return '🏛️';
      case 'legal': return '⚖️';
      case 'procedural': return '📋';
      case 'economic': return '💰';
      default: return '📝';
    }
  };

  const handleMouseEnter = (e: React.MouseEvent) => {
    const rect = e.currentTarget.getBoundingClientRect();
    setPosition({ x: rect.left, y: rect.bottom + 5 });
    setShowTooltip(true);
  };

  const handleMouseLeave = () => {
    setShowTooltip(false);
  };

  // Close tooltip when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (tooltipRef.current && !tooltipRef.current.contains(event.target as Node)) {
        setShowTooltip(false);
      }
    };

    if (showTooltip) {
      document.addEventListener('mousedown', handleClickOutside);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [showTooltip]);

  return (
    <span className="relative inline-block">
      <span
        ref={triggerRef}
        className="cursor-help border-b border-dotted border-[var(--blue-primary)] text-[var(--blue-primary)] hover:text-[var(--blue-secondary)] transition-colors"
        onMouseEnter={handleMouseEnter}
        onMouseLeave={handleMouseLeave}
      >
        {children}
      </span>
      
      {showTooltip && (
        <div
          ref={tooltipRef}
          className="absolute z-50 w-80 bg-[var(--bg-surface)] border border-[var(--border)] rounded-lg shadow-lg p-4"
          style={{
            left: `${position.x}px`,
            top: `${position.y}px`,
            transform: 'translateX(-50%)'
          }}
        >
          <div className="flex items-start space-x-2 mb-2">
            <span className="text-lg">{getCategoryIcon(termData.category)}</span>
            <div className="flex-1">
              <div className="font-semibold text-[var(--text-primary)] text-sm">{termData.term}</div>
              <span className={`inline-block px-2 py-0.5 rounded text-xs font-medium border ${getCategoryColor(termData.category)}`}>
                {termData.category}
              </span>
            </div>
          </div>
          
          <p className="text-sm text-[var(--text-secondary)] mb-2 leading-relaxed">
            {termData.definition}
          </p>
          
          {termData.example && (
            <div className="bg-[var(--bg-tertiary)] rounded p-2">
              <div className="text-xs font-medium text-[var(--text-tertiary)] mb-1">Example:</div>
              <Typography variant="body2" color="text.secondary" component="span">
                &ldquo;{termData.example}&rdquo;
              </Typography>
            </div>
          )}
          
          <div className="mt-2 pt-2 border-t border-gray-100">
            <button
              onClick={() => {
                // TODO: Add to user's vocabulary list
              }}
              className="text-xs text-[var(--blue-primary)] hover:text-[var(--blue-secondary)]"
            >
              + Add to vocabulary
            </button>
          </div>
        </div>
      )}
    </span>
  );
} 