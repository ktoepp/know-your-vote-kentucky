'use client';

import { useState, useRef, useEffect, useLayoutEffect, useCallback, useId } from 'react';
import { createPortal } from 'react-dom';
import { useTooltips } from '@/lib/TooltipContext';
import { useThemeUtils } from './ThemeUtils';

const TOOLTIP_MAX_WIDTH = 'min(28rem, calc(100vw - 1rem))';

interface TooltipProps {
  content: string | React.ReactNode;
  children: React.ReactNode;
  position?: 'top' | 'bottom' | 'left' | 'right';
  className?: string;
  maxWidth?: string;
  delay?: number;
  forceShow?: boolean;
}

export const Tooltip = ({
  content,
  children,
  position = 'top',
  className = '',
  delay = 300,
  forceShow = false,
}: TooltipProps) => {
  const { tooltipsEnabled } = useTooltips();
  const [isVisible, setIsVisible] = useState(false);
  const [placeReady, setPlaceReady] = useState(false);
  const [coords, setCoords] = useState({ top: 0, left: 0 });
  const [showTimeout, setShowTimeout] = useState<ReturnType<typeof setTimeout> | null>(null);
  const triggerRef = useRef<HTMLSpanElement>(null);
  const tooltipRef = useRef<HTMLDivElement>(null);
  const { getSurfaceBackground, getAdaptiveBorder } = useThemeUtils();
  const descId = useId().replace(/:/g, '');

  const shouldShowTooltips = forceShow || tooltipsEnabled;
  const preferTop = position === 'top' || position === 'left' || position === 'right';

  const recompute = useCallback(() => {
    const t = triggerRef.current;
    const p = tooltipRef.current;
    if (!t || !p) return;
    const tr = t.getBoundingClientRect();
    const pr = p.getBoundingClientRect();
    const margin = 8;
    let top: number;
    if (preferTop) {
      top = tr.top - pr.height - margin;
      if (top < 8 && tr.bottom + pr.height + margin <= window.innerHeight - 8) {
        top = tr.bottom + margin;
      } else {
        top = Math.max(8, Math.min(top, window.innerHeight - pr.height - 8));
      }
    } else {
      top = tr.bottom + margin;
      if (top + pr.height > window.innerHeight - 8) {
        top = Math.max(8, tr.top - pr.height - margin);
      }
    }
    let left = tr.left + tr.width / 2 - pr.width / 2;
    left = Math.max(8, Math.min(left, window.innerWidth - pr.width - 8));
    setCoords({ top, left });
    setPlaceReady(true);
  }, [preferTop]);

  const showTooltip = () => {
    if (!shouldShowTooltips) return;
    if (showTimeout) clearTimeout(showTimeout);
    setPlaceReady(false);
    const timeout = setTimeout(() => setIsVisible(true), delay);
    setShowTimeout(timeout);
  };

  const hideTooltip = () => {
    if (showTimeout) {
      clearTimeout(showTimeout);
      setShowTimeout(null);
    }
    setIsVisible(false);
    setPlaceReady(false);
  };

  useLayoutEffect(() => {
    if (!isVisible || !shouldShowTooltips) return;
    let cancelled = false;
    const nudge = (n: number) => {
      if (cancelled) return;
      recompute();
      if (n < 6) {
        requestAnimationFrame(() => nudge(n + 1));
      }
    };
    nudge(0);
    const onMove = () => recompute();
    window.addEventListener('scroll', onMove, true);
    window.addEventListener('resize', onMove);
    return () => {
      cancelled = true;
      window.removeEventListener('scroll', onMove, true);
      window.removeEventListener('resize', onMove);
    };
  }, [isVisible, shouldShowTooltips, recompute, content]);

  useEffect(() => {
    return () => {
      if (showTimeout) clearTimeout(showTimeout);
    };
  }, [showTimeout]);

  const floating =
    typeof document !== 'undefined' &&
    isVisible &&
    shouldShowTooltips &&
    createPortal(
      <div
        ref={tooltipRef}
        id={descId}
        className={`ky-tooltip-surface show animate-fade-in ${className}`.trim()}
        style={{
          position: 'fixed',
          top: coords.top,
          left: coords.left,
          zIndex: 2000,
          maxWidth: TOOLTIP_MAX_WIDTH,
          visibility: placeReady ? 'visible' : 'hidden',
          whiteSpace: 'normal',
          wordBreak: 'break-word',
          overflowWrap: 'break-word',
          backgroundColor: getSurfaceBackground(),
          border: `1px solid ${getAdaptiveBorder('#e2e8f0', '#333333')}`,
          color: 'inherit',
          pointerEvents: 'none',
          boxShadow: '0 4px 6px rgba(0,0,0,0.1)',
        }}
        role="tooltip"
        aria-hidden="false"
      >
        {content}
      </div>,
      document.body,
    );

  return (
    <span
      className="tooltip-container"
      style={{ display: 'inline', position: 'relative', verticalAlign: 'baseline' }}
    >
      <span
        ref={triggerRef}
        onMouseEnter={showTooltip}
        onMouseLeave={hideTooltip}
        onFocus={showTooltip}
        onBlur={hideTooltip}
        className="tooltip-trigger focusable"
        style={{ display: 'inline' }}
        tabIndex={0}
        role="button"
        aria-describedby={isVisible ? descId : undefined}
      >
        {children}
      </span>
      {floating}
    </span>
  );
};

export default Tooltip;
