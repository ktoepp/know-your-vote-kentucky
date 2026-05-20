import type { Metadata } from 'next';
import { Box } from '@mui/material';
import { HomePageContent } from '@/components/home/HomePageContent';
import { SessionBannerServer } from '@/components/home/SessionBannerServer';

export const metadata: Metadata = {
  title: 'Know Your Vote Kentucky — Track KY legislation',
  description:
    'Free tool for Kentucky residents to find their reps, track bills, and get notified when legislation moves.',
};

export default function HomePage() {
  return (
    <Box sx={{ minHeight: '100vh', bgcolor: 'background.default' }}>
      <SessionBannerServer />
      <HomePageContent />
    </Box>
  );
}
