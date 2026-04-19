'use client';

import React from 'react';
import { Box, Link, Typography } from '@mui/material';

/**
 * Inline label + body for AI-generated summaries on list cards and tooltips.
 */
/** Tooltip-sized AI summary (no line clamp). */
export function AiSummaryTooltip({ children }: { children: React.ReactNode }) {
  return (
    <Box sx={{ mt: 1 }}>
      <Typography variant="caption" fontWeight={600} display="block" sx={{ mb: 0.5 }}>
        AI-generated summary
      </Typography>
      <Typography variant="body2" color="text.secondary" component="div">
        {children}
      </Typography>
    </Box>
  );
}

export function AiSummaryInline({ children }: { children: React.ReactNode }) {
  return (
    <Box sx={{ mt: 1 }}>
      <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 600, display: 'block', mb: 0.35 }}>
        AI-generated summary
      </Typography>
      <Typography
        component="div"
        variant="caption"
        color="text.secondary"
        sx={{ fontStyle: 'italic', display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}
      >
        {children}
      </Typography>
    </Box>
  );
}

interface AiGeneratedBlockProps {
  title?: string;
  children: React.ReactNode;
  /** Primary government or host source to verify against (e.g. LegiScan PDF). */
  officialHref?: string | null;
  officialLabel?: string;
}

/**
 * Prominent callout for bill/ordinance detail pages: AI text is clearly labeled with a path to primary sources.
 */
export function AiGeneratedBlock({
  title = 'Plain-language summary',
  children,
  officialHref,
  officialLabel = 'Open official bill text',
}: AiGeneratedBlockProps) {
  return (
    <Box
      sx={{
        p: 2,
        borderRadius: 2,
        bgcolor: 'action.hover',
        border: '1px solid',
        borderColor: 'divider',
      }}
    >
      <Typography variant="overline" color="text.secondary" sx={{ display: 'block', mb: 0.75, letterSpacing: '0.08em' }}>
        AI-generated — always verify with primary sources
      </Typography>
      <Typography variant="subtitle1" fontWeight={700} gutterBottom>
        {title}
      </Typography>
      <Typography variant="body2" color="text.secondary" sx={{ lineHeight: 1.7 }}>
        {children}
      </Typography>
      {officialHref && (
        <Typography variant="body2" sx={{ mt: 1.5 }}>
          <Link href={officialHref} target="_blank" rel="noopener noreferrer" underline="hover">
            {officialLabel}
          </Link>
        </Typography>
      )}
    </Box>
  );
}
