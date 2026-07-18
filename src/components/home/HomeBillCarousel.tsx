'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { Box, IconButton, Paper, Typography } from '@mui/material';
import { alpha } from '@mui/material/styles';
import Link from 'next/link';
import { ChevronLeft, ChevronRight, Gavel, TrendingUp } from 'lucide-react';
import type { KYBill } from '@/types/kentucky';
import { kyBillPath } from '@/lib/ky-bill-slug';
import { BillNumber } from '@/components/bills/BillNumber';
import { billStatusChipLabel, formatKyIsoDateShort } from '@/lib/bill-display';

const HEADER_ICON_BOX = 32;
// Widths chosen so a partial card peeks at the row edge when there is overflow —
// the visual scent that the row scrolls.
const CARD_WIDTH = { xs: 250, sm: 272, md: 300 };

export type HomeBillCarouselProps = {
  title: string;
  caption: string;
  bills: KYBill[];
  kind: 'trending' | 'action';
};

/**
 * Horizontal scroll-snap row of bill cards for the home page. The arrow buttons are
 * supplementary — the row scrolls natively (swipe/trackpad/keyboard focus), and each
 * card is one whole link, matching the HomeCuratedBillList row pattern.
 */
export function HomeBillCarousel({ title, caption, bills, kind }: HomeBillCarouselProps) {
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
      left: direction * Math.max(el.clientWidth * 0.8, 260),
      behavior: reduceMotion ? 'auto' : 'smooth',
    });
  }, []);

  if (bills.length === 0) return null;

  const headingId = `home-bill-carousel-${kind}-heading`;
  const captionId = `home-bill-carousel-${kind}-caption`;
  const Icon = kind === 'trending' ? TrendingUp : Gavel;
  const tone = kind === 'trending' ? 'info' : 'success';

  return (
    <Box component="section" aria-labelledby={headingId} aria-describedby={captionId} sx={{ mb: { xs: 6, md: 8 } }}>
      <Box sx={{ display: 'flex', alignItems: 'flex-start', gap: 1, mb: 1.25 }}>
        <Box
          aria-hidden
          sx={{
            width: HEADER_ICON_BOX,
            height: HEADER_ICON_BOX,
            borderRadius: 1,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            flexShrink: 0,
            mt: 0.15,
            bgcolor: theme => alpha(theme.palette[tone].main, 0.12),
            color: `${tone}.main`,
          }}
        >
          <Icon size={18} strokeWidth={1.75} focusable={false} />
        </Box>
        <Box sx={{ minWidth: 0, flexGrow: 1 }}>
          <Typography id={headingId} variant="subtitle1" fontWeight={700} component="h2" sx={{ lineHeight: 1.3 }}>
            {title}
          </Typography>
          <Typography
            id={captionId}
            variant="caption"
            color="text.secondary"
            component="p"
            sx={{ display: 'block', lineHeight: 1.4, m: 0, mt: 0.25 }}
          >
            {caption}
          </Typography>
        </Box>
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
        {bills.map(bill => {
          const status = billStatusChipLabel(bill.status) || '—';
          const when = formatKyIsoDateShort(bill.last_action_date);
          return (
            <Box component="li" key={bill.id} sx={{ flexShrink: 0, width: CARD_WIDTH, scrollSnapAlign: 'start', display: 'flex' }}>
              <Paper
                component={Link}
                href={kyBillPath(bill)}
                aria-label={`${bill.bill_number}: ${bill.title}. See more about this bill.`}
                variant="outlined"
                sx={{
                  display: 'flex',
                  flexDirection: 'column',
                  width: '100%',
                  p: 2,
                  textDecoration: 'none',
                  color: 'text.primary',
                  borderRadius: 2,
                  transition: 'border-color 0.12s, box-shadow 0.12s',
                  '&:hover': {
                    borderColor: 'primary.light',
                    boxShadow: '0 4px 12px rgba(37, 99, 235, 0.08)',
                  },
                  '&:hover .home-carousel-see-more': { textDecoration: 'underline' },
                }}
              >
                <BillNumber
                  billNumber={bill.bill_number}
                  size="compact"
                  color="primary"
                  sx={{ display: 'block', letterSpacing: 0.02, mb: 0.5 }}
                />
                <Typography
                  variant="body2"
                  sx={{
                    lineHeight: 1.35,
                    mb: 1,
                    display: '-webkit-box',
                    WebkitLineClamp: 2,
                    WebkitBoxOrient: 'vertical',
                    overflow: 'hidden',
                    // Reserve two lines so short titles don't stagger card heights.
                    minHeight: 'calc(2 * 1.35em)',
                  }}
                >
                  {bill.title}
                </Typography>
                <Box sx={{ mt: 'auto' }}>
                  <Typography variant="caption" color="text.secondary" component="p" sx={{ m: 0, lineHeight: 1.4 }}>
                    {status}
                    {when ? ` · ${when}` : ''}
                  </Typography>
                  <Typography
                    className="home-carousel-see-more"
                    variant="caption"
                    color="primary.main"
                    component="p"
                    sx={{ m: 0, mt: 0.25, fontWeight: 600, lineHeight: 1.4 }}
                  >
                    See more →
                  </Typography>
                </Box>
              </Paper>
            </Box>
          );
        })}
      </Box>
    </Box>
  );
}
