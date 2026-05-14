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
        <Typography variant="body2" color="text.primary" sx={{ maxWidth: 720, mb: 1.5, lineHeight: 1.5 }}>
          Profile information is sourced from public data (Open States and official Kentucky sources) and may lag
          updates.
        </Typography>
        <Box
          component="nav"
          aria-label="Footer"
          sx={{
            display: 'flex',
            flexWrap: 'wrap',
            alignItems: 'center',
            gap: { xs: 0.5, sm: 1 },
            typography: 'body2',
            color: 'text.primary',
            lineHeight: 1.5,
          }}
        >
          <span>© {new Date().getFullYear()} The Eighth Dimension, LLC</span>
          <span aria-hidden>·</span>
          <span>v{APP_VERSION}</span>
          <span aria-hidden>·</span>
          <MuiLink
            component={Link}
            href="/privacy"
            variant="body2"
            underline="always"
            sx={{
              color: 'primary.main',
              fontWeight: 600,
              textUnderlineOffset: 3,
              '&:hover': { color: 'primary.dark' },
            }}
          >
            Privacy
          </MuiLink>
          <span aria-hidden>·</span>
          <MuiLink
            component={Link}
            href="/terms"
            variant="body2"
            underline="always"
            sx={{
              color: 'primary.main',
              fontWeight: 600,
              textUnderlineOffset: 3,
              '&:hover': { color: 'primary.dark' },
            }}
          >
            Terms
          </MuiLink>
          <span aria-hidden>·</span>
          <MuiLink
            component={Link}
            href="/licenses"
            variant="body2"
            underline="always"
            sx={{
              color: 'primary.main',
              fontWeight: 600,
              textUnderlineOffset: 3,
              '&:hover': { color: 'primary.dark' },
            }}
          >
            Licenses
          </MuiLink>
        </Box>
      </Container>
    </Box>
  );
}
