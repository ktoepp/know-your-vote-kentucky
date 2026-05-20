import { Box, Button, Container, Stack, Typography } from '@mui/material';
import { DynamicFeed, ListAlt, Place } from '@mui/icons-material';
import Link from 'next/link';

/** Signed-in home hero: bill/feed first, map secondary (returning users). */
export function LandingHeroReturning() {
  return (
    <Box
      sx={{
        background: 'linear-gradient(160deg, #1e3a8a 0%, #2563eb 55%, #1d4ed8 100%)',
        color: 'common.white',
        py: { xs: 6, md: 8 },
        textAlign: 'center',
      }}
    >
      <Container maxWidth="md">
        <Typography
          variant="h4"
          component="h1"
          fontWeight={700}
          gutterBottom
          sx={{ fontSize: { xs: '1.5rem', sm: '1.75rem' }, lineHeight: 1.2 }}
        >
          Welcome back
        </Typography>
        <Typography
          variant="body1"
          sx={{ opacity: 0.92, mb: 3, maxWidth: 480, mx: 'auto', lineHeight: 1.55 }}
        >
          Pick up where you left off — your feed, bills you follow, or the full legislature browse.
        </Typography>
        <Stack direction="row" spacing={1.5} justifyContent="center" flexWrap="wrap" useFlexGap>
          <Button
            component={Link}
            href="/feed"
            variant="contained"
            size="large"
            startIcon={<DynamicFeed sx={{ fontSize: 20 }} aria-hidden />}
            sx={{
              bgcolor: 'common.white',
              color: '#0f172a',
              fontWeight: 700,
              '&:hover': { bgcolor: '#f1f5f9' },
            }}
          >
            Your feed
          </Button>
          <Button
            component={Link}
            href="/bills"
            variant="contained"
            size="large"
            startIcon={<ListAlt sx={{ fontSize: 20 }} aria-hidden />}
            sx={{
              bgcolor: '#0f172a',
              color: 'common.white',
              fontWeight: 600,
              '&:hover': { bgcolor: '#1e293b' },
            }}
          >
            Browse bills
          </Button>
          <Button
            component={Link}
            href="/members/map"
            variant="outlined"
            size="large"
            startIcon={<Place sx={{ fontSize: 20 }} aria-hidden />}
            sx={{
              color: 'common.white',
              borderColor: 'rgba(255,255,255,0.65)',
              fontWeight: 600,
              '&:hover': { borderColor: 'common.white', bgcolor: 'rgba(255,255,255,0.1)' },
            }}
          >
            District map
          </Button>
        </Stack>
      </Container>
    </Box>
  );
}
