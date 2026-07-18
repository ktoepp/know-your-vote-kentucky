import { Container } from '@mui/material';
import type { KYBill } from '@/types/kentucky';
import { HomeBillCarousel } from '@/components/home/HomeBillCarousel';
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
  trendingBills,
  trendingCaption,
  latestActionBills,
}: {
  currentSessionBillCount?: number;
  authHero: React.ReactNode;
  trendingBills?: KYBill[];
  trendingCaption?: string;
  latestActionBills?: KYBill[];
}) {
  return (
    <>
      {authHero}
      <Container maxWidth="lg">
        <LandingFeatures currentSessionBillCount={currentSessionBillCount} />
        <LandingMapSection />
        {trendingBills && trendingBills.length > 0 ? (
          <HomeBillCarousel
            title="Most viewed bills"
            caption={trendingCaption ?? ''}
            bills={trendingBills}
            kind="trending"
          />
        ) : null}
        {latestActionBills && latestActionBills.length > 0 ? (
          <HomeBillCarousel
            title="Recent legislative action"
            caption="Bills with a recent step in the legislative process. Routine procedural entries are not shown."
            bills={latestActionBills}
            kind="action"
          />
        ) : null}
        <LandingTopics />
      </Container>
    </>
  );
}
