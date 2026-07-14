import { Container } from '@mui/material';
import { LandingFeatures } from '@/components/home/LandingFeatures';
import { LandingMapSection } from '@/components/home/LandingMapSection';
import { LandingTopics } from '@/components/home/LandingTopics';

/**
 * Server shell for `/`. The auth-branching hero is a tiny client island passed
 * in as `authHero`; the rest of the tree stays server-rendered so the initial
 * hydration wave only carries the pieces that actually need it (features cards
 * + map section, each hydrating on their own timer).
 */
export function HomePageContent({
  currentSessionBillCount,
  authHero,
}: {
  currentSessionBillCount?: number;
  authHero: React.ReactNode;
}) {
  return (
    <>
      {authHero}
      <Container maxWidth="lg">
        <LandingFeatures currentSessionBillCount={currentSessionBillCount} />
        <LandingMapSection />
        <LandingTopics />
      </Container>
    </>
  );
}
