import { Box, Button, Container, Stack, Typography } from '@mui/material';
import { DynamicFeed, ListAlt, Place } from '@mui/icons-material';
import Link from 'next/link';
import {
  HERO_CTA_PRIMARY_SX,
  HERO_CTA_SECONDARY_SX,
  HERO_CTA_TERTIARY_SX,
  LANDING_HERO_BACKGROUND,
  LANDING_HERO_SCRIM_RETURNING,
} from '@/components/home/landingHeroStyles';

/** Signed-in home hero: bill/feed first, map secondary (returning users). */
export function LandingHeroReturning() {
  return (
    <Box
      sx={{
        ...LANDING_HERO_BACKGROUND,
        py: { xs: 6, md: 8 },
        textAlign: 'center',
      }}
    >
      <Box sx={LANDING_HERO_SCRIM_RETURNING} />
      <Container maxWidth="md" sx={{ position: 'relative', zIndex: 1 }}>
        <Typography
          variant="h4"
          component="h1"
          fontWeight={700}
          gutterBottom
          sx={{
            fontSize: { xs: '1.5rem', sm: '1.75rem' },
            lineHeight: 1.2,
            textShadow: '0 1px 12px rgba(15, 23, 42, 0.45)',
          }}
        >
          Welcome back
        </Typography>
        <Typography
          variant="body1"
          sx={{
            mb: 3,
            maxWidth: 480,
            mx: 'auto',
            lineHeight: 1.55,
            fontWeight: 500,
            // The `body1` variant bakes in a dark color (theme.ts) which would
            // otherwise win over the hero's inherited white — force white here.
            color: 'common.white',
            textShadow: '0 1px 4px rgba(0, 0, 0, 0.55)',
          }}
        >
          Pick up where you left off: your feed, bills you follow, or browse the full legislature.
        </Typography>
        <Stack direction="row" spacing={1.5} justifyContent="center" flexWrap="wrap" useFlexGap>
          <Button
            component={Link}
            href="/feed"
            variant="contained"
            size="large"
            startIcon={<DynamicFeed sx={{ fontSize: 20 }} aria-hidden />}
            sx={HERO_CTA_PRIMARY_SX}
          >
            Your feed
          </Button>
          <Button
            component={Link}
            href="/bills"
            variant="contained"
            size="large"
            startIcon={<ListAlt sx={{ fontSize: 20 }} aria-hidden />}
            sx={HERO_CTA_SECONDARY_SX}
          >
            Browse bills
          </Button>
          <Button
            component={Link}
            href="/members/map"
            variant="contained"
            size="large"
            startIcon={<Place sx={{ fontSize: 20 }} aria-hidden />}
            sx={HERO_CTA_TERTIARY_SX}
          >
            Find my legislators
          </Button>
        </Stack>
      </Container>
    </Box>
  );
}
