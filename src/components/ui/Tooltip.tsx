'use client';

import { useState, useRef, useEffect } from 'react';
import { useTooltips } from '@/lib/TooltipContext';
import { useThemeUtils } from './ThemeUtils';

interface TooltipProps {
  content: string | React.ReactNode;
  children: React.ReactNode;
  position?: 'top' | 'bottom' | 'left' | 'right';
  className?: string;
  maxWidth?: string;
  delay?: number;
  forceShow?: boolean; // Override global setting if needed
}

export const Tooltip = ({ 
  content, 
  children, 
  position = 'top',
  className = '',
  maxWidth = 'max-w-md',
  delay = 300,
  forceShow = false
}: TooltipProps) => {
  const { tooltipsEnabled } = useTooltips();
  const [isVisible, setIsVisible] = useState(false);
  const [actualPosition, setActualPosition] = useState(position);
  const [showTimeout, setShowTimeout] = useState<NodeJS.Timeout | null>(null);
  const tooltipRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLDivElement>(null);
  const { getSurfaceBackground, getAdaptiveBorder } = useThemeUtils();

  // Don't show tooltips if they're globally disabled (unless forced)
  const shouldShowTooltips = forceShow || tooltipsEnabled;

  const showTooltip = () => {
    if (!shouldShowTooltips) return;
    
    if (showTimeout) {
      clearTimeout(showTimeout);
    }
    const timeout = setTimeout(() => setIsVisible(true), delay);
    setShowTimeout(timeout);
  };

  const hideTooltip = () => {
    if (showTimeout) {
      clearTimeout(showTimeout);
      setShowTimeout(null);
    }
    setIsVisible(false);
  };

  // Auto-adjust position if tooltip would go off-screen
  useEffect(() => {
    if (isVisible && tooltipRef.current && triggerRef.current) {
      const tooltip = tooltipRef.current;
      const trigger = triggerRef.current;
      const rect = trigger.getBoundingClientRect();
      const tooltipRect = tooltip.getBoundingClientRect();
      
      let newPosition = position;
      
      if (position === 'top' && rect.top - tooltipRect.height < 10) {
        newPosition = 'bottom';
      } else if (position === 'bottom' && rect.bottom + tooltipRect.height > window.innerHeight - 10) {
        newPosition = 'top';
      } else if (position === 'left' && rect.left - tooltipRect.width < 10) {
        newPosition = 'right';
      } else if (position === 'right' && rect.right + tooltipRect.width > window.innerWidth - 10) {
        newPosition = 'left';
      }
      
      setActualPosition(newPosition);
    }
  }, [isVisible, position]);

  // Cleanup timeout on unmount
  useEffect(() => {
    return () => {
      if (showTimeout) {
        clearTimeout(showTimeout);
      }
    };
  }, [showTimeout]);

  return (
    <div className="tooltip-container">
      <div
        ref={triggerRef}
        onMouseEnter={showTooltip}
        onMouseLeave={hideTooltip}
        onFocus={showTooltip}
        onBlur={hideTooltip}
        className="tooltip-trigger focusable"
        tabIndex={0}
        role="button"
        aria-describedby={isVisible ? "tooltip-content" : undefined}
      >
        {children}
      </div>
      
      {isVisible && shouldShowTooltips && (
        <div
          ref={tooltipRef}
          id="tooltip-content"
          className={`
            tooltip-content ${maxWidth} ${className}
            ${actualPosition === 'top' ? 'bottom-full mb-2' : ''}
            ${actualPosition === 'bottom' ? 'top-full mt-2' : ''}
            ${actualPosition === 'left' ? 'right-full mr-2' : ''}
            ${actualPosition === 'right' ? 'left-full ml-2' : ''}
            show animate-fade-in
          `}
          style={{
            left: actualPosition === 'top' || actualPosition === 'bottom' ? '50%' : undefined,
            top: actualPosition === 'left' || actualPosition === 'right' ? '50%' : undefined,
            transform: (actualPosition === 'top' || actualPosition === 'bottom' ? 'translateX(-50%)' : '') + 
                      (actualPosition === 'left' || actualPosition === 'right' ? 'translateY(-50%)' : ''),
            backgroundColor: getSurfaceBackground(),
            border: `1px solid ${getAdaptiveBorder('#e2e8f0', '#333333')}`,
            color: 'inherit',
            zIndex: 1300
          }}
          role="tooltip"
          aria-hidden="false"
        >
          {content}
          
          {/* Arrow */}
          <div
            className={`
              absolute w-2 h-2 transform rotate-45
              ${actualPosition === 'top' ? 'top-full -mt-1 left-1/2 -translate-x-1/2 border-t border-l' : ''}
              ${actualPosition === 'bottom' ? 'bottom-full -mb-1 left-1/2 -translate-x-1/2 border-b border-r' : ''}
              ${actualPosition === 'left' ? 'left-full -ml-1 top-1/2 -translate-y-1/2 border-l border-b' : ''}
              ${actualPosition === 'right' ? 'right-full -mr-1 top-1/2 -translate-y-1/2 border-r border-t' : ''}
            `}
            style={{
              backgroundColor: getSurfaceBackground(),
              borderColor: getAdaptiveBorder('#e2e8f0', '#333333')
            }}
          />
        </div>
      )}
    </div>
  );
};

export default Tooltip; 