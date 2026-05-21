'use client';

import { Tooltip } from './Tooltip';
import { getTooltipContent } from '@/lib/tooltipContent';

interface ContextualTooltipProps {
  term: string;
  context?: string;
  children: React.ReactNode;
  position?: 'top' | 'bottom' | 'left' | 'right';
  className?: string;
  underline?: boolean;
}

export const ContextualTooltip = ({ 
  term, 
  context, 
  children,
  position = 'top',
  className = '',
  underline = true
}: ContextualTooltipProps) => {
  const baseExplanation = getTooltipContent(term);
  
  if (!baseExplanation) {
    return <>{children}</>;
  }
  
  // Add current context if relevant
  const contextualContent = context ? (
    <div>
      <div className="mb-2">{baseExplanation.content}</div>
      <div className="pt-2 border-t border-gray-600">
        <strong className="text-blue-300">Current Context:</strong> 
        <span className="text-gray-200 ml-1">{context}</span>
      </div>
    </div>
  ) : baseExplanation.content;
  
  const triggerElement = underline ? (
    <span className="underline decoration-dotted cursor-help">
      {children}
    </span>
  ) : children;
  
  return (
    <Tooltip
      content={contextualContent}
      position={position}
      className={className}
      maxWidth="max-w-md"
      glossaryKey={term}
    >
      {triggerElement}
    </Tooltip>
  );
};

export default ContextualTooltip; 