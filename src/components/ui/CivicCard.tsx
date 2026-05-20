'use client';

import React from 'react';
import Link from 'next/link';
import { Box, Card, CardContent } from '@mui/material';
import type { CardProps } from '@mui/material';
import { useTheme } from '@mui/material/styles';
import { CARD } from '@/lib/ui-tokens';

export type CivicCardVariant = 'bill' | 'member' | 'ordinance' | 'meeting';

export interface CivicCardProps {
  /** Which civic entity this card represents. Exposed as `data-variant` for downstream styling hooks. */
  variant: CivicCardVariant;
  /** Emphasized presentation — thicker border + raised elevation. */
  featured?: boolean;
  /**
   * Slots are passed as named props (not composition children). Each renders in
   * its own Box so downstream cards can drop existing markup in without change.
   */
  header?: React.ReactNode;
  body?: React.ReactNode;
  footer?: React.ReactNode;
  /** Full-card navigation target — renders the Card as a `next/link`. */
  href?: string;
  /** Click handler — renders the Card as a native `<button>` when `href` is not set. */
  onClick?: (event: React.MouseEvent<HTMLElement>) => void;
  /** Accessible name for interactive cards (required when header content alone is insufficient). */
  ariaLabel?: string;
  id?: string;
  className?: string;
  /** Escape hatch for downstream migrations that need additional styles. Merged onto the Card `sx`. */
  sx?: CardProps['sx'];
}

/**
 * Shared shell for civic content cards (bills, members, ordinances, meetings).
 *
 * Renders border, radius, elevation, padding, and hover/focus treatment from the
 * `CARD` token in `ui-tokens.ts`. Keyboard focus shows a visible primary ring
 * when the card is interactive (`href` or `onClick`). Dark-mode colors come
 * from the MUI theme (`palette.divider`, `palette.primary.main`, `palette.background.paper`).
 *
 * Slot contract: pass `header`, `body`, `footer` as named props. The primitive
 * does not accept composition children — downstream cards should place all
 * content inside one of the three slots.
 */
export function CivicCard({
  variant,
  featured = false,
  header,
  body,
  footer,
  href,
  onClick,
  ariaLabel,
  id,
  className,
  sx,
}: CivicCardProps) {
  const theme = useTheme();
  const isInteractive = Boolean(href) || Boolean(onClick);

  const interactiveProps: Record<string, unknown> = href
    ? { component: Link, href }
    : onClick
    ? { component: 'button', type: 'button', onClick }
    : {};

  return (
    <Card
      {...interactiveProps}
      id={id}
      className={className}
      elevation={featured ? CARD.elevation.featured : CARD.elevation.rest}
      data-variant={variant}
      aria-label={isInteractive ? ariaLabel : undefined}
      sx={{
        height: '100%',
        display: 'flex',
        flexDirection: 'column',
        borderRadius: CARD.borderRadius,
        border: `${featured ? 2 : 1}px solid ${theme.palette.divider}`,
        bgcolor: 'background.paper',
        color: 'inherit',
        textDecoration: 'none',
        textAlign: 'inherit',
        width: onClick && !href ? '100%' : undefined,
        transition: CARD.hoverTransition,
        ...(isInteractive && {
          cursor: 'pointer',
          ...(variant !== 'bill' && {
            '&:hover': {
              boxShadow: CARD.elevation.hover,
              transform: CARD.hoverTransform,
              borderColor: theme.palette.primary.main,
            },
          }),
          '&:focus-visible': {
            outline: 'none',
            boxShadow: `0 0 0 3px ${theme.palette.primary.main}66`,
            borderColor: theme.palette.primary.main,
          },
        }),
        ...sx,
      }}
    >
      <CardContent
        sx={{
          flexGrow: 1,
          p: CARD.padding,
          display: 'flex',
          flexDirection: 'column',
          gap: 1.5,
          '&:last-child': { pb: CARD.padding },
        }}
      >
        {header != null && <Box>{header}</Box>}
        {body != null && <Box sx={{ flexGrow: 1, minWidth: 0 }}>{body}</Box>}
        {footer != null && <Box sx={{ mt: 'auto' }}>{footer}</Box>}
      </CardContent>
    </Card>
  );
}

