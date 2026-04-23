'use client';

import React from 'react';
import { Chip } from '@mui/material';
import type { ChipProps } from '@mui/material';
import { CHIP } from '@/lib/ui-tokens';

/**
 * Canonical chip primitives. These are drop-in wrappers around MUI `<Chip>`
 * that consolidate the repeated sx blocks used across bill cards, member
 * cards, and detail surfaces. All four accept the same shape
 * (`label`, `icon?`, `tone?`, `size?`, plus any `ChipProps`).
 */

export type ChipTone =
  | 'default'
  | 'primary'
  | 'secondary'
  | 'success'
  | 'warning'
  | 'error'
  | 'info';

export type ChipSize = 'small' | 'medium';

type BaseChipProps = Omit<ChipProps, 'color' | 'size' | 'label' | 'icon'> & {
  label: React.ReactNode;
  icon?: React.ReactElement;
  tone?: ChipTone;
  size?: ChipSize;
};

function scaleSx(size: ChipSize) {
  return size === 'small' ? CHIP.compact : CHIP.standard;
}

function combineSx(base: ChipProps['sx'], extra: ChipProps['sx']): ChipProps['sx'] {
  const parts: ChipProps['sx'][] = [];
  if (base) parts.push(base);
  if (extra) parts.push(extra);
  return parts.flatMap((p) => (Array.isArray(p) ? p : [p])) as ChipProps['sx'];
}

export interface MetaChipProps extends BaseChipProps {}

export function MetaChip({
  label,
  icon,
  tone = 'default',
  size = 'medium',
  variant = 'outlined',
  sx,
  ...rest
}: MetaChipProps) {
  const muiSize: ChipProps['size'] = size === 'small' ? 'small' : 'medium';
  return (
    <Chip
      label={label}
      icon={icon}
      color={tone}
      variant={variant}
      size={muiSize}
      sx={combineSx(scaleSx(size), sx)}
      {...rest}
    />
  );
}

export type ChipSeverity = 'info' | 'success' | 'warning' | 'error' | 'default';

export interface SeverityChipProps extends Omit<BaseChipProps, 'tone'> {
  severity?: ChipSeverity;
}

export function SeverityChip({ severity = 'info', ...rest }: SeverityChipProps) {
  return <MetaChip tone={severity} {...rest} />;
}

export interface ChamberChipProps extends Omit<BaseChipProps, 'label' | 'tone'> {
  chamber: 'house' | 'senate' | string;
  label?: React.ReactNode;
  tone?: ChipTone;
}

export function ChamberChip({
  chamber,
  label,
  tone,
  variant = 'filled',
  size = 'medium',
  ...rest
}: ChamberChipProps) {
  const normalized = String(chamber || '').toLowerCase();
  const displayLabel =
    label ??
    (normalized === 'house'
      ? 'House'
      : normalized === 'senate'
        ? 'Senate'
        : String(chamber));
  const inferredTone: ChipTone =
    tone ??
    (normalized === 'senate'
      ? 'secondary'
      : normalized === 'house'
        ? 'primary'
        : 'default');
  return (
    <MetaChip
      label={displayLabel}
      tone={inferredTone}
      variant={variant}
      size={size}
      {...rest}
    />
  );
}

export interface BillNumberChipProps extends Omit<BaseChipProps, 'label' | 'tone'> {
  billNumber: string;
  label?: React.ReactNode;
  tone?: ChipTone;
}

export function BillNumberChip({
  billNumber,
  label,
  tone = 'default',
  size = 'medium',
  variant = 'outlined',
  sx,
  ...rest
}: BillNumberChipProps) {
  return (
    <MetaChip
      label={label ?? billNumber}
      tone={tone}
      size={size}
      variant={variant}
      sx={combineSx({ fontFamily: 'monospace', letterSpacing: 0.3 }, sx)}
      {...rest}
    />
  );
}

