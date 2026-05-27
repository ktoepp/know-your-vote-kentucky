'use client';

import React from 'react';
import { Grid } from '@mui/material';
import type { GridProps } from '@mui/material';
import { GRID } from '@/lib/ui-tokens';

/**
 * Standard responsive card grid container. Pairs with `<CardGridItem>` so every
 * browse/search/feed surface shares the same spacing and breakpoints (see `GRID`
 * in `ui-tokens.ts`). Use `spacing`/`sx` only for deliberate exceptions.
 */
export function CardGrid({
  children,
  spacing = GRID.spacing,
  sx,
}: {
  children: React.ReactNode;
  spacing?: GridProps['spacing'];
  sx?: GridProps['sx'];
}) {
  return (
    <Grid container spacing={spacing} sx={sx}>
      {children}
    </Grid>
  );
}

/** Standard grid item: 1 col mobile / 2 tablet / 3 desktop. */
export function CardGridItem({ children, sx }: { children: React.ReactNode; sx?: GridProps['sx'] }) {
  return (
    <Grid item xs={GRID.item.xs} sm={GRID.item.sm} md={GRID.item.md} sx={sx}>
      {children}
    </Grid>
  );
}
