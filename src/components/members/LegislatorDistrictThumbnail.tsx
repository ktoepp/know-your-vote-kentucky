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

function localDistrictThumbSrc(
  chamber: 'house' | 'senate',
  districtName: string,
  size: 'card' | 'profile',
): string {
  return `/geo/district-thumbs/${chamber}/${districtName}-${size}.webp`;
}

/**
 * Static district map thumbnail — prefers committed assets under public/geo/district-thumbs,
 * then falls back to /api/geo/district-thumbnail (Mapbox Static Images).
 */
export function LegislatorDistrictThumbnail({ leg, size = 'card' }: LegislatorDistrictThumbnailProps) {
  const [error, setError] = React.useState(false);
  const [useApiFallback, setUseApiFallback] = React.useState(false);
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

  const src = useApiFallback
    ? `/api/geo/district-thumbnail?chamber=${chamber}&district=${encodeURIComponent(leg.district ?? '')}&size=${size}`
    : localDistrictThumbSrc(chamber, districtName, size);

  return (
    <Box
      sx={{
        height,
        borderRadius: 2,
        overflow: 'hidden',
        border: '1px solid',
        borderColor: 'divider',
        bgcolor: 'action.hover',
        pointerEvents: 'none',
      }}
    >
      {/* eslint-disable-next-line @next/next/no-img-element -- static map asset; local or API redirect */}
      <img
        src={src}
        alt={ariaLabel}
        loading="lazy"
        decoding="async"
        onError={() => {
          if (!useApiFallback) setUseApiFallback(true);
          else setError(true);
        }}
        style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }}
      />
    </Box>
  );
}
