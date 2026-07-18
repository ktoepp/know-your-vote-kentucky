import type { Metadata } from 'next';
import Link from 'next/link';
import { Box, Container, Typography } from '@mui/material';
import {
  governmentTooltips,
  TOOLTIP_CATEGORY_ORDER,
  type TooltipCategory,
  type TooltipContent,
} from '@/lib/tooltipContent';
import { GlossaryBrowser, type GlossaryEntry } from '@/components/glossary/GlossaryBrowser';
import { JsonLd } from '@/components/seo/JsonLd';
import { buildBreadcrumbJsonLd, buildGlossaryFaqJsonLd } from '@/lib/structured-data';
import { buildPageMetadata } from '@/lib/seo';

export const metadata: Metadata = buildPageMetadata({
  title: 'Kentucky legislative glossary',
  description:
    'Plain-English definitions of the legislative terms used across Know Your Vote Kentucky — bill types, status stages, committee terminology, voting procedures, and more.',
  path: '/glossary',
});

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

const GLOSSARY_TOP_ANCHOR = 'glossary-top';

export default function GlossaryPage() {
  const entriesByCategory = buildEntriesByCategory();
  const categories = TOOLTIP_CATEGORY_ORDER.filter((c) => entriesByCategory[c].length > 0).map(
    (category) => ({ category, entries: entriesByCategory[category] }),
  );
  const faqEntries = categories.flatMap((c) =>
    c.entries.map((e) => ({ title: e.title, content: e.content })),
  );

  return (
    <Container maxWidth="md" sx={{ py: { xs: 4, sm: 6 } }}>
      <JsonLd
        data={[
          buildBreadcrumbJsonLd([
            { name: 'Home', path: '/' },
            { name: 'Glossary', path: '/glossary' },
          ]),
          buildGlossaryFaqJsonLd(faqEntries, '/glossary'),
        ]}
      />
      <Typography id={GLOSSARY_TOP_ANCHOR} variant="h3" component="h1" fontWeight={700} gutterBottom sx={{ scrollMarginTop: 96 }}>
        Glossary
      </Typography>
      <Typography variant="body1" color="text.secondary" sx={{ mb: 4, lineHeight: 1.7 }}>
        Plain-English definitions of the terms you&apos;ll see across Know Your Vote Kentucky.
        Everything here is specific to the <strong>Kentucky General Assembly</strong> — the
        rules and procedures differ from the U.S. Congress.
      </Typography>

      <GlossaryBrowser categories={categories} topAnchorId={GLOSSARY_TOP_ANCHOR} />

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

