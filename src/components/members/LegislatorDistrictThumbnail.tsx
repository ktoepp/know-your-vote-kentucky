'use client';

import React from 'react';
import Image from 'next/image';
import { Box, Typography } from '@mui/material';
import type { KYLegislator } from '@/types/kentucky';
import { parseKyDistrictNumber } from '@/lib/ky-district-geo';
import { formatKyLegislatorDistrict } from '@/lib/bill-display';

const HEIGHT: Record<'card' | 'profile', number> = { card: 120, profile: 200 };

/**
 * Rendered widths for next/image srcset selection. Committed assets are 2x
 * Mapbox renders (card 1200×560, profile 1440×840) — far larger than the
 * ~200px card slot / ~480px profile column they display in.
 */
const SIZES: Record<'card' | 'profile', string> = {
  card: '200px',
  profile: '(max-width: 899px) 100vw, 480px',
};

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

  return (
    <Box
      sx={{
        position: 'relative',
        height,
        borderRadius: 2,
        overflow: 'hidden',
        border: '1px solid',
        borderColor: 'divider',
        bgcolor: 'action.hover',
        pointerEvents: 'none',
      }}
    >
      {useApiFallback ? (
        // Raw <img>: this route redirects to Mapbox Static Images, which the
        // next/image optimizer must not proxy.
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={`/api/geo/district-thumbnail?chamber=${chamber}&district=${encodeURIComponent(leg.district ?? '')}&size=${size}`}
          alt={ariaLabel}
          loading="lazy"
          decoding="async"
          onError={() => setError(true)}
          style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }}
        />
      ) : (
        <Image
          src={localDistrictThumbSrc(chamber, districtName, size)}
          alt={ariaLabel}
          fill
          sizes={SIZES[size]}
          loading="lazy"
          onError={() => setUseApiFallback(true)}
          style={{ objectFit: 'cover' }}
        />
      )}
    </Box>
  );
}
