'use client';

import dynamic from 'next/dynamic';
import { Box, Skeleton } from '@mui/material';
import type { LegislatorDistrictMinimapProps } from '@/components/members/LegislatorDistrictMinimap';

const LegislatorDistrictMinimap = dynamic(
  () =>
    import('@/components/members/LegislatorDistrictMinimap').then((m) => m.LegislatorDistrictMinimap),
  {
    ssr: false,
    loading: () => (
      <Box sx={{ width: '100%' }}>
        <Skeleton variant="rounded" height={120} animation="wave" />
      </Box>
    ),
  },
);

export function LegislatorDistrictMinimapLazy(props: LegislatorDistrictMinimapProps) {
  return <LegislatorDistrictMinimap {...props} />;
}
