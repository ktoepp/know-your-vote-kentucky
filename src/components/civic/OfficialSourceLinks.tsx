'use client';

import React from 'react';
import { Box, Link as MuiLink } from '@mui/material';
import { OpenInNew } from '@mui/icons-material';
import { EXTERNAL_LINK_ICON_SX } from '@/lib/ui-tokens';

export type OfficialSourceLink = {
  href: string;
  label: string;
  /** Accessible label override (defaults to `${label} (opens in a new tab)`). */
  ariaLabel?: string;
};

export interface OfficialSourceLinksProps {
  links: OfficialSourceLink[];
  /** Vertical stack vs inline row. @default 'row' */
  layout?: 'row' | 'stack';
}

/**
 * Low-visual-weight outbound links to official sources (LRC, LegiScan, etc.).
 * Prefer this over contained/outlined Button stacks on in-app surfaces.
 */
export function OfficialSourceLinks({ links, layout = 'row' }: OfficialSourceLinksProps) {
  if (!links.length) return null;

  return (
    <Box
      component="nav"
      aria-label="Official sources"
      sx={{
        display: 'flex',
        flexDirection: layout === 'stack' ? 'column' : 'row',
        flexWrap: 'wrap',
        alignItems: layout === 'stack' ? 'flex-start' : 'center',
        gap: layout === 'stack' ? 0.75 : 1.5,
      }}
    >
      {links.map((link) => (
        <MuiLink
          key={`${link.href}|${link.label}`}
          href={link.href}
          target="_blank"
          rel="noopener noreferrer"
          aria-label={link.ariaLabel ?? `${link.label} (opens in a new tab)`}
          sx={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: 0.35,
            fontSize: '0.875rem',
            fontWeight: 500,
            color: 'text.secondary',
            textDecoration: 'none',
            '&:hover': { color: 'primary.main', textDecoration: 'underline' },
          }}
        >
          {link.label}
          <OpenInNew sx={EXTERNAL_LINK_ICON_SX} aria-hidden />
        </MuiLink>
      ))}
    </Box>
  );
}
