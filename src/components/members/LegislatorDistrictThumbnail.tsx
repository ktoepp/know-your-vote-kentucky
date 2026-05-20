'use client';

import React from 'react';
import { Box, Typography } from '@mui/material';
import type { KYLegislator } from '@/types/kentucky';
import { parseKyDistrictNumber } from '@/lib/ky-district-geo';
import { formatKyLegislatorDistrict } from '@/lib/bill-display';

const HEIGHT: Record<'card' | 'profile', number> = { card: 120, profile: 200 };

export interface LegislatorDistrictThumbnailProps {
  leg: Pick<KYLegislator, 'chamber' | 'district' | 'name'>;
  size?: 'card' | 'profile';
}

/**
 * Static district map thumbnail (Mapbox Static Images API via /api/geo/district-thumbnail).
 * One cached <img> per card — no WebGL — so it scales to a full roster. Use the live
 * LegislatorDistrictMinimap only where a single interactive map is needed.
 */
export function LegislatorDistrictThumbnail({ leg, size = 'card' }: LegislatorDistrictThumbnailProps) {
  const [error, setError] = React.useState(false);
  const chamber = leg.chamber === 'house' || leg.chamber === 'senate' ? leg.chamber : null;
  const districtName = chamber ? parseKyDistrictNumber(leg.district) : null;
  if (!chamber || !districtName) return null;

  const districtLabel = formatKyLegislatorDistrict(leg) || 'district';
  const ariaLabel = `Map highlighting ${districtLabel} in Kentucky`;
  const height = HEIGHT[size];

  if (error) {
    return (
      <Box
        role="img"
        aria-label={ariaLabel}
        sx={{
          height,
          borderRadius: 2,
          bgcolor: 'action.hover',
          border: '1px solid',
          borderColor: 'divider',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          px: 1,
        }}
      >
        <Typography variant="caption" color="text.secondary" textAlign="center">
          District map unavailable
        </Typography>
      </Box>
    );
  }

  const src = `/api/geo/district-thumbnail?chamber=${chamber}&district=${encodeURIComponent(leg.district ?? '')}&size=${size}`;

  return (
    <Box
      sx={{
        height,
        borderRadius: 2,
        overflow: 'hidden',
        border: '1px solid',
        borderColor: 'divider',
        bgcolor: 'action.hover',
      }}
    >
      {/* eslint-disable-next-line @next/next/no-img-element -- external static map; next/image adds no value for a redirected single asset */}
      <img
        src={src}
        alt={ariaLabel}
        loading="lazy"
        decoding="async"
        onError={() => setError(true)}
        style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }}
      />
    </Box>
  );
}
