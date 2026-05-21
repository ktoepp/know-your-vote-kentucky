'use client';

import React from 'react';
import Link from 'next/link';
import { Card, CardContent } from '@mui/material';
import { useTheme } from '@mui/material/styles';
import { OpenInNew } from '@mui/icons-material';
import type { KYLegislator } from '@/types/kentucky';
import { LegislatorIdentityBlock } from '@/components/civic/LegislatorIdentityBlock';
import { MemberName } from '@/components/civic/MemberName';
import { MetaChip } from '@/components/ui/Chip';
import { legislatorRoleDistrictLine } from '@/lib/legislator-display';
import { CARD } from '@/lib/ui-tokens';
import {
  kyLegislatorAvatarInitials,
  kyLegislatorPortraitAlt,
  normalizeLegislatorPhotoUrl,
} from '@/lib/ky-member-utils';

export interface MemberCompactCardProps {
  /** Resolved legislator — drives portrait, party badge, and title/district subtitle. */
  leg?: KYLegislator | null;
  /** Fallback name when no legislator is resolved (e.g. an unmatched calendar reference). */
  displayName: string;
  /** Profile destination. When the target is an external page (e.g. LRC), set `external`. */
  profileHref: string | null;
  external?: boolean;
  /** Optional context role (e.g. committee "Chair"). */
  roleLabel?: string | null;
  /** Heading level for the member name. @default 'h3' */
  profileNameHeading?: 'h2' | 'h3' | 'h4';
}

function initialsFromName(name: string): string {
  const parts = name.replace(/\([^)]*\)/g, '').trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return '?';
  const first = parts[0]!.charAt(0);
  const last = parts.length > 1 ? parts[parts.length - 1]!.charAt(0) : '';
  return (first + last).toUpperCase() || '?';
}

/**
 * Compact, clickable member card for rosters and member lists (e.g. committee members).
 * Party is conveyed by the avatar rim badge only — no separate party chip.
 */
export function MemberCompactCard({
  leg,
  displayName,
  profileHref,
  external = false,
  roleLabel,
  profileNameHeading = 'h3',
}: MemberCompactCardProps) {
  const theme = useTheme();
  const clickable = Boolean(profileHref);
  const portraitSrc = leg
    ? normalizeLegislatorPhotoUrl(leg.photo_url) || normalizeLegislatorPhotoUrl(leg.legiscan_image_url) || undefined
    : undefined;
  const initials = leg ? kyLegislatorAvatarInitials(leg) : initialsFromName(displayName);
  const ariaName = leg?.name?.trim() || displayName;

  return (
    <Card
      elevation={1}
      sx={{
        height: '100%',
        position: 'relative',
        borderRadius: CARD.borderRadius,
        border: `1px solid ${theme.palette.divider}`,
        transition: CARD.hoverTransition,
        ...(clickable && {
          cursor: 'pointer',
          '&:has(.member-card-stretch-link:focus-visible)': {
            outline: `2px solid ${theme.palette.primary.main}`,
            outlineOffset: 2,
          },
          '&:hover': {
            boxShadow: 4,
            transform: CARD.hoverTransform,
            borderColor: theme.palette.primary.main,
          },
        }),
      }}
    >
      {profileHref && (
        <Link
          href={profileHref}
          className="member-card-stretch-link"
          {...(external ? { target: '_blank', rel: 'noopener noreferrer' } : {})}
          aria-label={`View profile for ${ariaName}`}
          style={{
            position: 'absolute',
            inset: 0,
            zIndex: 1,
            borderRadius: theme.spacing(CARD.borderRadius),
            textDecoration: 'none',
          }}
        >
          <span className="sr-only">View profile</span>
        </Link>
      )}
      <CardContent
        sx={{
          p: CARD.padding,
          '&:last-child': { pb: { xs: 2, sm: 2.5 } },
          position: 'relative',
          zIndex: 2,
          pointerEvents: clickable ? 'none' : undefined,
        }}
      >
        <LegislatorIdentityBlock
          name={
            leg ? (
              <>
                <MemberName member={leg} variant="primary" />
                {external && (
                  <OpenInNew sx={{ fontSize: '0.85rem', opacity: 0.55, ml: 0.5, verticalAlign: 'middle' }} aria-hidden />
                )}
              </>
            ) : (
              displayName
            )
          }
          nameComponent={profileNameHeading}
          roleLine={leg ? legislatorRoleDistrictLine(leg) : 'LRC legislator profile'}
          density="compact"
          avatar={{
            src: portraitSrc,
            alt: leg ? kyLegislatorPortraitAlt(leg) : displayName,
            party: leg?.party,
            initials,
            showPartyBadge: Boolean(leg),
            imgProps: { referrerPolicy: 'no-referrer' },
          }}
          chips={roleLabel ? <MetaChip label={roleLabel} size="small" tone="primary" variant="outlined" /> : undefined}
        />
      </CardContent>
    </Card>
  );
}
