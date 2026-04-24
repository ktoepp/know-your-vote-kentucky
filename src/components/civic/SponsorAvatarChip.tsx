'use client';

import React from 'react';
import { useRouter } from 'next/navigation';
import { Chip, Avatar } from '@mui/material';
import { formatMemberDisplay, memberSlug } from '@/lib/ky-member-utils';
import { formatRepresentativePartyChipLabel } from '@/lib/bill-display';
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
  const label = formatMemberDisplay({ name, party }, 'compact');
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
        <Avatar
          src={photoUrl || undefined}
          sx={{
            width: 24,
            height: 24,
            fontSize: '0.65rem',
          }}
        >
          {initials(name)}
        </Avatar>
      }
      label={label}
      title={party ? `${name} · ${formatRepresentativePartyChipLabel(party)}` : name}
      sx={{ ...CHIP.standard, ...CHIP.avatar }}
    />
  );
}
