'use client';

import { useCallback, useEffect, useRef, useState, type ReactNode } from 'react';
import NextLink from 'next/link';
import { Box, IconButton, Link as MuiLink, Typography } from '@mui/material';
import CloseIcon from '@mui/icons-material/Close';

interface SeatInfo {
  title: string;
  district: string;
  detail: string;
  href: string;
  /** Anchor point relative to the layer (desktop placement only). */
  x: number;
  y: number;
}

const MARK = '[data-tip-title]';
/** A tap within this many px of a seat dot selects it: dots are smaller than a fingertip. */
const NEAREST_PX = 24;
const CARD_MAX = 300;

function readInfo(el: Element, host: DOMRect): SeatInfo {
  const r = el.getBoundingClientRect();
  return {
    title: el.getAttribute('data-tip-title') ?? '',
    district: el.getAttribute('data-tip-district') ?? '',
    detail: el.getAttribute('data-tip-detail') ?? '',
    href: el.getAttribute('data-tip-href') ?? '',
    x: r.left + r.width / 2 - host.left,
    y: r.top - host.top,
  };
}

/**
 * Interactive layer for the server-rendered election charts. Every mark carries its
 * details as `data-tip-*` attributes, so the SVG itself stays a server component.
 *
 * - Mouse hover or keyboard focus: a light tooltip beside the mark.
 * - Click or tap: a pinned info card with the district link. On phones it docks to the
 *   bottom of the screen (thumb reach, never off-screen); on wider screens it sits by the
 *   mark. Taps near a seat dot pick the nearest dot.
 * - On touch screens, tapping a district that is a link opens the card instead of
 *   navigating; the card's link goes to the district page.
 */
