'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Box, Button, IconButton, InputAdornment, TextField, Typography } from '@mui/material';
import { Search as SearchIcon } from '@mui/icons-material';

/**
 * Home-page search entry point (sits below the district-finder section). Routes to the
 * unified `/search` page, which searches bills, members, and committees together.
 */
export function HomeSearchSection() {
  const router = useRouter();
  const [q, setQ] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const query = q.trim();
    router.push(query ? `/search?q=${encodeURIComponent(query)}` : '/search');
  };

  return (
    <Box
      sx={{
        borderRadius: 3,
        border: '1px solid',
        borderColor: 'divider',
        bgcolor: 'background.paper',
        p: { xs: 3, md: 5 },
        mb: { xs: 6, md: 8 },
      }}
    >
      <Typography variant="h4" component="h2" fontWeight={700} gutterBottom sx={{ lineHeight: 1.2 }}>
        Search the General Assembly
      </Typography>
      <Typography variant="body1" color="text.secondary" sx={{ mb: 2, maxWidth: 620 }}>
        Find bills, members, and committees in one place — by number (HB 23), topic, name, or district.
      </Typography>
      <Box
        component="form"
        onSubmit={handleSubmit}
        sx={{ display: 'flex', flexDirection: { xs: 'column', sm: 'row' }, gap: 1.5, maxWidth: 720 }}
      >
        <TextField
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="Search bills, members, committees…"
          fullWidth
          inputProps={{ 'aria-label': 'Search bills, members, and committees' }}
          InputProps={{
            startAdornment: (
              <InputAdornment position="start">
                <SearchIcon sx={{ color: 'primary.main', opacity: 0.92 }} aria-hidden />
              </InputAdornment>
            ),
            endAdornment: (
              <InputAdornment position="end" sx={{ display: { sm: 'none' } }}>
                <IconButton type="submit" size="small" edge="end" aria-label="Search">
                  <SearchIcon fontSize="small" />
                </IconButton>
              </InputAdornment>
            ),
          }}
        />
        <Button type="submit" variant="contained" sx={{ flexShrink: 0, px: 4, display: { xs: 'none', sm: 'inline-flex' } }}>
          Search
        </Button>
      </Box>
    </Box>
  );
}
