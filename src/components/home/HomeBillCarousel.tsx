'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { Box, IconButton, Typography } from '@mui/material';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import type { KYBill, KYLegislatorRoster } from '@/types/kentucky';
import { KYBillCard } from '@/components/bills/KYBillCard';

// Widths chosen so a partial card peeks at the row edge when there is overflow —
// the visual scent that the row scrolls. Matches the browse/search grid card scale.
const CARD_WIDTH = { xs: 300, sm: 340 };

export type HomeBillCarouselProps = {
  title: string;
  bills: KYBill[];
  legislators: KYLegislatorRoster[];
  kind: 'trending' | 'action';
};

/**
 * Horizontal scroll-snap row of bill cards for the home page, reusing the same
 * `KYBillCard` as browse/search so bills look identical everywhere (status +
 * chamber chips, primary sponsors, latest action). The arrow buttons are
 * supplementary — the row scrolls natively (swipe/trackpad/keyboard focus).
 */
export function HomeBillCarousel({ title, bills, legislators, kind }: HomeBillCarouselProps) {
  const scrollerRef = useRef<HTMLDivElement | null>(null);
  const [atStart, setAtStart] = useState(true);
  const [atEnd, setAtEnd] = useState(false);

  const updateEnds = useCallback(() => {
    const el = scrollerRef.current;
    if (!el) return;
    setAtStart(el.scrollLeft <= 4);
    setAtEnd(el.scrollLeft + el.clientWidth >= el.scrollWidth - 4);
  }, []);

  // Initialize + keep the arrow end-states honest across resizes; both arrows
  // disable when everything already fits.
  useEffect(() => {
    updateEnds();
    const el = scrollerRef.current;
    if (!el || typeof ResizeObserver === 'undefined') return;
    const observer = new ResizeObserver(updateEnds);
    observer.observe(el);
    return () => observer.disconnect();
  }, [updateEnds]);

  const scrollByCards = useCallback((direction: 1 | -1) => {
    const el = scrollerRef.current;
    if (!el) return;
    const reduceMotion =
      typeof window !== 'undefined' &&
      window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    el.scrollBy({
      left: direction * Math.max(el.clientWidth * 0.8, 300),
      behavior: reduceMotion ? 'auto' : 'smooth',
    });
  }, []);

  if (bills.length === 0) return null;

  const headingId = `home-bill-carousel-${kind}-heading`;

  return (
    <Box component="section" aria-labelledby={headingId} sx={{ mb: { xs: 6, md: 8 } }}>
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1.5 }}>
        <Typography
          id={headingId}
          variant="h5"
          component="h2"
          fontWeight={700}
          sx={{ minWidth: 0, flexGrow: 1, lineHeight: 1.3 }}
        >
          {title}
        </Typography>
        <Box sx={{ display: { xs: 'none', sm: 'flex' }, gap: 0.5, flexShrink: 0 }}>
          <IconButton
            aria-label={`Scroll ${title} back`}
            size="small"
            onClick={() => scrollByCards(-1)}
            disabled={atStart}
            sx={{ border: 1, borderColor: 'divider' }}
          >
            <ChevronLeft size={18} />
          </IconButton>
          <IconButton
            aria-label={`Scroll ${title} forward`}
            size="small"
            onClick={() => scrollByCards(1)}
            disabled={atEnd}
            sx={{ border: 1, borderColor: 'divider' }}
          >
            <ChevronRight size={18} />
          </IconButton>
        </Box>
      </Box>

      <Box
        ref={scrollerRef}
        component="ul"
        onScroll={updateEnds}
        sx={{
          display: 'flex',
          alignItems: 'stretch',
          gap: 2,
          m: 0,
          p: 0.5,
          listStyle: 'none',
          overflowX: 'auto',
          scrollSnapType: 'x proximity',
          // Keep a keyboard-focused card fully in view when tabbing scrolls the row.
          scrollPaddingInline: '8px',
          WebkitOverflowScrolling: 'touch',
        }}
      >
        {bills.map(bill => (
          <Box
            component="li"
            key={bill.id}
            sx={{ flexShrink: 0, width: CARD_WIDTH, scrollSnapAlign: 'start', display: 'flex', '& > span': { width: '100%' } }}
          >
            <KYBillCard bill={bill} legislators={legislators} />
          </Box>
        ))}
      </Box>
    </Box>
  );
}
