'use client';

import Link from 'next/link';
import { Box, Button, Container, Typography } from '@mui/material';
import { Groups } from '@mui/icons-material';

export default function MemberNotFound() {
  return (
    <Box sx={{ minHeight: '50vh', bgcolor: 'background.default', py: 6 }}>
      <Container maxWidth="sm">
        <Typography variant="h1" fontWeight={800} fontSize="1.5rem" gutterBottom>
          Legislator not found
        </Typography>
        <Typography variant="body1" color="text.secondary" sx={{ mb: 3 }}>
          That profile link may be outdated or the name may have changed in our data. Try the member list or search.
        </Typography>
        <Button component={Link} href="/members" variant="contained" startIcon={<Groups />} sx={{ textTransform: 'none', fontWeight: 600 }}>
          Kentucky members
        </Button>
      </Container>
    </Box>
  );
}
