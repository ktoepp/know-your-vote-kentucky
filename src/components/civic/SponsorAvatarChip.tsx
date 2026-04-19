'use client';

import React from 'react';
import { useRouter } from 'next/navigation';
import { Chip, Avatar } from '@mui/material';
import { memberSlug } from '@/lib/ky-member-utils';
import { formatRepresentativePartyChipLabel } from '@/lib/bill-display';

function initials(name: string) {
  const parts = name.split(/\s+/).filter(Boolean);
  if (parts.length >= 2) return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
  return name.slice(0, 2).toUpperCase();
}

export interface SponsorAvatarChipProps {
  name: string;
  party?: string;
  photoUrl?: string | null;
  size?: 'small' | 'medium';
}

export function SponsorAvatarChip({ name, party, photoUrl, size = 'small' }: SponsorAvatarChipProps) {
  const router = useRouter();
  const slug = memberSlug(name);
  const href = `/members#${slug}`;
  return (
    <Chip
      clickable
      size={size}
      onClick={(e) => {
        e.preventDefault();
        e.stopPropagation();
        router.push(href);
      }}
      avatar={
        <Avatar src={photoUrl || undefined} sx={{ width: 24, height: 24, fontSize: '0.65rem' }}>
          {initials(name)}
        </Avatar>
      }
      label={name}
      title={party ? `${name} · ${formatRepresentativePartyChipLabel(party)}` : name}
      sx={{
        fontWeight: 600,
        fontSize: '0.72rem',
        height: 28,
        maxWidth: '100%',
        '& .MuiChip-label': { overflow: 'hidden', textOverflow: 'ellipsis' },
        '& .MuiChip-avatar': { ml: 0.5 },
      }}
    />
  );
}
