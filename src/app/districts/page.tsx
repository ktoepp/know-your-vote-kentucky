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
  kyDistrictMapPath,
  kyDistrictPath,
  kyDistrictShortName,
  type KyDistrictRef,
} from '@/lib/ky-district-pages';
import { fetchKyMembersBrowseRoster } from '@/lib/ky-legislator-roster-server';
import { partyBadgeBackgroundColor } from '@/lib/bill-display';
import { buildPageMetadata } from '@/lib/seo';

export const revalidate = 3600;

const DESCRIPTION =
  'All 100 Kentucky House districts and 38 Senate districts, each with its current member, a district map, and recently sponsored bills.';

export const metadata: Metadata = buildPageMetadata({
  title: 'Kentucky legislative districts: House and Senate',
  description: DESCRIPTION,
  path: '/districts',
});

function DistrictList({
  title,
  caption,
  refs,
  memberFor,
}: {
  title: string;
  caption: string;
  refs: KyDistrictRef[];
  memberFor: (ref: KyDistrictRef) => { name: string; party: string | null } | null;
}) {
  return (
    <Box component="section" sx={{ mb: 5 }}>
      <Typography variant="h6" component="h2" fontWeight={700}>
        {title}
      </Typography>
      <Typography variant="body2" color="text.tertiary" sx={{ mb: 2 }}>
        {caption}
      </Typography>
      <Box
        component="ul"
        sx={{
          listStyle: 'none',
          m: 0,
          p: 0,
          display: 'grid',
          gridTemplateColumns: {
            xs: 'repeat(auto-fill, minmax(150px, 1fr))',
            sm: 'repeat(auto-fill, minmax(180px, 1fr))',
          },
          gap: 1.5,
        }}
      >
        {refs.map((ref) => {
          const member = memberFor(ref);
          return (
            <Box component="li" key={kyDistrictPath(ref)} sx={{ display: 'flex' }}>
              <MuiLink
                component={NextLink}
                href={kyDistrictMapPath(ref)}
                underline="none"
                sx={{
                  display: 'flex',
                  flexDirection: 'column',
                  gap: 0.25,
                  flex: 1,
                  minWidth: 0,
                  p: 1.5,
                  border: '1px solid',
                  borderColor: 'divider',
                  borderRadius: 2,
                  bgcolor: 'background.paper',
                  color: 'text.primary',
                  '@media (prefers-reduced-motion: no-preference)': {
                    transition: 'border-color .15s ease, box-shadow .15s ease',
                  },
                  '&:hover': {
                    borderColor: 'primary.main',
                    boxShadow: 'var(--shadow-md, 0 4px 12px rgba(15,23,42,.06))',
                  },
                  '&:focus-visible': { outline: '2px solid', outlineColor: 'primary.main', outlineOffset: 2 },
                }}
              >
                <Typography variant="subtitle2" component="span" fontWeight={700}>
                  {kyDistrictShortName(ref)}
                </Typography>
                {member ? (
                  <Typography
                    variant="caption"
                    component="span"
                    color="text.secondary"
                    sx={{ display: 'flex', alignItems: 'center', gap: 0.75, minWidth: 0 }}
                  >
                    <Box
                      component="span"
                      aria-hidden
                      sx={{
                        width: 8,
                        height: 8,
                        borderRadius: '50%',
                        flexShrink: 0,
                        bgcolor: partyBadgeBackgroundColor(member.party),
                      }}
                    />
                    <Box component="span" sx={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {member.name}
                    </Box>
                  </Typography>
                ) : (
                  <Typography variant="caption" component="span" color="text.tertiary">
                    Seat vacant
                  </Typography>
                )}
              </MuiLink>
            </Box>
          );
        })}
      </Box>
    </Box>
  );
}

export default async function DistrictsIndexPage() {
  const roster = await fetchKyMembersBrowseRoster().catch(() => []);
  const memberFor = (ref: KyDistrictRef) => {
    const leg = findLegislatorForKyDistrict(roster, ref);
    return leg ? { name: leg.name, party: leg.party ?? null } : null;
  };
  const refs = allKyDistrictRefs();
  const houseRefs = refs.filter((r) => r.chamber === 'house');
  const senateRefs = refs.filter((r) => r.chamber === 'senate');

  return (
    <Container maxWidth="lg" sx={{ py: { xs: 4, sm: 6 } }}>
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
        state Senate districts. Select a district to see it on the map, or use{' '}
        <MuiLink component={NextLink} href="/members/map" underline="hover">
          Find my legislators
        </MuiLink>{' '}
        to look up your districts by address.
      </Typography>
      <DistrictList
        title="House districts"
        caption={`${KY_HOUSE_DISTRICT_COUNT} seats · two-year terms`}
        refs={houseRefs}
        memberFor={memberFor}
      />
      <DistrictList
        title="Senate districts"
        caption={`${KY_SENATE_DISTRICT_COUNT} seats · four-year terms`}
        refs={senateRefs}
        memberFor={memberFor}
      />
    </Container>
  );
}
