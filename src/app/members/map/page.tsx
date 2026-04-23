'use client';

import dynamic from 'next/dynamic';
import { Box, CircularProgress, Container, Typography } from '@mui/material';

const DistrictMapExplorer = dynamic(() => import('@/components/members/DistrictMapExplorer'), {
  ssr: false,
  loading: () => (
    <Box sx={{ display: 'flex', justifyContent: 'center', py: 10 }}>
      <CircularProgress />
    </Box>
  ),
});

export default function MembersDistrictMapPage() {
  return (
    <Box sx={{ minHeight: '100vh', bgcolor: 'background.default' }}>
      <Container maxWidth="xl" sx={{ py: 4 }}>
        <Typography variant="h4" component="h1" fontWeight={700} gutterBottom>
          Find your legislators
        </Typography>
        <Typography variant="body1" color="text.secondary" sx={{ mb: 3 }}>
          Explore Kentucky state House and Senate districts on the map, or search by ZIP code to see which districts
          contain that area and who represents you in our roster.
        </Typography>
        <DistrictMapExplorer />
      </Container>
    </Box>
  );
}
