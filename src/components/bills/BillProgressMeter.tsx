'use client';

import React from 'react';
import { Box, Typography } from '@mui/material';
import { useTheme, alpha } from '@mui/material/styles';
import { Block as BlockIcon, Check as CheckIcon } from '@mui/icons-material';
import type { KYBill } from '@/types/kentucky';
import { getBillProgress } from '@/lib/ky-bill-progress';

export interface BillProgressMeterProps {
  bill: KYBill;
  /** `card` = compact bars + one caption; `detail` = per-stage labels + status line. */
  variant?: 'card' | 'detail';
}

type SegmentState = 'complete' | 'upcoming' | 'blocked';

/**
 * Generalized 4-stage progress meter (Introduced → chambers → Became law), shared
 * by bill cards and the bill detail page. Derives its stages + fill level from
 * `getBillProgress`, which adapts the stage list per bill type and reports a
 * terminal veto/failed state. See `ky-bill-progress.ts`.
 */
export function BillProgressMeter({ bill, variant = 'card' }: BillProgressMeterProps) {
  const theme = useTheme();
  const { stages, reachedIndex, terminal } = getBillProgress(bill);
  const n = stages.length;
  const lastIndex = n - 1;
  const isDetail = variant === 'detail';

  const trackColor = theme.palette.mode === 'dark' ? theme.palette.action.selected : theme.palette.action.hover;
  const blockedColor = theme.palette.error.main;

  // Fully passed (enacted / adopted, not stopped) reads green; a bill still
  // moving through the process reads blue ("interim"). Failure keeps its own style.
  const fullyPassed = !terminal && reachedIndex === lastIndex;
  const completeColor = fullyPassed ? theme.palette.success.main : theme.palette.primary.main;

  const segmentState = (i: number): SegmentState => {
    if (terminal === 'vetoed' && i === lastIndex) return 'blocked';
    if (i <= reachedIndex) return 'complete';
    return 'upcoming';
  };

  const segmentColor = (state: SegmentState): string => {
    if (state === 'complete') return completeColor;
    if (state === 'blocked') return blockedColor;
    return trackColor;
  };

  // Furthest stage reached — used for the aria summary and the detail emphasis.
  const currentStageLabel = stages[Math.max(0, reachedIndex)]?.label ?? 'Introduced';

  const ariaLabel =
    terminal === 'vetoed'
      ? `Progress: passed both chambers, then vetoed`
      : terminal === 'failed'
        ? `Progress: did not advance past ${currentStageLabel.toLowerCase()}`
        : `Progress: step ${reachedIndex + 1} of ${n}, ${currentStageLabel.toLowerCase()}`;

  const barHeight = isDetail ? 8 : 6;

  return (
    <Box role="group" aria-label={ariaLabel} sx={{ width: '100%' }}>
      {/* Segment track */}
      <Box
        sx={{
          display: 'grid',
          gridTemplateColumns: `repeat(${n}, 1fr)`,
          gap: 0.75,
        }}
      >
        {stages.map((stage, i) => {
          const state = segmentState(i);
          return (
            <Box
              key={stage.key}
              sx={{
                height: barHeight,
                borderRadius: 999,
                bgcolor: segmentColor(state),
                ...(state === 'blocked' && {
                  backgroundImage: `repeating-linear-gradient(45deg, ${alpha('#fff', 0.35)} 0, ${alpha('#fff', 0.35)} 2px, transparent 2px, transparent 5px)`,
                }),
                transition: 'background-color 0.2s ease',
              }}
            />
          );
        })}
      </Box>

      {isDetail ? (
        <>
          {/* Per-stage labels aligned under each segment */}
          <Box
            sx={{
              display: 'grid',
              gridTemplateColumns: `repeat(${n}, 1fr)`,
              gap: 0.75,
              mt: 1,
            }}
          >
            {stages.map((stage, i) => {
              const state = segmentState(i);
              const complete = state === 'complete';
              return (
                <Box key={stage.key} sx={{ display: 'flex', alignItems: 'flex-start', gap: 0.5, minWidth: 0 }}>
                  {complete && (
                    <CheckIcon
                      aria-hidden
                      sx={{ fontSize: '0.95rem', color: completeColor, flexShrink: 0, mt: '1px' }}
                    />
                  )}
                  {state === 'blocked' && (
                    <BlockIcon
                      aria-hidden
                      sx={{ fontSize: '0.95rem', color: 'error.main', flexShrink: 0, mt: '1px' }}
                    />
                  )}
                  <Typography
                    variant="caption"
                    sx={{
                      lineHeight: 1.25,
                      fontWeight: i === reachedIndex && !terminal ? 700 : 500,
                      color:
                        state === 'blocked'
                          ? 'error.main'
                          : complete
                            ? 'text.primary'
                            : 'text.disabled',
                    }}
                  >
                    {state === 'blocked' && terminal === 'vetoed' ? 'Vetoed' : stage.label}
                  </Typography>
                </Box>
              );
            })}
          </Box>
          {terminal === 'failed' && (
            <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mt: 1 }}>
              This bill did not advance and is no longer active.
            </Typography>
          )}
        </>
      ) : null}
    </Box>
  );
}
