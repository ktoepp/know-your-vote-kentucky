'use client';

import { Box, CircularProgress, Container } from '@mui/material';
import { useUser } from '@/app/lib/UserContext';
import { LandingHero } from '@/components/home/LandingHero';
import { LandingHeroReturning } from '@/components/home/LandingHeroReturning';
import { LandingPersonalStrip } from '@/components/home/LandingPersonalStrip';
import { LandingFeatures } from '@/components/home/LandingFeatures';
import { LandingMapSection } from '@/components/home/LandingMapSection';
import { LandingTopics } from '@/components/home/LandingTopics';

/** Picks marketing vs returning hero; no forced redirect off `/`. */
export function HomePageContent({ currentSessionBillCount }: { currentSessionBillCount?: number }) {
  const { user, loading } = useUser();

  if (loading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', py: 10 }}>
        <CircularProgress aria-label="Loading" />
      </Box>
    );
  }

  return (
    <>
      {user ? <LandingHeroReturning /> : <LandingHero />}
      {user ? <LandingPersonalStrip /> : null}
      <Container maxWidth="lg">
        <LandingFeatures currentSessionBillCount={currentSessionBillCount} />
        <LandingMapSection />
        <LandingTopics />
      </Container>
    </>
  );
}
