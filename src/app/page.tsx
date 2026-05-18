'use client';

import React, { useState, useEffect, useRef } from 'react';
import {
  Box,
  Button,
  Chip,
  Container,
  Grid,
  IconButton,
  InputAdornment,
  Stack,
  TextField,
  Typography,
} from '@mui/material';
import { alpha, useTheme } from '@mui/material/styles';
import { Search as SearchIcon } from '@mui/icons-material';
import { MapPin, Search, Bell } from 'lucide-react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useUser } from './lib/UserContext';
import { getActiveSession, KY_SESSIONS } from '@/lib/ky-sessions';
import MapGL, { Layer, NavigationControl, Source } from 'react-map-gl/mapbox';
import 'mapbox-gl/dist/mapbox-gl.css';

const MAPBOX_TOKEN = process.env.NEXT_PUBLIC_MAPBOX_ACCESS_TOKEN ?? '';

const HOUSE_GEOJSON_URL = '/geo/ky-sldl.geojson';
const SENATE_GEOJSON_URL = '/geo/ky-sldu.geojson';
const OUTSIDE_KY_MASK_URL = '/geo/ky-outside-mask.geojson';

const KY_BOUNDS: [[number, number], [number, number]] = [[-89.9, 36.4], [-81.45, 39.35]];

/** Topics shown on the landing page — matches Framer design */
const LANDING_TOPICS = [
  { label: 'Education', topic: 'Education' },
  { label: 'Agriculture', topic: 'Agriculture' },
  { label: 'Transportation', topic: 'Transportation' },
  { label: 'Health', topic: 'Healthcare' },
  { label: 'Budget', topic: 'Budget' },
  { label: 'Environment', topic: 'Environment' },
  { label: 'Criminal justice', topic: 'Criminal Justice' },
];

// ── Session banner ─────────────────────────────────────────────────────────────

function SessionBanner() {
  const theme = useTheme();
  const today = new Date();
  today.setHours(12, 0, 0, 0);

  const active = getActiveSession();
  const session = active ?? KY_SESSIONS[0]!;
  const isInSession = Boolean(active);
  const sessionEnd = new Date(session.end);
  sessionEnd.setHours(23, 59, 59, 999);
  const afterSession = today > sessionEnd && !isInSession;

  const fmtDate = (d: string) =>
    new Date(d).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' });

  return (
    <Box sx={{ borderBottom: `1px solid ${theme.palette.divider}`, bgcolor: 'background.paper', py: 1 }}>
      <Container maxWidth="xl">
        <Box sx={{ display: 'flex', alignItems: 'flex-start', gap: 2, flexWrap: 'wrap' }}>
          <Box sx={{ flex: 1 }}>
            <Typography variant="body2" color="text.secondary" fontWeight={500} textAlign="center">
              {session.name}: {fmtDate(session.start)} – {fmtDate(session.end)}
            </Typography>
            {afterSession && (
              <Typography variant="caption" color="text.secondary" display="block" textAlign="center">
                Chambers or committees can still post limited activity after the last scheduled day.{' '}
                <Box
                  component="a"
                  href="https://legislature.ky.gov/Committee/Schedule"
                  target="_blank"
                  rel="noopener noreferrer"
                  sx={{ color: 'primary.main', textDecoration: 'underline' }}
                >
                  Check the LRC for meetings and published calendars.
                </Box>
              </Typography>
            )}
          </Box>
        </Box>
      </Container>
    </Box>
  );
}

// ── Lightweight district map preview ──────────────────────────────────────────

function LandingMap() {
  return (
    <MapGL
      initialViewState={{ bounds: KY_BOUNDS, fitBoundsOptions: { padding: 20 } }}
      mapboxAccessToken={MAPBOX_TOKEN}
      mapStyle="mapbox://styles/mapbox/light-v11"
      maxBounds={KY_BOUNDS}
      style={{ width: '100%', height: '100%' }}
      interactive={false}
    >
      {/* House districts */}
      <Source id="ky-sldl" type="geojson" data={HOUSE_GEOJSON_URL}>
        <Layer
          id="house-fill"
          type="fill"
          paint={{ 'fill-color': '#D6C5E3', 'fill-opacity': 0.6 }}
        />
        <Layer
          id="house-outline"
          type="line"
          paint={{ 'line-color': '#7637A6', 'line-width': 0.75 }}
        />
      </Source>

      {/* Senate districts */}
      <Source id="ky-sldu" type="geojson" data={SENATE_GEOJSON_URL}>
        <Layer
          id="senate-fill"
          type="fill"
          paint={{ 'fill-color': '#CEDFC3', 'fill-opacity': 0 }}
        />
        <Layer
          id="senate-outline"
          type="line"
          paint={{ 'line-color': '#4A5C3E', 'line-width': 0.75, 'line-opacity': 0 }}
        />
      </Source>

      {/* Outside KY mask */}
      <Source id="ky-mask" type="geojson" data={OUTSIDE_KY_MASK_URL}>
        <Layer
          id="outside-mask"
          type="fill"
          paint={{ 'fill-color': '#f5f5f5', 'fill-opacity': 0.96 }}
        />
      </Source>

      <NavigationControl position="top-right" showCompass={false} />
    </MapGL>
  );
}

