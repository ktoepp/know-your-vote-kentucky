'use client';

import React from 'react';
import NextLink from 'next/link';
import { Box, Typography } from '@mui/material';
import { LegislatorAvatar } from '@/components/members/LegislatorAvatar';
import { legislatorAvatarSx, type LegislatorAvatarDensity } from '@/lib/legislator-display';
import { LEGISLATOR_NAME_SX, LEGISLATOR_ROLE_LINE_SX } from '@/lib/ui-tokens';

export interface LegislatorIdentityBlockProps {
  name: React.ReactNode;
  /** Representative · House District 26 — one typography step below the name. */
  roleLine?: string | null;
  avatar: {
    src?: string;
    alt: string;
    party?: string | null;
    initials: string;
    showPartyBadge?: boolean;
    imgProps?: React.ComponentProps<typeof LegislatorAvatar>['imgProps'];
  };
  density?: LegislatorAvatarDensity;
  /** Heading element for the name (accessibility / outline). */
  nameComponent?: React.ElementType;
  /** When set, the name links to the member profile. */
  nameHref?: string;
  /** Status / context chips (Primary sponsor, Chair, …) — rendered below the role line. */
  chips?: React.ReactNode;
  gap?: number;
  avatarSx?: React.ComponentProps<typeof LegislatorAvatar>['sx'];
}

/**
 * Shared legislator header: portrait (party badge) + name + role/district subheading.
 */
export function LegislatorIdentityBlock({
  name,
  roleLine,
  avatar,
  density = 'card',
  nameComponent = 'div',
  nameHref,
  chips,
  gap = 2,
  avatarSx,
}: LegislatorIdentityBlockProps) {
  return (
    <Box sx={{ display: 'flex', gap, alignItems: 'flex-start', minWidth: 0 }}>
      <LegislatorAvatar
        src={avatar.src}
        alt={avatar.alt}
        party={avatar.party}
        initials={avatar.initials}
        showPartyBadge={avatar.showPartyBadge ?? true}
        imgProps={avatar.imgProps}
        sx={[legislatorAvatarSx(density), ...(Array.isArray(avatarSx) ? avatarSx : avatarSx ? [avatarSx] : [])]}
      />
      <Box sx={{ minWidth: 0, flex: 1 }}>
        {nameHref ? (
          <Typography
            component={NextLink}
            href={nameHref}
            {...LEGISLATOR_NAME_SX}
            sx={{
              ...LEGISLATOR_NAME_SX,
              color: 'inherit',
              textDecoration: 'none',
              display: 'block',
              '&:hover': { textDecoration: 'underline' },
            }}
            noWrap
          >
            {name}
          </Typography>
        ) : (
          <Typography component={nameComponent} {...LEGISLATOR_NAME_SX}>
            {name}
          </Typography>
        )}
        {roleLine ? (
          <Typography component="p" sx={{ ...LEGISLATOR_ROLE_LINE_SX, mt: 0.25 }}>
            {roleLine}
          </Typography>
        ) : null}
        {chips ? (
          <Box sx={{ display: 'flex', gap: 0.5, flexWrap: 'wrap', mt: roleLine ? 0.5 : 0.25, alignItems: 'center' }}>
            {chips}
          </Box>
        ) : null}
      </Box>
    </Box>
  );
}
