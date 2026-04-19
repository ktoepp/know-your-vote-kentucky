'use client';

import React from 'react';
import Chip from '@mui/material/Chip';

export const KENTUCKY_GOVERNOR_OFFICE_URL = 'https://governor.ky.gov';

export interface GovernorBeshearChipProps {
  /** `hero` — outlined chip for the home gradient; `default` — for light backgrounds */
  variant?: 'hero' | 'default';
}

/**
 * Link to the Office of the Governor (current term: Andy Beshear).
 * Uses a plain anchor — Next.js `<Link>` must not wrap external URLs on MUI `Chip` (can blank the page in dev).
 */
export function GovernorBeshearChip({ variant = 'default' }: GovernorBeshearChipProps) {
  if (variant === 'hero') {
    return (
      <Chip
        component="a"
        href={KENTUCKY_GOVERNOR_OFFICE_URL}
        target="_blank"
        rel="noopener noreferrer"
        label="Governor Andy Beshear"
        clickable
        size="small"
        variant="outlined"
        sx={{
          color: 'inherit',
          borderColor: 'rgba(255,255,255,0.55)',
          fontWeight: 600,
          textDecoration: 'none',
          '&:hover': {
            borderColor: 'rgba(255,255,255,0.95)',
            bgcolor: 'rgba(255,255,255,0.12)',
          },
        }}
      />
    );
  }

  return (
    <Chip
      component="a"
      href={KENTUCKY_GOVERNOR_OFFICE_URL}
      target="_blank"
      rel="noopener noreferrer"
      label="Governor Andy Beshear"
      clickable
      size="small"
      variant="outlined"
      color="secondary"
      sx={{ fontWeight: 600, textDecoration: 'none' }}
    />
  );
}
