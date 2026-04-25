'use client';

import React from 'react';
import { Box, Container, Typography } from '@mui/material';

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
        <Typography variant="body2" color="text.secondary" sx={{ maxWidth: 720 }}>
          Profile information is sourced from public data (Open States and official Kentucky sources) and may lag
          updates.
        </Typography>
      </Container>
    </Box>
  );
}
