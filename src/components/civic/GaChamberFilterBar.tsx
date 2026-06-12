'use client';

import React from 'react';
import { ToggleButton, ToggleButtonGroup } from '@mui/material';
import type { GaChamberFilter } from '@/lib/ky-committee-display';

export interface GaChamberFilterBarProps {
  value: GaChamberFilter;
  onChange: (value: GaChamberFilter) => void;
  'aria-label'?: string;
}

/**
 * House / Senate / Joint chamber filter for GA committee surfaces.
 * No "All" toggle — empty value means show every chamber (see decisions.md § 2026-05-18).
 */
export function GaChamberFilterBar({
  value,
  onChange,
  'aria-label': ariaLabel = 'Filter by chamber',
}: GaChamberFilterBarProps) {
  return (
    <ToggleButtonGroup
      value={value}
      exclusive
      size="small"
      onChange={(_, v) => onChange((v ?? '') as GaChamberFilter)}
      aria-label={ariaLabel}
      sx={{
        gap: 1,
        flexWrap: 'wrap',
        '& .MuiToggleButtonGroup-grouped': {
          border: '1px solid',
          borderColor: 'divider',
          borderRadius: '999px !important',
          px: 1.75,
          py: 0.5,
          minHeight: { xs: 44, sm: 'auto' },
          bgcolor: 'background.paper',
          color: 'text.secondary',
          textTransform: 'none',
          fontWeight: 500,
          '&.Mui-selected': {
            bgcolor: 'primary.main',
            color: 'primary.contrastText',
            borderColor: 'primary.main',
            '&:hover': { bgcolor: 'primary.dark' },
          },
        },
      }}
    >
      <ToggleButton value="house">House</ToggleButton>
      <ToggleButton value="senate">Senate</ToggleButton>
      <ToggleButton value="joint">Joint</ToggleButton>
    </ToggleButtonGroup>
  );
}
