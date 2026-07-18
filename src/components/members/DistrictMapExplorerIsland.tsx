'use client';

import dynamic from 'next/dynamic';
import { Suspense } from 'react';
import { Box, CircularProgress } from '@mui/material';

// Mapbox GL only runs in the browser — `ssr: false` requires a client component,
// so this island wraps the explorer while the page itself stays a server
// component with crawlable heading + links.
const DistrictMapExplorer = dynamic(() => import('@/components/members/DistrictMapExplorer'), {
  ssr: false,
  loading: () => (
    <Box sx={{ display: 'flex', justifyContent: 'center', py: 10 }}>
      <CircularProgress />
    </Box>
  ),
});

export function DistrictMapExplorerIsland() {
  return (
    <Suspense
      fallback={
        <Box sx={{ display: 'flex', justifyContent: 'center', py: 10 }}>
          <CircularProgress />
        </Box>
      }
    >
      <DistrictMapExplorer />
    </Suspense>
  );
}
