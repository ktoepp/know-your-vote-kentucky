import { Suspense } from 'react';
import { Box, CircularProgress, Container } from '@mui/material';
import type { Metadata } from 'next';
import { SearchPageClient } from '@/components/search/SearchPageClient';
import { fetchKyActiveLegislatorRosterSlim } from '@/lib/ky-legislator-roster-server';

export const metadata: Metadata = {
  title: 'Search bills | Know Your Vote Kentucky',
  description: 'Search Kentucky General Assembly bills by number, title, topic, and more.',
};

export const revalidate = 3600;

export default async function SearchPage() {
  const legislatorRoster = await fetchKyActiveLegislatorRosterSlim();

  return (
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
  );
}
