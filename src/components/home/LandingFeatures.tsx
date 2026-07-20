'use client';

import Link from 'next/link';
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
  href,
  animationData,
}: {
  title: string;
  body: string;
  href: string;
  animationData: object;
}) {
  const { lottieRef, handleMouseEnter, handleMouseLeave } = useHoverLottieControls();

  return (
    <Box
      component={Link}
      href={href}
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
      sx={{
        display: 'block',
        p: 3,
        borderRadius: 2,
        border: '1px solid',
        borderColor: 'divider',
        bgcolor: 'background.paper',
        textAlign: 'center',
        height: '100%',
        color: 'inherit',
        textDecoration: 'none',
        transition: 'border-color 0.2s ease, box-shadow 0.2s ease',
        // Tint the (black) Lottie line-icon strokes to match the surface's hover
        // border (primary.light) when the card is hovered.
        '& svg path': { transition: 'stroke 0.2s ease' },
        '&:hover': {
          borderColor: 'primary.light',
          boxShadow: '0 4px 20px rgba(37, 99, 235, 0.08)',
        },
        '&:hover svg path': {
          stroke: (theme) => `${theme.palette.primary.light} !important`,
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

export function LandingFeatures({ currentSessionBillCount }: { currentSessionBillCount?: number }) {
  const billsBody =
    currentSessionBillCount && currentSessionBillCount > 0
      ? `Browse and search ${currentSessionBillCount.toLocaleString()} bills & resolutions by topic`
      : undefined;

  return (
    <Grid container spacing={3} sx={{ mt: { xs: 4, md: 6 }, mb: { xs: 6, md: 8 } }}>
      {LANDING_FEATURE_CARDS.map(({ title, body, href }, index) => (
        <Grid item xs={12} sm={4} key={title}>
          <LandingFeatureCard
            title={title}
            body={title === 'Track bills' && billsBody ? billsBody : body}
            href={href}
            animationData={FEATURE_ANIMATIONS[index]}
          />
        </Grid>
      ))}
    </Grid>
  );
}
