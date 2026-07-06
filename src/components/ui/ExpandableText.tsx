'use client';

import React, { useState } from 'react';
import { Button, Typography, type TypographyProps } from '@mui/material';

function countWords(text: string): number {
  return (text.match(/\S+/g) ?? []).length;
}

/** Slice `text` after its first `maxWords` words, preserving internal whitespace/newlines. */
function truncateAtWord(text: string, maxWords: number): string {
  const re = /\S+/g;
  let count = 0;
  let match: RegExpExecArray | null;
  while ((match = re.exec(text)) !== null) {
    count += 1;
    if (count === maxWords) return text.slice(0, match.index + match[0].length);
  }
  return text;
}

interface ExpandableTextProps {
  text: string;
  /**
   * Texts longer than this many words start collapsed. Kept above collapsedWords
   * so the expand toggle never reveals only a couple of extra words.
   */
  thresholdWords?: number;
  collapsedWords?: number;
  moreLabel?: string;
  lessLabel?: string;
  /** Customize how the visible text renders inside the Typography (e.g. bolding a label). */
  renderText?: (visible: string) => React.ReactNode;
  typographyProps?: TypographyProps;
}

/**
 * Body text that collapses past a word threshold behind a "show more" toggle,
 * truncating at a word boundary. Toggle styling matches the timeline's
 * "Show all actions" text button.
 */
export function ExpandableText({
  text,
  thresholdWords = 100,
  collapsedWords = 75,
  moreLabel = 'Show more',
  lessLabel = 'Show less',
  renderText = (visible) => visible,
  typographyProps,
}: ExpandableTextProps) {
  const [expanded, setExpanded] = useState(false);
  const collapsible = countWords(text) > thresholdWords;
  const visible = collapsible && !expanded ? `${truncateAtWord(text, collapsedWords)}…` : text;
  return (
    <>
      <Typography {...typographyProps}>{renderText(visible)}</Typography>
      {collapsible && (
        <Button
          size="small"
          onClick={() => setExpanded((v) => !v)}
          aria-expanded={expanded}
          sx={{ mt: 0.5, textTransform: 'none', fontWeight: 600, pl: 0, minWidth: 0 }}
        >
          {expanded ? lessLabel : moreLabel}
        </Button>
      )}
    </>
  );
}
