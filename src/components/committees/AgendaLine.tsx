'use client';

import React from 'react';
import Link from 'next/link';
import { Box } from '@mui/material';

const KIND_LONG_FORM: Record<string, string> = {
  HB: 'House Bill',
  SB: 'Senate Bill',
  HJR: 'House Joint Resolution',
  SJR: 'Senate Joint Resolution',
  HCR: 'House Concurrent Resolution',
  SCR: 'Senate Concurrent Resolution',
  HR: 'House Resolution',
  SR: 'Senate Resolution',
};

function escapeRegex(source: string): string {
  return source.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

/**
 * Locate the substring inside `rawText` that names `billNumber`.
 * Tries the long form first ("House Bill 6"), falls back to the short form ("HB 6").
 * Returns null when the line doesn't mention the bill in a form we recognize.
 */
function findBillMention(
  rawText: string,
  billNumber: string,
): { start: number; end: number; matched: string } | null {
  const parts = billNumber.trim().match(/^([A-Za-z]+)\s*(\d+)$/);
  if (!parts) return null;
  const kind = parts[1].toUpperCase();
  const number = parts[2];

  const long = KIND_LONG_FORM[kind];
  const candidates: RegExp[] = [];
  if (long) {
    candidates.push(new RegExp(`\\b${escapeRegex(long)}\\s+${number}\\b`, 'i'));
  }
  candidates.push(new RegExp(`\\b${kind}\\s*${number}\\b`, 'i'));

  for (const re of candidates) {
    const m = rawText.match(re);
    if (m && typeof m.index === 'number') {
      return { start: m.index, end: m.index + m[0].length, matched: m[0] };
    }
  }
  return null;
}

/** True when a raw agenda line is really a sub-bullet under the previous line. */
export function isAgendaSubBullet(rawText: string): boolean {
  return /^\s*[•·▪▫◦]\s*/.test(rawText);
}

/**
 * LRC stores sub-bullets as their own rows with a leading "• ". Strip the
 * bullet character (rendering supplies its own marker) but leave the rest.
 */
export function stripAgendaBullet(rawText: string): string {
  return rawText.replace(/^\s*[•·▪▫◦]\s*/, '');
}

export interface AgendaLineProps {
  rawText: string;
  billNumber?: string | null;
  billId?: string | null;
  /**
   * When true, the matched bill token renders bold-but-not-linked.
   * Use on the bill detail page so the agenda doesn't link to the page you're on.
   */
  isSelfBill?: boolean;
}

/**
 * One agenda line rendered as inline prose. The bill designation inside the
 * line (if any) is bold; when a bill id is available it also becomes the
 * only hyperlink on the line — no whole-line underlines, no duplicate chips.
 */
export function AgendaLine({ rawText, billNumber, billId, isSelfBill }: AgendaLineProps) {
  const text = stripAgendaBullet(rawText);
  if (!billNumber) {
    return <>{text}</>;
  }
  const mention = findBillMention(text, billNumber);
  if (!mention) {
    return <>{text}</>;
  }

  const before = text.slice(0, mention.start);
  const after = text.slice(mention.end);
  const linkTarget = !isSelfBill && billId ? `/bills/${billId}` : null;

  const tokenSx = { fontWeight: 700 } as const;
  const token = linkTarget ? (
    <Box
      component={Link}
      href={linkTarget}
      sx={{
        ...tokenSx,
        color: 'primary.main',
        textDecoration: 'underline',
        textUnderlineOffset: 2,
        '&:hover': { textDecoration: 'underline' },
      }}
    >
      {mention.matched}
    </Box>
  ) : (
    <Box component="span" sx={tokenSx}>
      {mention.matched}
    </Box>
  );

  return (
    <>
      {before}
      {token}
      {after}
    </>
  );
}