function MapSection() {
  const router = useRouter();
  const [address, setAddress] = useState('');

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    const q = address.trim();
    router.push(q ? `/members/map?address=${encodeURIComponent(q)}` : '/members/map');
  };

  return (
    <Box sx={{ display: 'flex', flexDirection: { xs: 'column', md: 'row' }, gap: 0, borderRadius: 3, overflow: 'hidden', border: '1px solid', borderColor: 'divider', bgcolor: 'background.paper' }}>
      {/* Map */}
      <Box sx={{ flex: '0 0 55%', height: { xs: 260, md: 380 }, position: 'relative' }}>
        <LandingMap />
      </Box>

      {/* Address panel */}
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

// ── Main page ──────────────────────────────────────────────────────────────────

const FEATURE_CARDS = [
  {
    icon: <Search size={28} strokeWidth={1.5} />,
    title: 'Find your reps',
    body: 'Enter your address, see your House + Senate rep',
  },
  {
    icon: <Search size={28} strokeWidth={1.5} />,
    title: 'Track bills',
    body: 'Browse and search 1,400+ bills by topic',
  },
  {
    icon: <Bell size={28} strokeWidth={1.5} />,
    title: 'Get notified',
    body: 'Email alerts when followed bills move',
  },
];

export default function HomePage() {
  const theme = useTheme();
  const router = useRouter();
  const { user, loading: userLoading } = useUser();

  // Redirect logged-in users to /feed
  useEffect(() => {
    if (!userLoading && user) router.replace('/feed');
  }, [user, userLoading, router]);

  if (!userLoading && user) return null;

  return (
    <Box sx={{ minHeight: '100vh', bgcolor: 'background.default' }}>
      <SessionBanner />

      {/* Hero — blue gradient */}
      <Box
        sx={{
          background: `linear-gradient(160deg, #1e40af 0%, #2563eb 50%, #1d4ed8 100%)`,
          color: 'common.white',
          py: { xs: 10, md: 14 },
          textAlign: 'center',
        }}
      >
        <Container maxWidth="md">
          <Typography
            variant="h2"
            component="h1"
            fontWeight={700}
            gutterBottom
            sx={{ fontSize: { xs: '2rem', sm: '2.5rem', md: '3rem' }, lineHeight: 1.15 }}
          >
            Your vote doesn't stop at the ballot box.
          </Typography>
          <Typography
            variant="subtitle1"
            sx={{ opacity: 0.88, mb: 5, maxWidth: 520, mx: 'auto', lineHeight: 1.6 }}
          >
            Free tool for Kentucky residents to find their reps, track bills, and get notified when legislation moves.
          </Typography>
          <Stack direction="row" spacing={2} justifyContent="center" flexWrap="wrap" useFlexGap>
            <Button
              component={Link}
              href="/members/map"
              variant="contained"
              size="large"
              startIcon={<MapPin size={18} strokeWidth={2} />}
              sx={{
                bgcolor: alpha(theme.palette.common.white, 0.15),
                color: 'common.white',
                border: `1px solid ${alpha(theme.palette.common.white, 0.4)}`,
                backdropFilter: 'blur(8px)',
                '&:hover': { bgcolor: alpha(theme.palette.common.white, 0.25) },
              }}
            >
              Find my legislators
            </Button>
            <Button
              component={Link}
              href="/bills"
              variant="contained"
              size="large"
              sx={{
                bgcolor: '#0f172a',
                color: 'common.white',
                '&:hover': { bgcolor: '#1e293b' },
              }}
            >
              Browse bills
            </Button>
          </Stack>
        </Container>
      </Box>

      <Container maxWidth="lg">
        {/* Feature cards */}
        <Grid container spacing={3} sx={{ mt: { xs: 4, md: 6 }, mb: { xs: 6, md: 8 } }}>
          {FEATURE_CARDS.map(({ icon, title, body }) => (
            <Grid item xs={12} sm={4} key={title}>
              <Box
                sx={{
                  p: 3,
                  borderRadius: 2,
                  border: `1px solid ${theme.palette.divider}`,
                  bgcolor: 'background.paper',
                  textAlign: 'center',
                  height: '100%',
                }}
              >
                <Box sx={{ color: 'text.primary', mb: 1.5, display: 'flex', justifyContent: 'center' }}>
                  {icon}
                </Box>
                <Typography variant="subtitle1" fontWeight={700} gutterBottom>
                  {title}
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  {body}
                </Typography>
              </Box>
            </Grid>
          ))}
        </Grid>

        {/* Map section */}
        <Box sx={{ mb: { xs: 6, md: 8 } }}>
          <MapSection />
        </Box>

        {/* Explore by topic */}
        <Box sx={{ mb: { xs: 6, md: 10 }, textAlign: 'center' }}>
          <Typography variant="h5" component="h2" fontWeight={700} gutterBottom>
            Explore by topic
          </Typography>
          <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1, justifyContent: 'center', mt: 2 }}>
            {LANDING_TOPICS.map(({ label, topic }) => (
              <Chip
                key={label}
                label={label}
                component="a"
                href={`/bills?topic=${encodeURIComponent(topic)}`}
                clickable
                variant="outlined"
                sx={{ fontWeight: 500, borderRadius: '16px' }}
              />
            ))}
            <Chip
              label="more →"
              component="a"
              href="/bills"
              clickable
              variant="outlined"
              sx={{ fontWeight: 500, borderRadius: '16px' }}
            />
          </Box>
        </Box>
      </Container>
    </Box>
  );
}
