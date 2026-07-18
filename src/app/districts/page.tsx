import type { Metadata } from 'next';
import NextLink from 'next/link';
import { Box, Container, Link as MuiLink, Typography } from '@mui/material';
import { JsonLd } from '@/components/seo/JsonLd';
import { buildBreadcrumbJsonLd, buildCollectionPageJsonLd } from '@/lib/structured-data';
import {
  KY_HOUSE_DISTRICT_COUNT,
  KY_SENATE_DISTRICT_COUNT,
  allKyDistrictRefs,
  findLegislatorForKyDistrict,
  kyDistrictPath,
  kyDistrictShortName,
  type KyDistrictRef,
} from '@/lib/ky-district-pages';
import { fetchKyMembersBrowseRoster } from '@/lib/ky-legislator-roster-server';
import { buildPageMetadata } from '@/lib/seo';

export const revalidate = 3600;

const DESCRIPTION =
  'All 100 Kentucky House districts and 38 Senate districts, each with its current member, a district map, and recently sponsored bills.';

export const metadata: Metadata = buildPageMetadata({
  title: 'Kentucky legislative districts — House and Senate',
  description: DESCRIPTION,
  path: '/districts',
});

function DistrictList({
  title,
  refs,
  memberNameFor,
}: {
  title: string;
  refs: KyDistrictRef[];
  memberNameFor: (ref: KyDistrictRef) => string | null;
}) {
  return (
    <Box sx={{ mb: 4 }}>
      <Typography variant="h6" component="h2" fontWeight={700} gutterBottom>
        {title}
      </Typography>
      <Box
        component="ul"
        sx={{
          listStyle: 'none',
          m: 0,
          p: 0,
          display: 'grid',
          gridTemplateColumns: { xs: '1fr', sm: '1fr 1fr' },
          columnGap: 3,
          rowGap: 0.75,
        }}
      >
        {refs.map((ref) => {
          const memberName = memberNameFor(ref);
          return (
            <Box component="li" key={kyDistrictPath(ref)}>
              <Typography variant="body2">
                <MuiLink component={NextLink} href={kyDistrictPath(ref)} underline="hover">
                  {kyDistrictShortName(ref)}
                </MuiLink>
                {memberName && (
                  <Typography component="span" variant="body2" color="text.secondary">
                    {' '}
                    — {memberName}
                  </Typography>
                )}
              </Typography>
            </Box>
          );
        })}
      </Box>
    </Box>
  );
}

export default async function DistrictsIndexPage() {
  const roster = await fetchKyMembersBrowseRoster().catch(() => []);
  const memberNameFor = (ref: KyDistrictRef) =>
    findLegislatorForKyDistrict(roster, ref)?.name ?? null;
  const refs = allKyDistrictRefs();
  const houseRefs = refs.filter((r) => r.chamber === 'house');
  const senateRefs = refs.filter((r) => r.chamber === 'senate');

  return (
    <Container maxWidth="md" sx={{ py: { xs: 4, sm: 6 } }}>
      <JsonLd
        data={[
          buildCollectionPageJsonLd({
            name: 'Kentucky legislative districts',
            description: DESCRIPTION,
            path: '/districts',
          }),
          buildBreadcrumbJsonLd([
            { name: 'Home', path: '/' },
            { name: 'Districts', path: '/districts' },
          ]),
        ]}
      />
      <Typography variant="h4" component="h1" fontWeight={700} gutterBottom>
        Districts
      </Typography>
      <Typography variant="body1" color="text.secondary" sx={{ mb: 4 }}>
        Kentucky has {KY_HOUSE_DISTRICT_COUNT} state House districts and {KY_SENATE_DISTRICT_COUNT}{' '}
        state Senate districts. Select a district to see its current member, map, and recent bills,
        or use{' '}
        <MuiLink component={NextLink} href="/members/map" underline="hover">
          Find my legislators
        </MuiLink>{' '}
        to look up your districts by address.
      </Typography>
      <DistrictList title="House districts" refs={houseRefs} memberNameFor={memberNameFor} />
      <DistrictList title="Senate districts" refs={senateRefs} memberNameFor={memberNameFor} />
    </Container>
  );
}
