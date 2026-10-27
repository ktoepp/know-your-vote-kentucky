'use client';

import React from 'react';
import { Box, Chip, Link, Typography } from '@mui/material';
import { ExpandableText } from '@/components/ui/ExpandableText';
import {
  AUDIENCE_CLAUSE_LABEL,
  SHOW_AUDIENCE_CLAUSE,
  aiSummaryBasisLine,
  stripAudienceClause,
  type AiSummaryBasis,
} from '@/lib/ai-summary-basis';

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

/** Shown above a description-based summary when the bill changed after introduction (WS3-04). */
const CHANGED_AFTER_INTRODUCTION_CAVEAT =
  'This bill changed after it was introduced. This summary may describe an earlier version.';

/**
 * Render a plain-text summary, bolding the "Who it may affect:" label when present.
 * Summaries are stored as plain text (no markdown), so we emphasize the label at render
 * time. Non-string children pass through untouched.
 */
function renderSummaryBody(children: React.ReactNode): React.ReactNode {
  if (typeof children !== 'string') return children;
  const idx = children.indexOf(AUDIENCE_CLAUSE_LABEL);
  if (idx === -1) return children;
  return (
    <>
      {children.slice(0, idx)}
      <Box component="span" sx={{ fontWeight: 700 }}>
        {AUDIENCE_CLAUSE_LABEL}
      </Box>
      {children.slice(idx + AUDIENCE_CLAUSE_LABEL.length)}
    </>
  );
}

interface AiGeneratedBlockProps {
  title?: string;
  children: React.ReactNode;
  /** What the summary was built from; drives the basis line above the title. */
  basis: AiSummaryBasis;
  /** True when the bill changed after introduction; shows a caveat on description-based summaries. */
  changedAfterIntroduction?: boolean;
  /** Primary government or host source to verify against (e.g. LegiScan PDF). */
  officialHref?: string | null;
  officialLabel?: string;
  /** Bill number (e.g. "HB 100") — when set, shows a frictionless feedback CTA prefilled with it. */
  billNumber?: string;
  /** Show a "Beta" tag on the section title while the feature is still being validated. */
  beta?: boolean;
}

/**
 * Summary block for bill/ordinance detail pages: AI text is clearly labeled with a path
 * to primary sources. Renders as plain content — the page's card provides containment.
 */
export function AiGeneratedBlock({
  title = 'Plain-language summary',
  children,
  basis,
  changedAfterIntroduction = false,
  officialHref,
  officialLabel = 'Open official bill text',
  billNumber,
  beta = false,
}: AiGeneratedBlockProps) {
  const summary =
    !SHOW_AUDIENCE_CLAUSE && typeof children === 'string' ? stripAudienceClause(children) : children;
  const showChangedCaveat = changedAfterIntroduction && basis.kind === 'description';
  const feedbackHref = billNumber
    ? `mailto:${FEEDBACK_EMAIL}?subject=${encodeURIComponent(`Feedback on ${billNumber} summary`)}`
    : null;
  return (
    <Box>
      <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mb: 0.75, fontWeight: 500 }}>
        {aiSummaryBasisLine(basis)}
      </Typography>
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, flexWrap: 'wrap', mb: 0.5 }}>
        <Typography variant="subtitle1" fontWeight={700}>
          {title}
        </Typography>
        {beta && <Chip label="Beta" size="small" color="warning" variant="outlined" sx={{ fontWeight: 600 }} />}
      </Box>
      {showChangedCaveat && (
        <Typography variant="body2" sx={{ mb: 1 }}>
          {CHANGED_AFTER_INTRODUCTION_CAVEAT}
        </Typography>
      )}
      {typeof summary === 'string' ? (
        <ExpandableText
          text={summary}
          moreLabel="Show full summary"
          renderText={renderSummaryBody}
          typographyProps={{ variant: 'body2', color: 'text.secondary', sx: { lineHeight: 1.7, whiteSpace: 'pre-line' } }}
        />
      ) : (
        <Typography variant="body2" color="text.secondary" sx={{ lineHeight: 1.7, whiteSpace: 'pre-line' }}>
          {renderSummaryBody(summary)}
        </Typography>
      )}
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
              Report a problem with the summary
            </Link>
          )}
        </Typography>
      )}
    </Box>
  );
}
