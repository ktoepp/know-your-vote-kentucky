'use client';

import React from 'react';
import Link from 'next/link';
import { Box, Card, CardContent, Typography } from '@mui/material';
import { useTheme } from '@mui/material/styles';
import { OpenInNew } from '@mui/icons-material';
import type { KYLegislator } from '@/types/kentucky';
import { MemberName } from '@/components/civic/MemberName';
import { LegislatorAvatar } from '@/components/members/LegislatorAvatar';
import { MetaChip } from '@/components/ui/Chip';
import { formatKyLegislatorDistrict } from '@/lib/bill-display';
import {
  kyLegislatorAvatarInitials,
  kyLegislatorPortraitAlt,
  kyMemberTitleShort,
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

function subtitleFor(leg: KYLegislator): string {
  const title = kyMemberTitleShort(leg);
  const district = formatKyLegislatorDistrict(leg);
  return district ? `${title} · ${district}` : title;
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
        borderRadius: 3,
        border: `1px solid ${theme.palette.divider}`,
        transition: 'all 0.2s ease',
        ...(clickable && {
          cursor: 'pointer',
          '&:has(.member-card-stretch-link:focus-visible)': {
            outline: `2px solid ${theme.palette.primary.main}`,
            outlineOffset: 2,
          },
          '&:hover': {
            boxShadow: 4,
            transform: 'translateY(-2px)',
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
            borderRadius: theme.spacing(3),
            textDecoration: 'none',
          }}
        >
          <span className="sr-only">View profile</span>
        </Link>
      )}
      <CardContent
        sx={{
          display: 'flex',
          gap: 2,
          alignItems: 'center',
          p: 2,
          '&:last-child': { pb: 2 },
          position: 'relative',
          zIndex: 2,
          pointerEvents: clickable ? 'none' : undefined,
        }}
      >
        <LegislatorAvatar
          src={portraitSrc}
          alt={leg ? kyLegislatorPortraitAlt(leg) : displayName}
          imgProps={{ referrerPolicy: 'no-referrer' }}
          party={leg?.party}
          initials={initials}
          showPartyBadge={Boolean(leg)}
          sx={{ width: 56, height: 56, fontSize: '1.1rem', fontWeight: 700 }}
        />
        <Box sx={{ minWidth: 0, flex: 1 }}>
          <Typography
            component={profileNameHeading}
            variant="subtitle1"
            fontWeight={700}
            color="text.primary"
            sx={{ lineHeight: 1.3, m: 0 }}
          >
            {leg ? <MemberName member={leg} variant="primary" /> : displayName}
            {external && (
              <OpenInNew sx={{ fontSize: '0.85rem', opacity: 0.55, ml: 0.5, verticalAlign: 'middle' }} aria-hidden />
            )}
          </Typography>
          <Typography variant="body2" color="text.secondary" sx={{ mt: 0.25 }}>
            {leg ? subtitleFor(leg) : 'LRC legislator profile'}
          </Typography>
          {roleLabel && (
            <MetaChip label={roleLabel} size="small" tone="primary" variant="outlined" sx={{ mt: 0.75 }} />
          )}
        </Box>
      </CardContent>
    </Card>
  );
}
