'use client';

import { Container } from '@mui/material';
import { useUser } from '@/app/lib/UserContext';
import { LandingHeroReturning } from '@/components/home/LandingHeroReturning';
import { LandingPersonalStrip } from '@/components/home/LandingPersonalStrip';
import { LandingFeatures } from '@/components/home/LandingFeatures';
import { LandingMapSection } from '@/components/home/LandingMapSection';
import { LandingTopics } from '@/components/home/LandingTopics';

/**
 * Picks marketing vs returning hero; no forced redirect off `/`.
 *
 * The marketing hero arrives as a server-rendered prop so it is present in the
 * SSR HTML (it is the LCP element) instead of waiting on client auth
 * resolution. While auth is loading we show it rather than a spinner; a
 * signed-in visitor sees a brief marketing→returning hero swap (~100–300ms,
 * same background photo), a deliberate trade for fast first paint.
 */
export function HomePageContent({
  currentSessionBillCount,
  marketingHero,
}: {
  currentSessionBillCount?: number;
  marketingHero: React.ReactNode;
}) {
  const { user, loading } = useUser();
  const showReturning = !loading && Boolean(user);

  return (
    <>
      {showReturning ? <LandingHeroReturning /> : marketingHero}
      {showReturning ? <LandingPersonalStrip /> : null}
      <Container maxWidth="lg">
        <LandingFeatures currentSessionBillCount={currentSessionBillCount} />
        <LandingMapSection />
        <LandingTopics />
      </Container>
    </>
  );
}
