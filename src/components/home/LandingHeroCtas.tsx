'use client';

import { Button, Stack } from '@mui/material';
import { Place } from '@mui/icons-material';
import Link from 'next/link';
import { type ReactNode } from 'react';
import { LottieIcon, useHoverLottieControls } from '@/components/ui/HoverLottie';
import { HERO_CTA_PRIMARY_SX, HERO_CTA_SECONDARY_SX } from '@/components/home/landingHeroStyles';
import searchAnimation from '../../../public/lottie/search.json';

function HeroCtaButton({
  href,
  label,
  animationData,
  fallbackIcon,
  primary = false,
}: {
  href: string;
  label: string;
  animationData?: object;
  fallbackIcon?: ReactNode;
  primary?: boolean;
}) {
  const { lottieRef, handleMouseEnter, handleMouseLeave } = useHoverLottieControls();

  const startIcon = animationData ? (
    <LottieIcon animationData={animationData} lottieRef={lottieRef} width={22} height={22} ariaLabel={label} />
  ) : (
    fallbackIcon
  );

  return (
    <Button
      component={Link}
      href={href}
      variant="contained"
      size="large"
      {...(startIcon ? { startIcon } : {})}
      onMouseEnter={animationData ? handleMouseEnter : undefined}
      onMouseLeave={animationData ? handleMouseLeave : undefined}
      sx={primary ? HERO_CTA_PRIMARY_SX : HERO_CTA_SECONDARY_SX}
    >
      {label}
    </Button>
  );
}

/** Home hero CTAs with hover-triggered Lottie icons. */
export function LandingHeroCtas() {
  return (
    <Stack direction="row" spacing={2} justifyContent="center" flexWrap="wrap" useFlexGap>
      <HeroCtaButton
        href="/members/map"
        label="Find my legislators"
        animationData={searchAnimation}
        fallbackIcon={<Place sx={{ fontSize: 20 }} aria-hidden />}
        primary
      />
      <HeroCtaButton
        href="/bills"
        label="Browse bills"
      />
    </Stack>
  );
}
