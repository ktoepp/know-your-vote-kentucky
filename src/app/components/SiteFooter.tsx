'use client';

import React from 'react';
import { Box, Container, Link as MuiLink, Typography } from '@mui/material';
import Link from 'next/link';
import { APP_VERSION } from '@/lib/app-version';

/**
 * Global disclaimer for legislator/profile and roster data provenance.
 */
export default function SiteFooter() {
  return (
    <Box
      component="footer"
      sx={{
        py: 3,
        px: 2,
        borderTop: 1,
        borderColor: 'divider',
        bgcolor: 'background.default',
      }}
    >
      <Container maxWidth="lg">
        <Typography variant="body2" color="text.secondary" sx={{ maxWidth: 720, mb: 1.5 }}>
          Profile information is sourced from public data (Open States and official Kentucky sources) and may lag
          updates.
        </Typography>
        <Box
          sx={{
            display: 'flex',
            flexWrap: 'wrap',
            alignItems: 'center',
            gap: { xs: 0.5, sm: 1 },
            typography: 'caption',
            color: 'text.disabled',
          }}
        >
          <span>© {new Date().getFullYear()} The Eighth Dimension, LLC</span>
          <span aria-hidden>·</span>
          <span>v{APP_VERSION}</span>
          <span aria-hidden>·</span>
          <MuiLink component={Link} href="/licenses" color="inherit" sx={{ textDecoration: 'underline' }}>
            Licenses
          </MuiLink>
        </Box>
      </Container>
    </Box>
  );
}
