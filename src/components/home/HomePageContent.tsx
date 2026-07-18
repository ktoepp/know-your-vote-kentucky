import { Container } from '@mui/material';
import type { KYBill, KYLegislatorRoster } from '@/types/kentucky';
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
  latestActionBills,
  legislators,
}: {
  currentSessionBillCount?: number;
  authHero: React.ReactNode;
  trendingBills?: KYBill[];
  latestActionBills?: KYBill[];
  legislators?: KYLegislatorRoster[];
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
            bills={trendingBills}
            legislators={legislators ?? []}
            kind="trending"
          />
        ) : null}
        {latestActionBills && latestActionBills.length > 0 ? (
          <HomeBillCarousel
            title="Recent legislative action"
            bills={latestActionBills}
            legislators={legislators ?? []}
            kind="action"
          />
        ) : null}
        <LandingTopics />
      </Container>
    </>
  );
}