export function ChartTooltipLayer({ children }: { children: ReactNode }) {
  const ref = useRef<HTMLDivElement>(null);
  const cardRef = useRef<HTMLDivElement>(null);
  const selectedRef = useRef<Element | null>(null);
  const pointerTypeRef = useRef<string>('mouse');
  const [hover, setHover] = useState<SeatInfo | null>(null);
  const [pinned, setPinned] = useState<SeatInfo | null>(null);

  const select = useCallback((el: Element | null) => {
    selectedRef.current?.removeAttribute('data-selected');
    selectedRef.current = el;
    el?.setAttribute('data-selected', 'true');
  }, []);

  const unpin = useCallback(() => {
    select(null);
    setPinned(null);
  }, [select]);

  /** The mark under the pointer, or the nearest seat dot within reach of a tap. */
  const findMark = useCallback((target: EventTarget | null, cx: number, cy: number): Element | null => {
    const direct = target instanceof Element ? target.closest(MARK) : null;
    if (direct) return direct;
    const host = ref.current;
    if (!host) return null;
    let best: Element | null = null;
    let bestD = NEAREST_PX;
    host.querySelectorAll(`circle${MARK}`).forEach((c) => {
      const r = c.getBoundingClientRect();
      const d = Math.hypot(r.left + r.width / 2 - cx, r.top + r.height / 2 - cy);
      if (d < bestD) {
        bestD = d;
        best = c;
      }
    });
    return best;
  }, []);

  // Dismiss on Escape or a press outside the charts and the card.
  useEffect(() => {
    if (!pinned) return;
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && unpin();
    const onDown = (e: PointerEvent) => {
      const t = e.target as Node;
      if (!ref.current?.contains(t) && !cardRef.current?.contains(t)) unpin();
    };
    document.addEventListener('keydown', onKey);
    document.addEventListener('pointerdown', onDown);
    return () => {
      document.removeEventListener('keydown', onKey);
      document.removeEventListener('pointerdown', onDown);
    };
  }, [pinned, unpin]);

  const host = () => ref.current?.getBoundingClientRect();

  return (
    <Box
      ref={ref}
      sx={{ position: 'relative' }}
      onPointerDown={(e) => {
        pointerTypeRef.current = e.pointerType;
      }}
      onPointerMove={(e) => {
        if (e.pointerType !== 'mouse') return;
        const el = e.target instanceof Element ? e.target.closest(MARK) : null;
        const box = host();
        setHover(el && box ? readInfo(el, box) : null);
      }}
      onPointerLeave={() => setHover(null)}
      onFocus={(e) => {
        const el = e.target instanceof Element ? e.target.querySelector(MARK) ?? e.target.closest(MARK) : null;
        const box = host();
        setHover(el && box ? readInfo(el, box) : null);
      }}
      onBlur={() => setHover(null)}
      onClick={(e) => {
        const el = findMark(e.target, e.clientX, e.clientY);
        const box = host();
        if (!el || !box) return;
        const touch =
          pointerTypeRef.current !== 'mouse' || window.matchMedia('(hover: none)').matches;
        // With a mouse, a district link just navigates; on touch, show the card first.
        if (el.closest('a') && !touch) return;
        e.preventDefault();
        setHover(null);
        select(el);
        setPinned(readInfo(el, box));
      }}
    >
      {children}

      {hover && !pinned && (
        <Box
          aria-hidden="true"
          sx={{
            position: 'absolute',
            left: hover.x,
            top: hover.y,
            transform: `translate(${hover.x > (ref.current?.clientWidth ?? 0) / 2 ? '-100%' : '0'}, calc(-100% - 10px))`,
            pointerEvents: 'none',
            bgcolor: 'background.paper',
            border: 1,
            borderColor: 'divider',
            borderRadius: 1,
            boxShadow: 2,
            px: 1.25,
            py: 0.75,
            maxWidth: 280,
            zIndex: 2,
          }}
        >
          <SeatText info={hover} />
        </Box>
      )}

      {pinned && (
        <Box
          ref={cardRef}
          role="dialog"
          aria-label={`${pinned.district} details`}
          sx={{
            position: { xs: 'fixed', sm: 'absolute' },
            left: { xs: 12, sm: pinned.x },
            right: { xs: 12, sm: 'auto' },
            bottom: { xs: 'calc(12px + env(safe-area-inset-bottom))', sm: 'auto' },
            top: { xs: 'auto', sm: pinned.y },
            transform: {
              xs: 'none',
              sm: `translate(${pinned.x > (ref.current?.clientWidth ?? 0) - CARD_MAX ? '-100%' : '0'}, calc(-100% - 10px))`,
            },
            width: { sm: 'max-content' },
            maxWidth: { sm: CARD_MAX },
            bgcolor: 'background.paper',
            border: 1,
            borderColor: 'divider',
            borderRadius: 2,
            boxShadow: 6,
            pl: 2,
            pr: 0.5,
            py: 1,
            zIndex: 1300,
            display: 'flex',
            alignItems: 'flex-start',
            gap: 1,
          }}
        >
          <Box sx={{ flex: 1, minWidth: 0, py: 0.5 }}>
            <SeatText info={pinned} />
            {pinned.href && (
              <MuiLink component={NextLink} href={pinned.href} underline="hover" variant="body2" sx={{ display: 'inline-block', mt: 0.75, fontWeight: 600 }}>
                District page →
              </MuiLink>
            )}
          </Box>
          <IconButton aria-label="Close" onClick={unpin} sx={{ width: 44, height: 44, flexShrink: 0 }}>
            <CloseIcon fontSize="small" />
          </IconButton>
        </Box>
      )}
    </Box>
  );
}

/** Name leads (the value), then district and what happened. */
function SeatText({ info }: { info: SeatInfo }) {
  return (
    <>
      <Typography component="span" sx={{ display: 'block', fontSize: 15, fontWeight: 600, color: 'text.primary', lineHeight: 1.3 }}>
        {info.title}
      </Typography>
      <Typography component="span" sx={{ display: 'block', fontSize: 13, color: 'text.secondary' }}>
        {info.district}
      </Typography>
      {info.detail && (
        <Typography component="span" sx={{ display: 'block', fontSize: 13, color: 'text.primary', mt: 0.25 }}>
          {info.detail}
        </Typography>
      )}
    </>
  );
}
