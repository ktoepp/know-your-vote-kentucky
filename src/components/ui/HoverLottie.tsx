'use client';

import { Box } from '@mui/material';
import Lottie, { type LottieRefCurrentProps } from 'lottie-react';
import { useCallback, useRef, type RefObject } from 'react';

export function useHoverLottieControls() {
  const lottieRef = useRef<LottieRefCurrentProps>(null);

  const handleMouseEnter = useCallback(() => {
    lottieRef.current?.goToAndPlay(0);
  }, []);

  const handleMouseLeave = useCallback(() => {
    lottieRef.current?.stop();
    lottieRef.current?.goToAndStop(0, true);
  }, []);

  return { lottieRef, handleMouseEnter, handleMouseLeave };
}

type HoverLottieProps = {
  animationData: object;
  lottieRef: RefObject<LottieRefCurrentProps | null>;
  width?: number;
  height?: number;
  loop?: boolean;
  ariaLabel?: string;
};

/** Static Lottie icon; pair with `useHoverLottieControls` on a parent hover target. */
export function LottieIcon({
  animationData,
  lottieRef,
  width = 48,
  height = 48,
  loop = false,
  ariaLabel,
}: HoverLottieProps) {
  return (
    <Box
      sx={{
        width,
        height,
        display: 'inline-flex',
        alignItems: 'center',
        justifyContent: 'center',
        flexShrink: 0,
        lineHeight: 0,
      }}
      aria-label={ariaLabel}
      aria-hidden={ariaLabel ? undefined : true}
    >
      <Lottie
        lottieRef={lottieRef}
        animationData={animationData}
        loop={loop}
        autoplay={false}
        style={{ width, height }}
      />
    </Box>
  );
}

type HoverLottiePropsSelf = {
  animationData: object;
  width?: number;
  height?: number;
  loop?: boolean;
  ariaLabel?: string;
};

/** Plays a Lottie on mouse enter; stops and resets on mouse leave. */
export function HoverLottie({
  animationData,
  width = 48,
  height = 48,
  loop = false,
  ariaLabel,
}: HoverLottiePropsSelf) {
  const { lottieRef, handleMouseEnter, handleMouseLeave } = useHoverLottieControls();

  return (
    <Box
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
      sx={{ display: 'inline-flex' }}
    >
      <LottieIcon
        animationData={animationData}
        lottieRef={lottieRef}
        width={width}
        height={height}
        loop={loop}
        ariaLabel={ariaLabel}
      />
    </Box>
  );
}
