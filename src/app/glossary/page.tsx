import type { Metadata } from 'next';
import Link from 'next/link';
import { Box, Container, Divider, Paper, Stack, Typography } from '@mui/material';
import {
  governmentTooltips,
  TOOLTIP_CATEGORY_LABELS,
  TOOLTIP_CATEGORY_ORDER,
  type TooltipCategory,
  type TooltipContent,
} from '@/lib/tooltipContent';

export const metadata: Metadata = {
  title: 'Glossary | Know Your Vote Kentucky',
  description:
    'Plain-English definitions of the legislative terms used across Know Your Vote Kentucky — bill types, status stages, committee terminology, voting procedures, and more.',
};

type GlossaryEntry = {
  key: string;
  title: string;
  content: string;
};

function buildEntriesByCategory(): Record<TooltipCategory, GlossaryEntry[]> {
  const empty = Object.fromEntries(
    TOOLTIP_CATEGORY_ORDER.map((c) => [c, [] as GlossaryEntry[]]),
  ) as Record<TooltipCategory, GlossaryEntry[]>;

  for (const [key, value] of Object.entries(governmentTooltips)) {
    const entry = value as TooltipContent;
    if (!entry.category) continue;
    empty[entry.category].push({ key, title: entry.title, content: entry.content });
  }
  for (const list of Object.values(empty)) {
    list.sort((a, b) => a.title.localeCompare(b.title));
  }
  return empty;
}

export default function GlossaryPage() {
  const entriesByCategory = buildEntriesByCategory();
  const nonEmptyCategories = TOOLTIP_CATEGORY_ORDER.filter(
    (c) => entriesByCategory[c].length > 0,
  );

  return (
    <Container maxWidth="md" sx={{ py: { xs: 4, sm: 6 } }}>
      <Typography variant="h3" component="h1" fontWeight={700} gutterBottom>
        Glossary
      </Typography>
      <Typography variant="body1" color="text.secondary" sx={{ mb: 4, lineHeight: 1.7 }}>
        Plain-English definitions of the terms you&apos;ll see across Know Your Vote Kentucky.
        Everything here is specific to the <strong>Kentucky General Assembly</strong> — the
        rules and procedures differ from the U.S. Congress.
      </Typography>

      <Paper
        elevation={0}
        sx={{
          p: 2.5,
          mb: 4,
          border: '1px solid',
          borderColor: 'divider',
          borderRadius: 2,
        }}
      >
        <Typography
          variant="overline"
          component="h2"
          sx={{ display: 'block', mb: 1, color: 'text.secondary', letterSpacing: '0.08em' }}
        >
          Jump to a section
        </Typography>
        <Stack
          direction="row"
          spacing={1.5}
          useFlexGap
          flexWrap="wrap"
          component="nav"
          aria-label="Glossary sections"
        >
          {nonEmptyCategories.map((cat) => (
            <Link
              key={cat}
              href={`#${cat}`}
              style={{
                fontSize: '0.875rem',
                fontWeight: 500,
                textDecoration: 'underline',
                textUnderlineOffset: 3,
              }}
            >
              {TOOLTIP_CATEGORY_LABELS[cat]}
            </Link>
          ))}
        </Stack>
      </Paper>

      {nonEmptyCategories.map((cat) => (
        <Box key={cat} component="section" id={cat} sx={{ scrollMarginTop: 96, mb: 5 }}>
          <Typography variant="h5" component="h2" fontWeight={700} sx={{ mb: 1 }}>
            {TOOLTIP_CATEGORY_LABELS[cat]}
          </Typography>
          <Divider sx={{ mb: 2 }} />
          <Stack spacing={2.5}>
            {entriesByCategory[cat].map((entry) => (
              <Box
                key={entry.key}
                id={entry.key}
                component="article"
                sx={{ scrollMarginTop: 96 }}
              >
                <Typography variant="subtitle1" component="h3" fontWeight={700} sx={{ mb: 0.5 }}>
                  {entry.title}
                </Typography>
                <Typography variant="body2" color="text.secondary" sx={{ lineHeight: 1.7 }}>
                  {entry.content}
                </Typography>
              </Box>
            ))}
          </Stack>
        </Box>
      ))}

      <Box sx={{ mt: 6, pt: 3, borderTop: '1px solid', borderColor: 'divider' }}>
        <Typography variant="body2" color="text.secondary">
          Missing a term or notice something unclear?{' '}
          <Link href="/about" style={{ textDecoration: 'underline' }}>
            Get in touch
          </Link>
          . This glossary is the same source the in-page tooltips read from, so a fix here
          improves the entire site.
        </Typography>
      </Box>
    </Container>
  );
}

