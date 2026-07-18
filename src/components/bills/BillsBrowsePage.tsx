import { Suspense } from 'react';
import NextLink from 'next/link';
import { Box, Container, Link as MuiLink, Typography } from '@mui/material';
import { BillsBrowse, type BillsBrowseChamberMode } from '@/components/bills/BillsBrowse';
import { fetchKyBillsBrowsePage } from '@/lib/ky-bills-browse-server';
import { kyBillsBrowseQueryKey, parseKyBillsBrowseQuery } from '@/lib/ky-bills-browse-query';
import { searchParamsToUrlSearchParams, type SearchParamsInput } from '@/lib/search-params';
import { fetchKyActiveLegislatorRosterSlim } from '@/lib/ky-legislator-roster-server';

export type BillsBrowsePageProps = {
  title: string;
  subtitle: string;
  chamberMode: BillsBrowseChamberMode;
  searchParams: SearchParamsInput | Promise<SearchParamsInput>;
  initialTopic?: string;
};

/** Section cross-links per view — server-rendered so crawlers can reach every bills section. */
const CHAMBER_LINKS: Record<BillsBrowseChamberMode, { label: string; href: string }[]> = {
  all: [
    { label: 'House bills', href: '/bills/house' },
    { label: 'Senate bills', href: '/bills/senate' },
    { label: 'Bills by topic', href: '/bills/topics' },
  ],
  house: [
    { label: 'All bills', href: '/bills' },
    { label: 'Senate bills', href: '/bills/senate' },
    { label: 'Bills by topic', href: '/bills/topics' },
  ],
  senate: [
    { label: 'All bills', href: '/bills' },
    { label: 'House bills', href: '/bills/house' },
    { label: 'Bills by topic', href: '/bills/topics' },
  ],
};

export async function BillsBrowsePage({
  title,
  subtitle,
  chamberMode,
  searchParams,
  initialTopic,
}: BillsBrowsePageProps) {
  const sp = searchParamsToUrlSearchParams(await searchParams);
  if (initialTopic && !sp.has('topic')) sp.set('topic', initialTopic);

  const followsMe = sp.get('follows') === 'me';
  const query = parseKyBillsBrowseQuery(sp, chamberMode);
  const queryKey = kyBillsBrowseQueryKey(query);

  const [legislatorRoster, browseResult] = await Promise.all([
    fetchKyActiveLegislatorRosterSlim(),
    followsMe || query.page !== 1
      ? Promise.resolve(null)
      : fetchKyBillsBrowsePage(query),
  ]);

  const initialBrowse =
    browseResult != null
      ? {
          queryKey,
          bills: browseResult.bills,
          total: browseResult.total,
          capped: browseResult.capped,
        }
      : undefined;

  // Heading + section links live OUTSIDE the Suspense boundary: `useSearchParams`
  // inside BillsBrowse bails its subtree out of the static HTML, so anything
  // crawlers must always see has to render here in the server shell.
  return (
    <Box sx={{ bgcolor: 'background.default' }}>
      <Container maxWidth="lg" sx={{ pt: 4 }}>
        <Box sx={{ textAlign: 'center', mb: 4 }}>
          <Typography variant="h4" component="h1" fontWeight={700} gutterBottom>
            {title}
          </Typography>
          <Typography variant="body1" color="text.secondary">
            {subtitle}
          </Typography>
          <Box component="nav" aria-label="Bill sections" sx={{ mt: 1.5 }}>
            <Typography variant="body2" color="text.secondary" component="span">
              {CHAMBER_LINKS[chamberMode].map((link, i) => (
                <Typography key={link.href} variant="body2" component="span">
                  {i > 0 && ' · '}
                  <MuiLink component={NextLink} href={link.href} underline="hover">
                    {link.label}
                  </MuiLink>
                </Typography>
              ))}
            </Typography>
          </Box>
        </Box>
      </Container>
      <Suspense fallback={null}>
        <BillsBrowse
          chamberMode={chamberMode}
          initialTopic={initialTopic}
          legislatorRoster={legislatorRoster}
          initialBrowse={initialBrowse}
        />
      </Suspense>
    </Box>
  );
}
