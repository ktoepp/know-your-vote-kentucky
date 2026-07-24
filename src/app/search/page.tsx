import { Suspense } from 'react';
import { Box, CircularProgress, Container, Typography } from '@mui/material';
import type { Metadata } from 'next';
import { SearchPageClient } from '@/components/search/SearchPageClient';
import { fetchKyActiveLegislatorRosterSlim } from '@/lib/ky-legislator-roster-server';
import { buildPageMetadata } from '@/lib/seo';

export const metadata: Metadata = buildPageMetadata({
  title: 'Search Kentucky bills, members, and committees',
  description:
    'Search the Kentucky General Assembly in one place — bills by number, title, or topic; members by name or district; and committees.',
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
        <Typography variant="h4" component="h1" fontWeight={700} sx={{ mb: 3 }}>
          Search
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
