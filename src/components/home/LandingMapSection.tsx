'use client';

import React, { useState } from 'react';
import {
  Box,
  Button,
  IconButton,
  InputAdornment,
  TextField,
  Typography,
} from '@mui/material';
import { Search as SearchIcon } from '@mui/icons-material';
import dynamic from 'next/dynamic';
import { useRouter } from 'next/navigation';

const LandingDistrictMapPreview = dynamic(
  () => import('@/components/home/LandingDistrictMapPreview').then((m) => m.LandingDistrictMapPreview),
  {
    ssr: false,
    loading: () => <Box sx={{ width: '100%', height: '100%', bgcolor: 'action.hover' }} aria-hidden />,
  },
);

export function LandingMapSection() {
  const router = useRouter();
  const [address, setAddress] = useState('');

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    const q = address.trim();
    router.push(q ? `/members/map?address=${encodeURIComponent(q)}` : '/members/map');
  };

  return (
    <Box
      sx={{
        display: 'flex',
        flexDirection: { xs: 'column', md: 'row' },
        gap: 0,
        borderRadius: 3,
        overflow: 'hidden',
        border: '1px solid',
        borderColor: 'divider',
        bgcolor: 'background.paper',
        mb: { xs: 6, md: 8 },
      }}
    >
      <Box sx={{ flex: '0 0 55%', height: { xs: 260, md: 380 }, position: 'relative' }}>
        <LandingDistrictMapPreview />
      </Box>
      <Box sx={{ flex: 1, p: { xs: 3, md: 5 }, display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
        <Typography variant="h4" component="h2" fontWeight={700} gutterBottom sx={{ lineHeight: 1.2 }}>
          Find your representatives
        </Typography>
        <Box component="form" onSubmit={handleSearch} sx={{ mt: 2 }}>
          <TextField
            value={address}
            onChange={(e) => setAddress(e.target.value)}
            placeholder="Enter address or ZIP"
            size="small"
            fullWidth
            sx={{ mb: 1.5 }}
            InputProps={{
              endAdornment: (
                <InputAdornment position="end">
                  <IconButton type="submit" size="small" edge="end" aria-label="Search">
                    <SearchIcon fontSize="small" />
                  </IconButton>
                </InputAdornment>
              ),
            }}
          />
          <Button type="submit" variant="contained" fullWidth size="medium">
            Search
          </Button>
        </Box>
      </Box>
    </Box>
  );
}
