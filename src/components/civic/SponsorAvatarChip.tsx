'use client';

import React from 'react';
import { useRouter } from 'next/navigation';
import { Chip } from '@mui/material';
import { LegislatorAvatar } from '@/components/members/LegislatorAvatar';
import { formatMemberDisplay, memberSlug, normalizeLegislatorPhotoUrl, kySponsorPortraitAlt } from '@/lib/ky-member-utils';
import { formatPartyLetterAbbrev } from '@/lib/bill-display';
import { CHIP } from '@/lib/ui-tokens';

function initials(name: string) {
  const parts = name.split(/\s+/).filter(Boolean);
  if (parts.length >= 2) return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
  return name.slice(0, 2).toUpperCase();
}

export interface SponsorAvatarChipProps {
  name: string;
  party?: string;
  photoUrl?: string | null;
  variant?: 'filled' | 'outlined';
}

export function SponsorAvatarChip({
  name,
  party,
  photoUrl,
  variant = 'outlined',
}: SponsorAvatarChipProps) {
  const router = useRouter();
  const slug = memberSlug(name);
  const href = `/members/${slug}`;
  const label = formatMemberDisplay({ name }, 'primary');
  const partyAbbrev = formatPartyLetterAbbrev(party);
  return (
    <Chip
      clickable
      size="medium"
      variant={variant}
      onClick={(e) => {
        e.preventDefault();
        e.stopPropagation();
        router.push(href);
      }}
      avatar={
        <LegislatorAvatar
          src={normalizeLegislatorPhotoUrl(photoUrl) || undefined}
          alt={kySponsorPortraitAlt(name)}
          imgProps={{ referrerPolicy: 'no-referrer' }}
          party={party}
          initials={initials(name)}
          sx={{
            width: 24,
            height: 24,
            fontSize: '0.65rem',
          }}
        />
      }
      label={label}
      title={partyAbbrev ? `${name} · ${partyAbbrev}` : name}
      sx={{ ...CHIP.standard, ...CHIP.avatar }}
    />
  );
}
