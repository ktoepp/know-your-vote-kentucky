'use client';

import { useState } from 'react';

interface ExpandableSectionProps {
  title: string;
  children: React.ReactNode;
  defaultExpanded?: boolean;
  icon?: string;
  className?: string;
  variant?: 'default' | 'info' | 'warning' | 'success';
}

export default function ExpandableSection({
  title,
  children,
  defaultExpanded = false,
  icon = '📄',
  className = '',
  variant = 'default'
}: ExpandableSectionProps) {
  const [isExpanded, setIsExpanded] = useState(defaultExpanded);

  const getVariantStyles = () => {
    switch (variant) {
      case 'info':
        return 'bg-[var(--bg-tertiary)] border-blue-400 text-[var(--text-primary)]';
      case 'warning':
        return 'bg-[var(--bg-tertiary)] border-yellow-400 text-[var(--text-primary)]';
      case 'success':
        return 'bg-[var(--bg-tertiary)] border-green-400 text-[var(--text-primary)]';
      default:
        return 'bg-[var(--bg-surface)] border-[var(--border)] text-[var(--text-primary)]';
    }
  };

  const getVariantIcon = () => {
    switch (variant) {
      case 'info':
        return 'ℹ️';
      case 'warning':
        return '⚠️';
      case 'success':
        return '✅';
      default:
        return icon;
    }
  };

  return (
    <div className={`border rounded-lg ${getVariantStyles()} ${className}`}>
      <button
        onClick={() => setIsExpanded(!isExpanded)}
        className="w-full px-4 py-3 text-left flex items-center justify-between hover:bg-opacity-80 transition-colors"
      >
        <div className="flex items-center space-x-2">
          <span className="text-lg">{getVariantIcon()}</span>
          <span className="font-medium">{title}</span>
        </div>
        <span className="text-sm">
          {isExpanded ? '▼' : '▶'}
        </span>
      </button>
      
      {isExpanded && (
        <div className="px-4 pb-4 border-t border-current border-opacity-20">
          <div className="pt-3">
            {children}
          </div>
        </div>
      )}
    </div>
  );
} 