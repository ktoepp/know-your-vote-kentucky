import { Box, Container, Typography } from '@mui/material';
import { LandingHeroCtas } from '@/components/home/LandingHeroCtas';
import { LANDING_HERO_BACKGROUND, LANDING_HERO_SCRIM } from '@/components/home/landingHeroStyles';

/** Server-rendered marketing hero (no auth or Mapbox). */
export function LandingHero() {
  return (
    <Box
      sx={{
        ...LANDING_HERO_BACKGROUND,
        py: { xs: 10, md: 14 },
        textAlign: 'center',
      }}
    >
      <Box sx={LANDING_HERO_SCRIM} />
      <Container maxWidth="md" sx={{ position: 'relative', zIndex: 1 }}>
        <Typography
          variant="h2"
          component="h1"
          fontWeight={700}
          gutterBottom
          sx={{
            fontSize: { xs: '2rem', sm: '2.5rem', md: '3rem' },
            lineHeight: 1.15,
            textShadow: '0 1px 12px rgba(15, 23, 42, 0.45)',
          }}
        >
          Your vote doesn&apos;t stop at the ballot box.
        </Typography>
        <Typography
          variant="subtitle1"
          sx={{
            opacity: 0.95,
            mb: 5,
            maxWidth: 520,
            mx: 'auto',
            lineHeight: 1.6,
            textShadow: '0 1px 8px rgba(15, 23, 42, 0.35)',
          }}
        >
          Free tool for Kentucky residents to find their reps, track bills, and get notified when legislation
          moves.
        </Typography>
        <LandingHeroCtas />
      </Container>
    </Box>
  );
}
