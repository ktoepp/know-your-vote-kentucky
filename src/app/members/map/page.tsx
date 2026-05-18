'use client';

import dynamic from 'next/dynamic';
import { Suspense } from 'react';
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
        <Box sx={{ textAlign: 'center', mb: 4 }}>
          <Typography variant="h4" component="h1" fontWeight={700} gutterBottom>
            Find My Legislators
          </Typography>
          <Typography variant="body1" color="text.secondary">
            Enter your address or ZIP code to find your Kentucky House and Senate representatives.
          </Typography>
        </Box>
        <Suspense fallback={<Box sx={{ display: 'flex', justifyContent: 'center', py: 10 }}><CircularProgress /></Box>}>
          <DistrictMapExplorer />
        </Suspense>
      </Container>
    </Box>
  );
}
