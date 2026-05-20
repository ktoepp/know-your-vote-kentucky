import { Box, Button, Container, Stack, Typography } from '@mui/material';
import { Place } from '@mui/icons-material';
import Link from 'next/link';

/** Server-rendered marketing hero (no auth or Mapbox). */
export function LandingHero() {
  return (
    <Box
      sx={{
        background: 'linear-gradient(160deg, #1e40af 0%, #2563eb 50%, #1d4ed8 100%)',
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
          Your vote doesn&apos;t stop at the ballot box.
        </Typography>
        <Typography
          variant="subtitle1"
          sx={{ opacity: 0.88, mb: 5, maxWidth: 520, mx: 'auto', lineHeight: 1.6 }}
        >
          Free tool for Kentucky residents to find their reps, track bills, and get notified when legislation
          moves.
        </Typography>
        <Stack direction="row" spacing={2} justifyContent="center" flexWrap="wrap" useFlexGap>
          <Button
            component={Link}
            href="/members/map"
            variant="contained"
            size="large"
            startIcon={<Place sx={{ fontSize: 20 }} aria-hidden />}
            sx={{
              bgcolor: 'common.white',
              color: '#0f172a',
              fontWeight: 700,
              boxShadow: '0 1px 3px rgba(15,23,42,0.2)',
              '&:hover': { bgcolor: '#f1f5f9' },
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
              fontWeight: 600,
              border: '1px solid rgba(255,255,255,0.35)',
              '&:hover': { bgcolor: '#1e293b' },
            }}
          >
            Browse bills
          </Button>
        </Stack>
      </Container>
    </Box>
  );
}
