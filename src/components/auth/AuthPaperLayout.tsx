'use client';

import React from 'react';
import { Box, Container, Paper, Typography } from '@mui/material';

export interface AuthPaperLayoutProps {
  title: string;
  /** Short line under the title (optional). */
  subtitle?: string;
  children: React.ReactNode;
  maxWidth?: 'xs' | 'sm' | 'md';
}

/** Centered auth card — matches MUI theme used across the app. */
export function AuthPaperLayout({
  title,
  subtitle,
  children,
  maxWidth = 'sm',
}: AuthPaperLayoutProps) {
  return (
    <Box sx={{ minHeight: '100vh', display: 'flex', alignItems: 'center', py: 4, bgcolor: 'background.default' }}>
      <Container maxWidth={maxWidth}>
        <Paper elevation={1} sx={{ p: { xs: 3, sm: 4 }, borderRadius: 2 }}>
          <Typography variant="h5" component="h1" fontWeight={700} gutterBottom align="center">
            {title}
          </Typography>
          {subtitle ? (
            <Typography variant="body2" color="text.secondary" align="center" sx={{ mb: 3 }}>
              {subtitle}
            </Typography>
          ) : (
            <Box sx={{ mb: 2 }} />
          )}
          {children}
        </Paper>
      </Container>
    </Box>
  );
}
