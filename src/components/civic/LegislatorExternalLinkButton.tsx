'use client';

import React from 'react';
import { Button, type ButtonProps } from '@mui/material';
import { OpenInNew } from '@mui/icons-material';
import { LEGISLATOR_EXTERNAL_LINK } from '@/lib/ui-tokens';

export interface LegislatorExternalLinkButtonProps extends Omit<ButtonProps, 'variant' | 'size' | 'color'> {
  href: string;
  children: React.ReactNode;
}

/** Canonical outbound link on member and sponsor cards. */
export function LegislatorExternalLinkButton({
  href,
  children,
  sx,
  ...rest
}: LegislatorExternalLinkButtonProps) {
  return (
    <Button
      component="a"
      size="small"
      variant="text"
      color="inherit"
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      endIcon={<OpenInNew sx={LEGISLATOR_EXTERNAL_LINK.iconSx} aria-hidden />}
      sx={[LEGISLATOR_EXTERNAL_LINK.buttonSx, ...(Array.isArray(sx) ? sx : sx ? [sx] : [])]}
      {...rest}
    >
      {children}
    </Button>
  );
}
