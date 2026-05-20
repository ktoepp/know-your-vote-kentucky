'use client';

import React from 'react';
import Link from 'next/link';
import { Typography, type TypographyProps } from '@mui/material';
import { formatKyBillNumberDisplay } from '@/lib/bill-display';

export type BillNumberSize = 'detail' | 'card' | 'compact' | 'inline';

const SIZE_PROPS: Record<
  BillNumberSize,
  { variant: TypographyProps['variant']; component: React.ElementType; fontWeight: number; fontSize?: string }
> = {
  detail: { variant: 'h2', component: 'p', fontWeight: 700 },
  card: { variant: 'h4', component: 'p', fontWeight: 700, fontSize: '1.35rem' },
  compact: { variant: 'subtitle2', component: 'span', fontWeight: 700 },
  inline: { variant: 'body2', component: 'span', fontWeight: 700 },
};

export interface BillNumberProps {
  billNumber: string | null | undefined;
  size?: BillNumberSize;
  href?: string;
  color?: TypographyProps['color'];
  sx?: TypographyProps['sx'];
  className?: string;
}

/** Consistent bill designation typography (HB 1, SR 57, …) across browse, detail, and profile surfaces. */
export function BillNumber({
  billNumber,
  size = 'inline',
  href,
  color = 'primary',
  sx,
  className,
}: BillNumberProps) {
  const label = formatKyBillNumberDisplay(billNumber) || billNumber || '';
  if (!label) return null;

  const sizeProps = SIZE_PROPS[size];
  const typography = (
    <Typography
      className={className}
      variant={sizeProps.variant}
      component={sizeProps.component}
      fontWeight={sizeProps.fontWeight}
      color={color}
      sx={{
        ...(sizeProps.fontSize ? { fontSize: sizeProps.fontSize } : {}),
        ...(size === 'detail'
          ? { fontSize: { xs: '1.75rem', sm: '2rem' } }
          : {}),
        ...sx,
      }}
    >
      {label}
    </Typography>
  );

  if (href) {
    return (
      <Typography
        className={className}
        component={Link}
        href={href}
        variant={sizeProps.variant}
        fontWeight={sizeProps.fontWeight}
        color={color}
        sx={{
          textDecoration: 'none',
          display: 'inline-block',
          ...(sizeProps.fontSize ? { fontSize: sizeProps.fontSize } : {}),
          ...(size === 'detail'
            ? { fontSize: { xs: '1.75rem', sm: '2rem' } }
            : {}),
          '&:hover': { textDecoration: 'underline' },
          ...sx,
        }}
      >
        {label}
      </Typography>
    );
  }

  return typography;
}
