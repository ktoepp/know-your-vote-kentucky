'use client';

import React from 'react';
import { Card, Typography } from '@mui/material';
import { alpha, useTheme } from '@mui/material/styles';

export interface EmptyStateProps {
  message: React.ReactNode;
}

/** Dashed bordered empty list placeholder — home, browse, and search. */
export function EmptyState({ message }: EmptyStateProps) {
  const theme = useTheme();
  return (
    <Card
      sx={{
        p: 4,
        textAlign: 'center',
        bgcolor: alpha(theme.palette.primary.main, 0.04),
        border: `1px dashed ${theme.palette.divider}`,
      }}
    >
      <Typography color="text.secondary">{message}</Typography>
    </Card>
  );
}
