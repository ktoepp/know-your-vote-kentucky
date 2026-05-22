'use client';

import React, {
  useState,
  useRef,
  useEffect,
  useLayoutEffect,
  useCallback,
  useId,
} from 'react';
import { createPortal } from 'react-dom';
import { useTooltips } from '@/lib/TooltipContext';
import { useThemeUtils } from './ThemeUtils';

const TOOLTIP_MAX_WIDTH = 'min(28rem, calc(100vw - 1rem))';

function composeRefs<T>(...refs: Array<React.Ref<T> | undefined>) {
  return (instance: T | null) => {
    for (const ref of refs) {
      if (!ref) continue;
      if (typeof ref === 'function') ref(instance);
      else (ref as React.MutableRefObject<T | null>).current = instance;
    }
  };
}

function mergeAriaDescribedby(existing: string | undefined, id: string): string {
  if (!existing?.trim()) return id;
  const parts = existing.trim().split(/\s+/);
  return parts.includes(id) ? existing : `${existing} ${id}`;
}

function getDisplayName(type: unknown): string {
  if (typeof type !== 'function' && typeof type !== 'object') return '';
  const t = type as { displayName?: string; name?: string };
  return t.displayName || t.name || '';
}

/** Avoid wrapping native/custom controls in a second tab stop (nested interactive / focus bugs). */
function isInteractiveTooltipChild(el: React.ReactElement): boolean {
  const p = el.props as Record<string, unknown>;
  const { tabIndex, role, href, onClick } = p;
  if (href != null) return true;
  if (typeof onClick === 'function') return true;
  if (role === 'button' || role === 'link') return true;
  if (typeof tabIndex === 'number' && tabIndex >= 0) return true;
  if (typeof el.type === 'string') {
    const tag = el.type.toLowerCase();
    return ['button', 'a', 'input', 'select', 'textarea', 'summary'].includes(tag);
  }
  const dn = getDisplayName(el.type);
  if (/^(Button|IconButton|Chip|Fab|ToggleButton|LoadingButton|Link)$/i.test(dn)) return true;
  const muiName = (el.type as { muiName?: string }).muiName;
  return muiName === 'Button' || muiName === 'IconButton' || muiName === 'Chip';
}

interface TooltipProps {
  content: string | React.ReactNode;
  children: React.ReactNode;
  position?: 'top' | 'bottom' | 'left' | 'right';
  className?: string;
  maxWidth?: string;
  delay?: number;
  forceShow?: boolean;
  /**
   * If set, renders a small "Learn more" affordance inside the tooltip that
   * links to `/glossary#{glossaryKey}`. The tooltip surface becomes hoverable
   * so users can reach the link without it disappearing.
   */
  glossaryKey?: string;
}

export const Tooltip = ({
  content,
  children,
  position = 'top',
  className = '',
  delay = 300,
  forceShow = false,
  glossaryKey,
}: TooltipProps) => {
  const { tooltipsEnabled } = useTooltips();
  const [isVisible, setIsVisible] = useState(false);
  const [placeReady, setPlaceReady] = useState(false);
  const [coords, setCoords] = useState({ top: 0, left: 0 });
  const [showTimeout, setShowTimeout] = useState<ReturnType<typeof setTimeout> | null>(null);
  const hideTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const triggerRef = useRef<HTMLElement | null>(null);
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
    if (hideTimeoutRef.current) {
      clearTimeout(hideTimeoutRef.current);
      hideTimeoutRef.current = null;
    }
    setPlaceReady(false);
    const timeout = setTimeout(() => setIsVisible(true), delay);
    setShowTimeout(timeout);
  };

  const finalizeHide = () => {
    setIsVisible(false);
    setPlaceReady(false);
  };

  const hideTooltip = () => {
    if (showTimeout) {
      clearTimeout(showTimeout);
      setShowTimeout(null);
    }
    if (hideTimeoutRef.current) {
      clearTimeout(hideTimeoutRef.current);
      hideTimeoutRef.current = null;
    }
    if (glossaryKey) {
      // Give the user a short grace period to move the cursor onto the
      // tooltip surface and reach the Learn-more link without it vanishing.
      hideTimeoutRef.current = setTimeout(finalizeHide, 150);
    } else {
      finalizeHide();
    }
  };

  const cancelPendingHide = () => {
    if (hideTimeoutRef.current) {
      clearTimeout(hideTimeoutRef.current);
      hideTimeoutRef.current = null;
    }
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
      if (hideTimeoutRef.current) clearTimeout(hideTimeoutRef.current);
    };
  }, [showTimeout]);

  const childArray = React.Children.toArray(children);
  const soleChild =
    childArray.length === 1 && React.isValidElement(childArray[0])
      ? (childArray[0] as React.ReactElement)
      : null;
  const mergeTrigger = Boolean(soleChild && isInteractiveTooltipChild(soleChild));

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
          pointerEvents: glossaryKey ? 'auto' : 'none',
          boxShadow: '0 4px 6px rgba(0,0,0,0.1)',
        }}
        role="tooltip"
        aria-hidden="false"
        onMouseEnter={glossaryKey ? cancelPendingHide : undefined}
        onMouseLeave={glossaryKey ? finalizeHide : undefined}
      >
        {content}
        {glossaryKey && (
          <div className="ky-tooltip-learn-more">
            <a
              href={`/glossary#${glossaryKey}`}
              className="ky-tooltip-learn-more-link"
              onClick={cancelPendingHide}
            >
              Learn more →
            </a>
          </div>
        )}
      </div>,
      document.body,
    );

  const mergedTrigger =
    mergeTrigger && soleChild
      ? (() => {
          const childProps = soleChild.props as Record<string, unknown>;
          const originalRef = (soleChild as unknown as { ref?: React.Ref<HTMLElement> }).ref;
          return React.cloneElement(soleChild, {
            ...childProps,
            ref: composeRefs(triggerRef, originalRef),
            onMouseEnter: (e: React.MouseEvent) => {
              (childProps.onMouseEnter as React.MouseEventHandler | undefined)?.(e);
              showTooltip();
            },
            onMouseLeave: (e: React.MouseEvent) => {
              (childProps.onMouseLeave as React.MouseEventHandler | undefined)?.(e);
              hideTooltip();
            },
            onFocus: (e: React.FocusEvent) => {
              (childProps.onFocus as React.FocusEventHandler | undefined)?.(e);
              showTooltip();
            },
            onBlur: (e: React.FocusEvent) => {
              (childProps.onBlur as React.FocusEventHandler | undefined)?.(e);
              hideTooltip();
            },
            'aria-describedby': isVisible
              ? mergeAriaDescribedby(childProps['aria-describedby'] as string | undefined, descId)
              : (childProps['aria-describedby'] as string | undefined),
          } as Record<string, unknown>);
        })()
      : null;

  return (
    <span
      className="tooltip-container"
      style={{ display: 'inline', position: 'relative', verticalAlign: 'baseline' }}
    >
      {mergedTrigger ?? (
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
      )}
      {floating}
    </span>
  );
};

export default Tooltip;
