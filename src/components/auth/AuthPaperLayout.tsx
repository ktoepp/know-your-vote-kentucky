'use client';

import React from 'react';
import { Container, Paper, Typography } from '@mui/material';

export interface AuthPaperLayoutProps {
  title: string;
  /** Short line under the title (optional). */
  subtitle?: string;
  children: React.ReactNode;
  maxWidth?: 'xs' | 'sm' | 'md';
}

/** Auth card; vertical centering is handled by `src/app/auth/layout.tsx`. */
export function AuthPaperLayout({
  title,
  subtitle,
  children,
  maxWidth = 'sm',
}: AuthPaperLayoutProps) {
  return (
    <Container maxWidth={maxWidth} sx={{ width: '100%' }}>
      <Paper elevation={1} sx={{ p: { xs: 3, sm: 4 }, borderRadius: 2 }}>
        <Typography variant="h5" component="h1" fontWeight={700} gutterBottom align="center">
          {title}
        </Typography>
        {subtitle ? (
          <Typography variant="body2" color="text.secondary" align="center" sx={{ mb: 2 }}>
            {subtitle}
          </Typography>
        ) : null}
        {children}
      </Paper>
    </Container>
  );
}
