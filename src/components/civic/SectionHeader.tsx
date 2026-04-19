'use client';

import React from 'react';
import Link from 'next/link';
import { Box, Button, Chip, Typography } from '@mui/material';
import { ArrowForward } from '@mui/icons-material';
import { useTheme } from '@mui/material/styles';

export interface SectionHeaderProps {
  title: string;
  icon: React.ReactNode;
  href: string;
  caption?: string;
  beta?: boolean;
}

/** Standard list section title row with optional “View all” — used on home, browse-style pages, and design docs. */
export function SectionHeader({ title, icon, href, caption, beta }: SectionHeaderProps) {
  const theme = useTheme();
  const showViewAll = href !== '#' && href.length > 0;
  return (
    <Box sx={{ mb: 3 }}>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 2, flexWrap: 'wrap' }}>
        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 0.5, minWidth: 0 }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, flexWrap: 'wrap' }}>
            {React.cloneElement(icon as React.ReactElement<{ sx?: object }>, {
              sx: { color: theme.palette.primary.main, fontSize: 28 },
            })}
            <Typography variant="h5" fontWeight={700} color="text.primary">
              {title}
            </Typography>
            {beta && (
              <Chip label="Beta" size="small" color="warning" variant="outlined" sx={{ fontWeight: 600 }} />
            )}
          </Box>
          {caption && (
            <Typography variant="body2" color="text.secondary" sx={{ pl: { xs: 0, sm: 5.5 } }}>
              {caption}
            </Typography>
          )}
        </Box>
        {showViewAll && (
          <Button component={Link} href={href} endIcon={<ArrowForward />} size="small" sx={{ flexShrink: 0 }}>
            View All
          </Button>
        )}
      </Box>
    </Box>
  );
}
