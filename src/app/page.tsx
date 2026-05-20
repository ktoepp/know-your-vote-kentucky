import type { Metadata } from 'next';
import { Box, Container } from '@mui/material';
import { HomeAuthGate } from '@/components/home/HomeAuthGate';
import { SessionBannerServer } from '@/components/home/SessionBannerServer';
import { LandingHero } from '@/components/home/LandingHero';
import { LandingFeatures } from '@/components/home/LandingFeatures';
import { LandingMapSection } from '@/components/home/LandingMapSection';
import { LandingTopics } from '@/components/home/LandingTopics';

export const metadata: Metadata = {
  title: 'Know Your Vote Kentucky — Track KY legislation',
  description:
    'Free tool for Kentucky residents to find their reps, track bills, and get notified when legislation moves.',
};

export default function HomePage() {
  return (
    <HomeAuthGate>
      <Box sx={{ minHeight: '100vh', bgcolor: 'background.default' }}>
        <SessionBannerServer />
        <LandingHero />
        <Container maxWidth="lg">
          <LandingFeatures />
          <LandingMapSection />
          <LandingTopics />
        </Container>
      </Box>
    </HomeAuthGate>
  );
}
