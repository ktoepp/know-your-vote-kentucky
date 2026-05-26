'use client';

import { Box, Grid, Typography } from '@mui/material';
import { LANDING_FEATURE_CARDS } from '@/components/home/landing-data';
import { LottieIcon, useHoverLottieControls } from '@/components/ui/HoverLottie';
import liveStreamingAnimation from '../../../public/lottie/live-streaming.json';
import notificationAnimation from '../../../public/lottie/notification.json';
import searchAnimation from '../../../public/lottie/search.json';

const FEATURE_ANIMATIONS = [searchAnimation, liveStreamingAnimation, notificationAnimation] as const;

function LandingFeatureCard({
  title,
  body,
  animationData,
}: {
  title: string;
  body: string;
  animationData: object;
}) {
  const { lottieRef, handleMouseEnter, handleMouseLeave } = useHoverLottieControls();

  return (
    <Box
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
      sx={{
        p: 3,
        borderRadius: 2,
        border: '1px solid',
        borderColor: 'divider',
        bgcolor: 'background.paper',
        textAlign: 'center',
        height: '100%',
        transition: 'border-color 0.2s ease, box-shadow 0.2s ease',
        '&:hover': {
          borderColor: 'primary.light',
          boxShadow: '0 4px 20px rgba(37, 99, 235, 0.08)',
        },
      }}
    >
      <Box sx={{ mb: 1.5, display: 'flex', justifyContent: 'center' }}>
        <LottieIcon animationData={animationData} lottieRef={lottieRef} width={56} height={56} ariaLabel={title} />
      </Box>
      <Typography variant="subtitle1" fontWeight={700} gutterBottom>
        {title}
      </Typography>
      <Typography variant="body2" color="text.secondary">
        {body}
      </Typography>
    </Box>
  );
}

export function LandingFeatures() {
  return (
    <Grid container spacing={3} sx={{ mt: { xs: 4, md: 6 }, mb: { xs: 6, md: 8 } }}>
      {LANDING_FEATURE_CARDS.map(({ title, body }, index) => (
        <Grid item xs={12} sm={4} key={title}>
          <LandingFeatureCard title={title} body={body} animationData={FEATURE_ANIMATIONS[index]} />
        </Grid>
      ))}
    </Grid>
  );
}
