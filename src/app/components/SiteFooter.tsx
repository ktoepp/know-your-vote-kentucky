'use client';

import React, { useEffect, useState } from 'react';
import { Box, Container, Divider, Link as MuiLink, Stack, Typography } from '@mui/material';
import Link from 'next/link';
import Image from 'next/image';
import { APP_VERSION } from '@/lib/app-version';

const NAV_WORDMARK_SRC = '/branding/Logo-03.png';

/**
 * Three columns: what the site tracks, your account, then the secondary /
 * reference material. Keeping the reference links out of the primary column
 * stops the browse surfaces from being buried mid-list.
 */
const footerColumns: { heading: string; ariaLabel: string; links: { href: string; label: string }[] }[] = [
  {
    heading: 'Explore',
    ariaLabel: 'Footer navigation',
    links: [
      { href: '/bills', label: 'Bills' },
      { href: '/committees', label: 'Committees' },
      { href: '/meetings', label: 'Meetings' },
      { href: '/members', label: 'Members' },
      { href: '/districts', label: 'Districts' },
      { href: '/search', label: 'Search' },
    ],
  },
  {
    heading: 'Account',
    ariaLabel: 'Footer account links',
    links: [
      { href: '/auth/login', label: 'Log in' },
      { href: '/auth/register', label: 'Sign up' },
    ],
  },
  {
    heading: 'Learn more',
    ariaLabel: 'Footer reference links',
    links: [
      { href: '/legislature/resources', label: 'Frankfort resources' },
      { href: '/glossary', label: 'Glossary' },
      { href: '/guides', label: 'Guides' },
    ],
  },
];

const footerLegalLinks = [
  { href: '/about', label: 'About' },
  { href: '/privacy', label: 'Privacy' },
  { href: '/terms', label: 'Terms' },
  { href: '/licenses', label: 'Licenses' },
  { href: '/design-system', label: 'Design system' },
];

export default function SiteFooter() {
  // Server-rendered year is UTC and can disagree with the browser's local year
  // for a few hours around Jan 1; also, cached SSR HTML from a prior year would
  // mismatch after rollover. Resolve on mount to keep hydration stable.
  const [year, setYear] = useState<number | null>(null);
  useEffect(() => {
    setYear(new Date().getFullYear());
  }, []);
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
              <Box sx={{ position: 'relative', height: 40, width: 200, userSelect: 'none' }}>
                <Image
                  src={NAV_WORDMARK_SRC}
                  alt="Know Your Vote Kentucky"
                  fill
                  sizes="200px"
                  draggable={false}
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

          {/* Right: three link columns — explore / account / reference */}
          <Box
            sx={{
              display: 'grid',
              gridTemplateColumns: { xs: 'repeat(2, minmax(0, 1fr))', sm: 'repeat(3, auto)' },
              columnGap: { xs: 3, sm: 5, md: 6 },
              rowGap: 3.5,
              flexShrink: 0,
            }}
          >
            {footerColumns.map(({ heading, ariaLabel, links }) => (
              <Stack key={heading} spacing={1.25} component="nav" aria-label={ariaLabel}>
                <Typography
                  variant="overline"
                  component="p"
                  aria-hidden
                  sx={{
                    color: 'text.tertiary',
                    fontWeight: 700,
                    fontSize: '0.6875rem',
                    letterSpacing: '0.08em',
                    lineHeight: 1,
                  }}
                >
                  {heading}
                </Typography>
                {links.map(({ href, label }) => (
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
            ))}
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
            © {year ?? ''} Know Your Vote Kentucky
          </Typography>
          <Typography variant="caption" color="text.disabled" aria-hidden>·</Typography>
          <Typography variant="caption" color="text.secondary">
            A product of{' '}
            <MuiLink
              href="https://katietoepp.com"
              target="_blank"
              rel="noopener noreferrer"
              underline="always"
              sx={{
                color: 'text.secondary',
                textUnderlineOffset: 3,
                '&:hover': { color: 'primary.main' },
              }}
            >
              The Eighth Dimension, LLC
            </MuiLink>
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
