'use client';

import { useCallback, useRef, useState, type ReactNode } from 'react';
import { Box } from '@mui/material';

interface TipState {
  title: string;
  detail: string;
  x: number;
  y: number;
}

/**
 * Hover + keyboard-focus tooltips for server-rendered SVG charts. Any descendant with
 * `data-tip-title` (and optional `data-tip-detail`) gets a tooltip, so the chart markup
 * itself stays a server component. Tooltips only enhance: every value is also in the
 * seat list below the charts.
 */
export function ChartTooltipLayer({ children }: { children: ReactNode }) {
  const ref = useRef<HTMLDivElement>(null);
  const [tip, setTip] = useState<TipState | null>(null);

  const show = useCallback((target: EventTarget | null, clientX?: number, clientY?: number) => {
    const host = ref.current;
    const el = target instanceof Element ? target.closest<Element>('[data-tip-title]') : null;
    if (!host || !el) {
      setTip(null);
      return;
    }
    const box = host.getBoundingClientRect();
    const r = el.getBoundingClientRect();
    const x = (clientX ?? r.left + r.width / 2) - box.left;
    const y = (clientY ?? r.top) - box.top;
    setTip({
      title: el.getAttribute('data-tip-title') ?? '',
      detail: el.getAttribute('data-tip-detail') ?? '',
      x: Math.max(8, Math.min(x, box.width - 8)),
      y,
    });
  }, []);

  return (
    <Box
      ref={ref}
      sx={{ position: 'relative' }}
      onPointerMove={(e) => show(e.target, e.clientX, e.clientY)}
      onPointerLeave={() => setTip(null)}
      onFocus={(e) => show(e.target)}
      onBlur={() => setTip(null)}
    >
      {children}
      {tip && (
        <Box
          role="status"
          aria-live="polite"
          sx={{
            position: 'absolute',
            left: tip.x,
            top: tip.y,
            transform: `translate(${tip.x > 160 ? '-100%' : '0'}, calc(-100% - 12px))`,
            pointerEvents: 'none',
            bgcolor: 'background.paper',
            border: 1,
            borderColor: 'divider',
            borderRadius: 1,
            boxShadow: 2,
            px: 1.25,
            py: 0.75,
            maxWidth: 260,
            zIndex: 2,
          }}
        >
          <Box component="span" sx={{ display: 'block', fontSize: 14, fontWeight: 600, color: 'text.primary' }}>
            {tip.title}
          </Box>
          {tip.detail && (
            <Box component="span" sx={{ display: 'block', fontSize: 13, color: 'text.secondary' }}>
              {tip.detail}
            </Box>
          )}
        </Box>
      )}
    </Box>
  );
}
