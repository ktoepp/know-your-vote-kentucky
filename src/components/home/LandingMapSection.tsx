'use client';

import React, { useEffect, useRef, useState } from 'react';
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
  // Mount the Mapbox preview only when the section nears the viewport — the
  // chunk + district GeoJSON + tiles total >1MB, too heavy to load eagerly on
  // every home visit.
  const mapSlotRef = useRef<HTMLDivElement | null>(null);
  const [mapInView, setMapInView] = useState(false);

  useEffect(() => {
    if (mapInView) return;
    const el = mapSlotRef.current;
    if (!el || typeof IntersectionObserver === 'undefined') {
      setMapInView(true);
      return;
    }
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries.some((e) => e.isIntersecting)) setMapInView(true);
      },
      // Small runway so the tiles show up as the user scrolls in, but not so
      // large it fires on initial render (400px would trigger on a ~640px
      // mobile viewport since the section sits ~900px down the page).
      { rootMargin: '100px 0px' },
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, [mapInView]);

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
      <Box ref={mapSlotRef} sx={{ flex: '0 0 55%', height: { xs: 260, md: 380 }, position: 'relative' }}>
        {mapInView ? (
          <LandingDistrictMapPreview />
        ) : (
          <Box sx={{ width: '100%', height: '100%', bgcolor: 'action.hover' }} aria-hidden />
        )}
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
