import type { Metadata } from 'next';
import { preload } from 'react-dom';
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

export const revalidate = 60;

export const metadata: Metadata = {
  title: 'Know Your Vote Kentucky — Track Kentucky legislation',
  description:
    'Free tool for Kentucky residents to find their representatives, track bills, and get notified when legislation moves.',
};

export default async function HomePage() {
  // Hero is a CSS background (invisible to the browser preload scanner), so
  // kick the fetch off from the HTML head instead of waiting for hydration.
  preload(LANDING_HERO_IMAGE_URL, { as: 'image', fetchPriority: 'high' });
  const [currentSessionBillCount, trending, latestActionBills] = await Promise.all([
    fetchKyCurrentSessionBillCount(),
    fetchHomeTrendingBills(),
    fetchHomeLatestActionBills(),
  ]);
  const trendingCaption =
    trending.metric === 'visitors'
      ? 'Bills with the most visitors in the past day.'
      : 'Bills with the most page views this legislative session.';
  return (
    <Box sx={{ minHeight: '100vh', bgcolor: 'background.default' }}>
      <SessionBannerServer />
      {/* Both hero variants render server-side and arrive at the tiny
          `HomeAuthHero` client island as pre-rendered nodes; the island only
          picks which one to show once `useUser()` resolves. */}
      <HomePageContent
        currentSessionBillCount={currentSessionBillCount}
        trendingBills={trending.bills}
        trendingCaption={trendingCaption}
        latestActionBills={latestActionBills}
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
