'use client';

import React from 'react';
import { Box } from '@mui/material';
import { useTooltips } from '@/lib/TooltipContext';
import { formatBillLabelText } from '@/lib/bill-display';
import { LegislativeStageTooltip } from '@/components/ui/LegislativeStageTooltip';
import { hasTooltipContent } from '@/lib/tooltipContent';
import { segmentBillActionText } from '@/lib/bill-action-tooltip-segments';

export interface BillHistoryActionTextProps {
  text: string | null | undefined;
  /** e.g. body2 for timeline, body1 for last-action highlight */
  component?: 'span' | 'div';
}

/**
 * Renders LRC / LegiScan action text with `LegislativeStageTooltip` on known phrases
 * when the global tooltips setting is on.
 */
export function BillHistoryActionText({ text, component = 'span' }: BillHistoryActionTextProps) {
  const { tooltipsEnabled } = useTooltips();
  const raw = text == null ? '' : String(text).trim();
  if (!raw) return null;

  const boxSx = { display: component === 'span' ? 'inline' : 'block' } as const;

  const formatted = formatBillLabelText(raw);
  if (!tooltipsEnabled) {
    return (
      <Box component={component} sx={boxSx}>
        {formatted}
      </Box>
    );
  }

  const parts = segmentBillActionText(raw);

  return (
    <Box component={component} sx={boxSx}>
      {parts.map((seg, idx) => {
        const display = formatted.slice(seg.start, seg.end);
        if (seg.key && hasTooltipContent(seg.key)) {
          return (
            <LegislativeStageTooltip key={idx} stage={seg.key} showIcon={false} position="top">
              <Box
                component="span"
                sx={{
                  textDecoration: 'underline',
                  textDecorationStyle: 'dotted',
                  textUnderlineOffset: '0.2em',
                  cursor: 'help',
                }}
              >
                {display}
              </Box>
            </LegislativeStageTooltip>
          );
        }
        return <React.Fragment key={idx}>{display}</React.Fragment>;
      })}
    </Box>
  );
}
