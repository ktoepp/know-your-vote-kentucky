'use client';

import React from 'react';
import { Chip } from '@mui/material';
import type { ChipProps } from '@mui/material';
import { CHIP } from '@/lib/ui-tokens';
import { committeeKindLabel, type KyCommitteeKind } from '@/lib/ky-committee-display';

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

export interface CommitteeKindChipProps extends Omit<BaseChipProps, 'label' | 'tone'> {
  kind: KyCommitteeKind;
  label?: React.ReactNode;
}

export function CommitteeKindChip({
  kind,
  label,
  size = 'small',
  variant = 'outlined',
  ...rest
}: CommitteeKindChipProps) {
  const displayLabel = label ?? committeeKindLabel(kind);
  const tone: ChipTone =
    kind === 'board' || kind === 'oversight' || kind === 'statutory'
      ? 'secondary'
      : kind === 'house_subcommittee' || kind === 'senate_subcommittee' || kind === 'subcommittee'
        ? 'info'
        : kind === 'interim_joint'
          ? 'info'
          : 'default';
  return <MetaChip label={displayLabel} tone={tone} size={size} variant={variant} {...rest} />;
}

/**
 * Chamber-specific colors live outside the MUI palette because MUI's `secondary`
 * (currently green) collides with `success` — reusing it for Senate would make a
 * Senate chamber chip visually identical to a "Passed" status chip. Instead we
 * pull hues from the `--chamber-*` CSS variables so the House/Senate signal is
 * an independent dimension from status.
 */
const CHAMBER_COLORS: Record<string, { bg: string; fg: string }> = {
  house: { bg: 'var(--chamber-house)', fg: 'var(--party-fg)' },
  senate: { bg: 'var(--chamber-senate)', fg: 'var(--party-fg)' },
};

export function ChamberChip({
  chamber,
  label,
  tone,
  variant = 'filled',
  size = 'medium',
  sx,
  ...rest
}: ChamberChipProps) {
  const normalized = String(chamber || '').toLowerCase();
  const displayLabel =
    label ??
    (normalized === 'house'
      ? 'House'
      : normalized === 'senate'
        ? 'Senate'
        : normalized === 'joint'
          ? 'Joint'
          : String(chamber));

  if (tone) {
    return (
      <MetaChip
        label={displayLabel}
        tone={tone}
        variant={variant}
        size={size}
        sx={sx}
        {...rest}
      />
    );
  }

  const preset = CHAMBER_COLORS[normalized];
  if (preset && variant === 'filled') {
    return (
      <MetaChip
        label={displayLabel}
        tone="default"
        variant="filled"
        size={size}
        sx={combineSx(
          {
            bgcolor: preset.bg,
            color: preset.fg,
            borderColor: preset.bg,
            '& .MuiChip-label': { color: 'inherit' },
          },
          sx,
        )}
        {...rest}
      />
    );
  }
  if (preset) {
    return (
      <MetaChip
        label={displayLabel}
        tone="default"
        variant="outlined"
        size={size}
        sx={combineSx(
          {
            color: preset.bg,
            borderColor: preset.bg,
            '& .MuiChip-label': { color: 'inherit' },
          },
          sx,
        )}
        {...rest}
      />
    );
  }

  const inferredTone: ChipTone = normalized === 'joint' ? 'info' : 'default';
  return (
    <MetaChip
      label={displayLabel}
      tone={inferredTone}
      variant={variant}
      size={size}
      sx={sx}
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

