import { Suspense } from 'react';
import { Box, CircularProgress, Container, Typography } from '@mui/material';
import type { Metadata } from 'next';
import { SearchPageClient } from '@/components/search/SearchPageClient';
import { fetchKyActiveLegislatorRosterSlim } from '@/lib/ky-legislator-roster-server';
import { buildPageMetadata } from '@/lib/seo';

export const metadata: Metadata = buildPageMetadata({
  title: 'Search Kentucky bills',
  description: 'Search Kentucky General Assembly bills by number, title, topic, and more.',
  path: '/search',
});

export const revalidate = 3600;

export default async function SearchPage() {
  const legislatorRoster = await fetchKyActiveLegislatorRosterSlim();

  // H1 + intro stay outside the Suspense boundary: `useSearchParams` in
  // SearchPageClient bails its subtree out of the static HTML, and crawlers
  // must still see the heading.
  return (
    <Box sx={{ bgcolor: 'background.default' }}>
      <Container maxWidth="lg" sx={{ pt: 4 }}>
        <Typography variant="h4" component="h1" fontWeight={700} gutterBottom>
          Search Kentucky bills
        </Typography>
        <Typography variant="body1" color="text.secondary" sx={{ mb: 3 }}>
          Search Kentucky General Assembly bills by number, title, or topic.
        </Typography>
      </Container>
      <Suspense
        fallback={
          <Container maxWidth="lg" sx={{ py: 4 }}>
            <Box sx={{ display: 'flex', justifyContent: 'center', py: 8 }}>
              <CircularProgress />
            </Box>
          </Container>
        }
      >
        <SearchPageClient legislatorRoster={legislatorRoster} />
      </Suspense>
    </Box>
  );
}
