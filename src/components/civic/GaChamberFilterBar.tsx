'use client';

import React from 'react';
import { ToggleButton, ToggleButtonGroup } from '@mui/material';
import type { SxProps, Theme } from '@mui/material/styles';
import type { GaChamberFilter } from '@/lib/ky-committee-display';

/**
 * Canonical pill styling for segmented "chamber" toggles. Exported so the
 * non-committee chamber toggles (Members browse, the district map) render
 * identically without duplicating the look. Apply as the `sx` on a
 * `ToggleButtonGroup` whose buttons are the chamber options.
 */
export const CHAMBER_TOGGLE_GROUP_SX: SxProps<Theme> = {
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
};

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
      sx={CHAMBER_TOGGLE_GROUP_SX}
    >
      <ToggleButton value="house">House</ToggleButton>
      <ToggleButton value="senate">Senate</ToggleButton>
      <ToggleButton value="joint">Joint</ToggleButton>
    </ToggleButtonGroup>
  );
}
