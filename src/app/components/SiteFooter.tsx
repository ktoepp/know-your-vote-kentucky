'use client';

import React from 'react';
import { Box, Container, Divider, Link as MuiLink, Stack, Typography } from '@mui/material';
import Link from 'next/link';
import Image from 'next/image';
import { APP_VERSION } from '@/lib/app-version';

const NAV_WORDMARK_SRC = '/branding/Logo-03.png';

const footerNavLinks = [
  { href: '/bills', label: 'Bills' },
  { href: '/committees', label: 'Committees' },
  { href: '/meetings', label: 'Meetings' },
  { href: '/members', label: 'Members' },
  { href: '/search', label: 'Search' },
  { href: '/legislature/resources', label: 'Frankfort resources' },
  { href: '/glossary', label: 'Glossary' },
];

const footerAuthLinks = [
  { href: '/auth/login', label: 'Log in' },
  { href: '/auth/register', label: 'Sign up' },
];

const footerLegalLinks = [
  { href: '/about', label: 'About' },
  { href: '/privacy', label: 'Privacy' },
  { href: '/terms', label: 'Terms' },
  { href: '/licenses', label: 'Licenses' },
];

export default function SiteFooter() {
  return (
    <Box
      component="footer"
      sx={{
        borderTop: '1px solid',
        borderColor: 'divider',
        bgcolor: 'background.paper',
        pt: 5,
        pb: 3,
      }}
    >
      <Container maxWidth="lg">
        {/* Top row: logo + tagline left, nav right */}
        <Box
          sx={{
            display: 'flex',
            flexDirection: { xs: 'column', sm: 'row' },
            justifyContent: 'space-between',
            gap: { xs: 4, sm: 2 },
            mb: 4,
          }}
        >
          {/* Left: logo + tagline */}
          <Box sx={{ maxWidth: 320 }}>
            <Link href="/" style={{ textDecoration: 'none', display: 'inline-block', marginBottom: 12 }}>
              <Box sx={{ position: 'relative', height: 40, width: 200 }}>
                <Image
                  src={NAV_WORDMARK_SRC}
                  alt="Know Your Vote Kentucky"
                  fill
                  sizes="200px"
                  style={{ objectFit: 'contain', objectPosition: 'left center' }}
                />
              </Box>
            </Link>
            <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
              Free civic resource for Kentucky residents
            </Typography>
            <Typography variant="caption" color="text.secondary" display="block" sx={{ lineHeight: 1.5 }}>
              Profile information is sourced from public data (Open States and official Kentucky
              sources) and may lag updates.
            </Typography>
          </Box>

          {/* Right: nav + auth columns */}
          <Box sx={{ display: 'flex', gap: 6, flexShrink: 0 }}>
            <Stack spacing={1.25} component="nav" aria-label="Footer navigation">
              {footerNavLinks.map(({ href, label }) => (
                <MuiLink
                  key={href}
                  component={Link}
                  href={href}
                  underline="none"
                  sx={{
                    color: 'text.primary',
                    fontSize: '0.9375rem',
                    fontWeight: 500,
                    '&:hover': { color: 'primary.main' },
                  }}
                >
                  {label}
                </MuiLink>
              ))}
            </Stack>

            <Stack spacing={1.25} component="nav" aria-label="Footer account links">
              {footerAuthLinks.map(({ href, label }) => (
                <MuiLink
                  key={href}
                  component={Link}
                  href={href}
                  underline="none"
                  sx={{
                    color: 'text.primary',
                    fontSize: '0.9375rem',
                    fontWeight: 500,
                    '&:hover': { color: 'primary.main' },
                  }}
                >
                  {label}
                </MuiLink>
              ))}
            </Stack>
          </Box>
        </Box>

        <Divider />

        {/* Bottom row: copyright + legal links */}
        <Box
          sx={{
            pt: 2.5,
            display: 'flex',
            flexWrap: 'wrap',
            alignItems: 'center',
            gap: { xs: 0.5, sm: 1 },
          }}
        >
          <Typography variant="caption" color="text.secondary">
            © {new Date().getFullYear()} Know Your Vote Kentucky
          </Typography>
          <Typography variant="caption" color="text.disabled" aria-hidden>·</Typography>
          <Typography variant="caption" color="text.secondary">
            A product of The Eighth Dimension, LLC
          </Typography>
          <Typography variant="caption" color="text.disabled" aria-hidden>·</Typography>
          <Typography variant="caption" color="text.secondary">
            v{APP_VERSION}
          </Typography>
          {footerLegalLinks.map(({ href, label }) => (
            <React.Fragment key={href}>
              <Typography variant="caption" color="text.disabled" aria-hidden>·</Typography>
              <MuiLink
                component={Link}
                href={href}
                underline="always"
                sx={{
                  fontSize: '0.75rem',
                  color: 'text.secondary',
                  textUnderlineOffset: 3,
                  '&:hover': { color: 'primary.main' },
                }}
              >
                {label}
              </MuiLink>
            </React.Fragment>
          ))}
        </Box>
      </Container>
    </Box>
  );
}
