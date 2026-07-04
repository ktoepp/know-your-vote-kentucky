import type { Metadata } from 'next';
import { preload } from 'react-dom';
import { Box } from '@mui/material';
import { HomePageContent } from '@/components/home/HomePageContent';
import { LandingHero } from '@/components/home/LandingHero';
import { SessionBannerServer } from '@/components/home/SessionBannerServer';
import { LANDING_HERO_IMAGE_URL } from '@/components/home/landingHeroStyles';
import { fetchKyCurrentSessionBillCount } from '@/lib/ky-bills-browse-server';

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
  const currentSessionBillCount = await fetchKyCurrentSessionBillCount();
  return (
    <Box sx={{ minHeight: '100vh', bgcolor: 'background.default' }}>
      <SessionBannerServer />
      {/* Passed as a prop so the hero stays server-rendered (in the SSR HTML,
          not gated on client auth resolution) inside the client component. */}
      <HomePageContent currentSessionBillCount={currentSessionBillCount} marketingHero={<LandingHero />} />
    </Box>
  );
}
