'use client';

import React, { useState, useCallback, useRef, useEffect } from 'react';
import { Box, IconButton, Typography } from '@mui/material';
import { ContentCopy } from '@mui/icons-material';

const COPIED_MS = 2000;

export interface CopyableEmailProps {
  email: string;
  variant?: 'caption' | 'body2';
  /** MUI Typography display */
  display?: 'block' | 'inline';
}

/**
 * Email with a copy icon; shows brief "Copied" feedback after success.
 */
export function CopyableEmail({ email, variant = 'caption', display = 'block' }: CopyableEmailProps) {
  const [copied, setCopied] = useState(false);
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    return () => {
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
    };
  }, []);

  const copy = useCallback(async () => {
    try {
      await navigator.clipboard.writeText(email);
      setCopied(true);
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
      timeoutRef.current = setTimeout(() => setCopied(false), COPIED_MS);
    } catch {
      /* clipboard denied or unavailable */
    }
  }, [email]);

  return (
    <Box
      sx={{
        display: display === 'block' ? 'flex' : 'inline-flex',
        alignItems: 'center',
        gap: 0.5,
        flexWrap: 'wrap',
        width: display === 'block' ? '100%' : undefined,
      }}
    >
      <Typography variant={variant} color="text.secondary" component="span" sx={{ wordBreak: 'break-all' }}>
        {email}
      </Typography>
      {/* Native title, not MuiTooltip: this renders once per card on roster-scale lists,
          and the visible "Copied" caption already announces success. */}
      <IconButton
        type="button"
        title={copied ? 'Copied' : 'Copy email'}
        aria-label={copied ? 'Copied to clipboard' : 'Copy email to clipboard'}
        onClick={copy}
        // Inherits the theme-level 44×44 touch-target floor (theme.ts MuiIconButton).
        // Icon stays visually small via fontSize; the click region is full-size.
        sx={{ color: copied ? 'success.main' : 'text.secondary' }}
      >
        <ContentCopy sx={{ fontSize: variant === 'body2' ? 18 : 16 }} />
      </IconButton>
      {copied && (
        <Typography variant="caption" color="success.main" component="span" sx={{ fontWeight: 600 }}>
          Copied
        </Typography>
      )}
    </Box>
  );
}
