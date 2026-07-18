import type { Metadata } from 'next';
import { preload } from 'react-dom';
import { buildPageMetadata } from '@/lib/seo';
import { Box } from '@mui/material';
import { HomeAuthHero } from '@/components/home/HomeAuthHero';
import { HomePageContent } from '@/components/home/HomePageContent';
import { LandingHero } from '@/components/home/LandingHero';
import { LandingHeroReturning } from '@/components/home/LandingHeroReturning';
import { LandingPersonalStrip } from '@/components/home/LandingPersonalStrip';
import { SessionBannerServer } from '@/components/home/SessionBannerServer';
import { LANDING_HERO_IMAGE_URL } from '@/components/home/landingHeroStyles';
import { fetchKyCurrentSessionBillCount } from '@/lib/ky-bills-browse-server';
import { fetchHomeLatestActionBills, fetchHomeTrendingBills } from '@/lib/ky-home-bill-highlights';
import { fetchKyActiveLegislatorRosterSlim } from '@/lib/ky-legislator-roster-server';

export const revalidate = 60;

export const metadata: Metadata = buildPageMetadata({
  title: 'Know Your Vote Kentucky — Track Kentucky bills and find your legislators',
  absoluteTitle: true,
  description:
    'Free, non-partisan tracking for the Kentucky General Assembly. Browse bills, look up your state representatives and senators, and receive email updates when legislation you follow moves.',
  path: '/',
});

export default async function HomePage() {
  // Hero is a CSS background (invisible to the browser preload scanner), so
  // kick the fetch off from the HTML head instead of waiting for hydration.
  preload(LANDING_HERO_IMAGE_URL, { as: 'image', fetchPriority: 'high' });
  const [currentSessionBillCount, trending, latestActionBills, legislators] = await Promise.all([
    fetchKyCurrentSessionBillCount(),
    fetchHomeTrendingBills(),
    fetchHomeLatestActionBills(),
    fetchKyActiveLegislatorRosterSlim(),
  ]);
  return (
    <Box sx={{ minHeight: '100vh', bgcolor: 'background.default' }}>
      <SessionBannerServer />
      {/* Both hero variants render server-side and arrive at the tiny
          `HomeAuthHero` client island as pre-rendered nodes; the island only
          picks which one to show once `useUser()` resolves. */}
      <HomePageContent
        currentSessionBillCount={currentSessionBillCount}
        trendingBills={trending.bills}
        latestActionBills={latestActionBills}
        legislators={legislators}
        authHero={
          <HomeAuthHero
            marketingHero={<LandingHero />}
            returningHero={
              <>
                <LandingHeroReturning />
                <LandingPersonalStrip />
              </>
            }
          />
        }
      />
    </Box>
  );
}
