import NextLink from 'next/link';
import { Box, Container, Link as MuiLink, Typography } from '@mui/material';
import { DistrictMapExplorerIsland } from '@/components/members/DistrictMapExplorerIsland';

// Server component shell: the heading, intro, and district/member links are in
// the static HTML for the "find my legislator" search intent, while the Mapbox
// explorer hydrates client-side in its island.
export default function MembersDistrictMapPage() {
  return (
    <Box sx={{ minHeight: '100vh', bgcolor: 'background.default' }}>
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
