'use client';

import React from 'react';
import { Box, Chip, Link, Typography } from '@mui/material';

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

/** Inbox that fields summary-feedback reports (see FEEDBACK.md workflow). */
const FEEDBACK_EMAIL = 'katie@kyvky.com';

/** Label the generator emits before the impacted-audience clause (kept in sync with ky-content-generation.ts). */
const AUDIENCE_LABEL = 'Who it may affect:';

/**
 * Render a plain-text summary, bolding the "Who it may affect:" label when present.
 * Summaries are stored as plain text (no markdown), so we emphasize the label at render
 * time. Non-string children pass through untouched.
 */
function renderSummaryBody(children: React.ReactNode): React.ReactNode {
  if (typeof children !== 'string') return children;
  const idx = children.indexOf(AUDIENCE_LABEL);
  if (idx === -1) return children;
  return (
    <>
      {children.slice(0, idx)}
      <Box component="span" sx={{ fontWeight: 700 }}>
        {AUDIENCE_LABEL}
      </Box>
      {children.slice(idx + AUDIENCE_LABEL.length)}
    </>
  );
}

interface AiGeneratedBlockProps {
  title?: string;
  children: React.ReactNode;
  /** Primary government or host source to verify against (e.g. LegiScan PDF). */
  officialHref?: string | null;
  officialLabel?: string;
  /** Bill number (e.g. "HB 100") — when set, shows a frictionless feedback CTA prefilled with it. */
  billNumber?: string;
  /** Show a "Beta" tag on the section title while the feature is still being validated. */
  beta?: boolean;
  /** True when the summary was generated with editor-verified notes (ky_bills.editor_notes, migration 038). */
  editorVerified?: boolean;
}

/**
 * Prominent callout for bill/ordinance detail pages: AI text is clearly labeled with a path to primary sources.
 */
export function AiGeneratedBlock({
  title = 'Plain-language summary',
  children,
  officialHref,
  officialLabel = 'Open official bill text',
  billNumber,
  beta = false,
  editorVerified = false,
}: AiGeneratedBlockProps) {
  const feedbackHref = billNumber
    ? `mailto:${FEEDBACK_EMAIL}?subject=${encodeURIComponent(`Feedback on ${billNumber} summary`)}`
    : null;
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
        {editorVerified
          ? 'AI-generated from bill data and editor-verified notes — always verify with primary sources'
          : 'AI-generated — always verify with primary sources'}
      </Typography>
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, flexWrap: 'wrap', mb: 0.5 }}>
        <Typography variant="subtitle1" fontWeight={700}>
          {title}
        </Typography>
        {beta && <Chip label="Beta" size="small" color="warning" variant="outlined" sx={{ fontWeight: 600 }} />}
      </Box>
      <Typography variant="body2" color="text.secondary" sx={{ lineHeight: 1.7, whiteSpace: 'pre-line' }}>
        {renderSummaryBody(children)}
      </Typography>
      {(officialHref || feedbackHref) && (
        <Typography variant="body2" sx={{ mt: 1.5 }}>
          {officialHref && (
            <Link href={officialHref} target="_blank" rel="noopener noreferrer" underline="hover">
              {officialLabel}
            </Link>
          )}
          {officialHref && feedbackHref && <Box component="span" sx={{ mx: 1, color: 'text.disabled' }}>·</Box>}
          {feedbackHref && (
            <Link href={feedbackHref} underline="hover">
              See a problem? Tell us
            </Link>
          )}
        </Typography>
      )}
    </Box>
  );
}
