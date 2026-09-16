import NextLink from 'next/link';
import { preload } from 'react-dom';
import { Box, Container, Link as MuiLink, Typography } from '@mui/material';
import { DistrictMapExplorerIsland } from '@/components/members/DistrictMapExplorerIsland';
import {
  HOUSE_GEOJSON_URL,
  MEMBERS_ROSTER_URL,
  SENATE_GEOJSON_URL,
} from '@/components/members/district-map-sources';

// Server component shell: the heading, intro, and district/member links are in
// the static HTML for the "find my legislator" search intent, while the Mapbox
// explorer hydrates client-side in its island.
export default function MembersDistrictMapPage() {
  // Start the three fetches the lookup needs (boundaries ×2, roster) from the
  // HTML head instead of after the client bundle has parsed. `crossOrigin:
  // 'anonymous'` matches `fetch()`'s default credentials mode so the preloaded
  // responses are actually reused. Mapbox style + tiles come from api.mapbox.com;
  // that preconnect is a plain <link> (React hoists it) because react-dom's
  // preconnect() only reached the flight payload here, not the document head.
  preload(HOUSE_GEOJSON_URL, { as: 'fetch', crossOrigin: 'anonymous' });
  preload(SENATE_GEOJSON_URL, { as: 'fetch', crossOrigin: 'anonymous' });
  preload(MEMBERS_ROSTER_URL, { as: 'fetch', crossOrigin: 'anonymous' });
  return (
    <Box sx={{ minHeight: '100vh', bgcolor: 'background.default' }}>
      <link rel="preconnect" href="https://api.mapbox.com" crossOrigin="anonymous" />
      <Container maxWidth="xl" sx={{ py: 4 }}>
        <Box sx={{ textAlign: 'center', mb: 4 }}>
          <Typography variant="h4" component="h1" fontWeight={700} gutterBottom>
            Find my legislators
          </Typography>
          <Typography variant="body1" color="text.secondary">
            Enter your address or ZIP code to find your Kentucky House and Senate representatives.
          </Typography>
          <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
            Prefer to browse? See all 138{' '}
            <MuiLink component={NextLink} href="/districts" underline="hover">
              Kentucky legislative districts
            </MuiLink>{' '}
            or the full{' '}
            <MuiLink component={NextLink} href="/members" underline="hover">
              member roster
            </MuiLink>
            . The{' '}
            <MuiLink
              component={NextLink}
              href="/guides/find-your-kentucky-legislator"
              underline="hover"
            >
              guide to finding your legislators
            </MuiLink>{' '}
            explains what the results show.
          </Typography>
        </Box>
        <DistrictMapExplorerIsland />
      </Container>
    </Box>
  );
}
