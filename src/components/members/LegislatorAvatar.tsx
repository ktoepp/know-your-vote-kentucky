'use client';

import React from 'react';
import Image from 'next/image';
import { Avatar, Box, type AvatarProps } from '@mui/material';
import { formatPartyLetterAbbrev, partyBadgeBackgroundColor } from '@/lib/bill-display';
import { isOptimizedPortraitUrl } from '@/lib/ky-member-utils';

export interface LegislatorAvatarProps extends Omit<AvatarProps, 'children'> {
  /** Display initials when no image */
  initials: string;
  party?: string | null;
  /** Hide party rim badge when unknown */
  showPartyBadge?: boolean;
}

/**
 * Legislator portrait with optional D/R/I badge (bottom-right). Use on cards, bill sponsors, and map tooltips.
 */
export function LegislatorAvatar({
  party,
  initials,
  showPartyBadge = true,
  sx,
  src,
  alt,
  imgProps,
  ...avatarProps
}: LegislatorAvatarProps) {
  // State portrait hosts serve original-resolution photos (multi-MB); route
  // them through next/image for an edge-resized version. On optimizer failure
  // fall back to the plain <img> path (which itself falls back to initials).
  const [optimizerFailed, setOptimizerFailed] = React.useState(false);
  const optimized = Boolean(src) && !optimizerFailed && isOptimizedPortraitUrl(src);

  const abbrev = formatPartyLetterAbbrev(party);
  const badgeVisible = showPartyBadge && Boolean(abbrev);
  const size = typeof sx === 'object' && sx && 'width' in sx ? Number(sx.width) : 40;
  const badgeSize = size <= 36 ? 14 : 16;
  const fontSize = badgeSize <= 14 ? '0.55rem' : '0.62rem';

  return (
    <Box
      sx={{
        position: 'relative',
        display: 'inline-flex',
        flexShrink: 0,
        lineHeight: 0,
      }}
    >
      <Avatar sx={sx} {...(optimized ? {} : { src, alt, imgProps })} {...avatarProps}>
        {optimized && src ? (
          <Image
            src={src}
            alt={alt ?? ''}
            fill
            sizes="88px"
            referrerPolicy={imgProps?.referrerPolicy}
            onError={() => setOptimizerFailed(true)}
            style={{ objectFit: 'cover' }}
          />
        ) : (
          initials
        )}
      </Avatar>
      {badgeVisible ? (
        <Box
          component="span"
          aria-hidden
          sx={{
            position: 'absolute',
            right: -2,
            bottom: -2,
            width: badgeSize,
            height: badgeSize,
            borderRadius: '50%',
            bgcolor: partyBadgeBackgroundColor(party),
            color: '#fff',
            fontSize,
            fontWeight: 800,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            border: '2px solid',
            borderColor: 'background.paper',
            lineHeight: 1,
            pointerEvents: 'none',
          }}
        >
          {abbrev}
        </Box>
      ) : null}
    </Box>
  );
}
