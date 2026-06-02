'use client';

import React from 'react';
import { Cancel, Check } from '@mui/icons-material';
import { MetaChip, type ChipTone } from '@/components/ui/Chip';

/**
 * Shared status chip for activity timelines (LandingPersonalStrip,
 * ProfileActivitySection). The site theme has a global outlined-chip override
 * (`theme.ts` MuiChip.outlined) that strips MUI's color-tone borders, so we
 * override here explicitly to match the bill-card success/error pattern
 * (BillStatusMetaChip uses the same icon + colored border combo).
 */
export function ActivityStatusChip({
  label,
  tone,
}: {
  label: string;
  tone: ChipTone;
}) {
  return (
    <MetaChip
      label={label}
      tone={tone}
      size="small"
      variant="outlined"
      icon={
        tone === 'success' ? (
          <Check sx={{ fontSize: '0.95rem !important' }} />
        ) : tone === 'error' ? (
          <Cancel sx={{ fontSize: '0.95rem !important' }} />
        ) : undefined
      }
      sx={{
        ...(tone === 'success' && {
          color: 'success.main',
          borderColor: 'success.main !important',
          '& .MuiChip-icon': { color: 'success.main' },
        }),
        ...(tone === 'error' && {
          color: 'error.main',
          borderColor: 'error.main !important',
          '& .MuiChip-icon': { color: 'error.main' },
        }),
        ...(tone === 'primary' && {
          color: 'primary.main',
          borderColor: 'primary.main !important',
        }),
        ...(tone === 'info' && {
          color: 'info.main',
          borderColor: 'info.main !important',
        }),
      }}
    />
  );
}
