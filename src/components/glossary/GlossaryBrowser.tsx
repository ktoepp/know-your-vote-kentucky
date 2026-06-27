'use client';

import { useMemo, useState } from 'react';
import Link from 'next/link';
import { Box, Divider, Paper, Stack, TextField, Typography } from '@mui/material';
import { TOOLTIP_CATEGORY_LABELS, type TooltipCategory } from '@/lib/tooltipContent';

export type GlossaryEntry = { key: string; title: string; content: string };
export type GlossaryCategory = { category: TooltipCategory; entries: GlossaryEntry[] };

export interface GlossaryBrowserProps {
  /** Non-empty categories in display order, each with entries already sorted by title. */
  categories: GlossaryCategory[];
  /** Anchor id of the page heading, used by the per-section "Back to top" links. */
  topAnchorId: string;
}

/**
 * Client wrapper for the glossary list: an in-page filter over title + definition,
 * a section jump-nav (hidden while filtering), and a "Back to top" link per section.
 */
export function GlossaryBrowser({ categories, topAnchorId }: GlossaryBrowserProps) {
  const [filter, setFilter] = useState('');
  const q = filter.trim().toLowerCase();

  const filtered = useMemo(() => {
    if (!q) return categories;
    return categories
      .map((c) => ({
        category: c.category,
        entries: c.entries.filter(
          (e) => e.title.toLowerCase().includes(q) || e.content.toLowerCase().includes(q),
        ),
      }))
      .filter((c) => c.entries.length > 0);
  }, [categories, q]);

  const totalAll = categories.reduce((n, c) => n + c.entries.length, 0);
  const totalShown = filtered.reduce((n, c) => n + c.entries.length, 0);

  return (
    <>
      <TextField
        fullWidth
        size="small"
        type="search"
        label="Filter terms"
        value={filter}
        onChange={(e) => setFilter(e.target.value)}
        sx={{ mb: 2 }}
      />

      {!q && (
        <Paper
          elevation={0}
          sx={{ p: 2.5, mb: 4, border: '1px solid', borderColor: 'divider', borderRadius: 2 }}
        >
          <Typography
            variant="overline"
            component="h2"
            sx={{ display: 'block', mb: 1, color: 'text.secondary', letterSpacing: '0.08em' }}
          >
            Jump to a section
          </Typography>
          <Stack direction="row" spacing={1.5} useFlexGap flexWrap="wrap" component="nav" aria-label="Glossary sections">
            {categories.map(({ category }) => (
              <Link
                key={category}
                href={`#${category}`}
                style={{ fontSize: '0.875rem', fontWeight: 500, textDecoration: 'underline', textUnderlineOffset: 3 }}
              >
                {TOOLTIP_CATEGORY_LABELS[category]}
              </Link>
            ))}
          </Stack>
        </Paper>
      )}

      {q && (
        <Typography variant="body2" color="text.secondary" role="status" sx={{ mb: 3 }}>
          {totalShown} of {totalAll} terms
        </Typography>
      )}

      {filtered.length === 0 && (
        <Typography variant="body1" color="text.secondary" sx={{ mb: 4 }}>
          No terms match &ldquo;{filter.trim()}&rdquo;.
        </Typography>
      )}

      {filtered.map(({ category, entries }) => (
        <Box key={category} component="section" id={category} sx={{ scrollMarginTop: 96, mb: 5 }}>
          <Typography variant="h5" component="h2" fontWeight={700} sx={{ mb: 1 }}>
            {TOOLTIP_CATEGORY_LABELS[category]}
          </Typography>
          <Divider sx={{ mb: 2 }} />
          <Stack spacing={2.5}>
            {entries.map((entry) => (
              <Box key={entry.key} id={entry.key} component="article" sx={{ scrollMarginTop: 96 }}>
                <Typography variant="subtitle1" component="h3" fontWeight={700} sx={{ mb: 0.5 }}>
                  {entry.title}
                </Typography>
                <Typography variant="body2" color="text.secondary" sx={{ lineHeight: 1.7 }}>
                  {entry.content}
                </Typography>
              </Box>
            ))}
          </Stack>
          {!q && (
            <Box sx={{ mt: 2 }}>
              <Link
                href={`#${topAnchorId}`}
                style={{ fontSize: '0.8125rem', fontWeight: 500, textDecoration: 'underline', textUnderlineOffset: 3 }}
              >
                Back to top
              </Link>
            </Box>
          )}
        </Box>
      ))}
    </>
  );
}
