'use client';

import { Suspense } from 'react';
import { Box, CircularProgress } from '@mui/material';
import DistrictMapExplorer from '@/components/members/DistrictMapExplorer';

// The explorer (form, boundary data, point-in-polygon lookup, result cards) no
// longer imports Mapbox GL directly — `DistrictMapCanvas` is its own `ssr: false`
// chunk — so it renders on the server and hydrates ahead of the map library.
// Suspense is for `useSearchParams` (static page → client bailout).
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
