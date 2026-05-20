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
    >
      <ToggleButton value="house">House</ToggleButton>
      <ToggleButton value="senate">Senate</ToggleButton>
      <ToggleButton value="joint">Joint</ToggleButton>
    </ToggleButtonGroup>
  );
}
