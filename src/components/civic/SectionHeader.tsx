'use client';

import React from 'react';
import Link from 'next/link';
import { Box, Button, Chip, Typography } from '@mui/material';
import { ArrowForward } from '@mui/icons-material';
import { useTheme } from '@mui/material/styles';
import { ICON_REM, TYPE, SECTION_TITLE_DISPLAY_SX } from '@/lib/ui-tokens';

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
              sx: { color: theme.palette.primary.main, fontSize: ICON_REM.section },
            })}
            <Typography
              variant={TYPE.sectionTitle.variant}
              fontWeight={TYPE.sectionTitle.fontWeight}
              color="text.primary"
              sx={SECTION_TITLE_DISPLAY_SX}
            >
              {title}
            </Typography>
            {beta && (
              <Chip label="Beta" size="small" color="warning" variant="outlined" sx={{ fontWeight: 600 }} />
            )}
          </Box>
          {caption && (
            <Typography variant={TYPE.supporting.variant} color="text.secondary" sx={{ pl: { xs: 0, sm: 5.5 } }}>
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
