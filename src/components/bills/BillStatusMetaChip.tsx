'use client';

import React from 'react';
import { Block, Check, GavelOutlined } from '@mui/icons-material';
import { Box, Tooltip, Typography } from '@mui/material';
import type { KYBill } from '@/types/kentucky';
import { MetaChip, type ChipTone } from '@/components/ui/Chip';
import { useTooltips } from '@/lib/TooltipContext';
import {
  billStatusChipLabel,
  billStatusToTooltipKey,
  classifyKyBillBrowseBucket,
  formatBillLabelText,
  isActivePendingBillStatus,
  isSignedByGovernorBillStatus,
} from '@/lib/bill-display';
import { governmentTooltips } from '@/lib/tooltipContent';
import { sessionHasEnded } from '@/lib/ky-sessions';

const STATUS_TOOLTIP_POPPER_SX = {
  maxWidth: 340,
  bgcolor: 'background.paper',
  color: 'text.primary',
  border: '1px solid',
  borderColor: 'divider',
  boxShadow: 4,
  '& .MuiTooltip-arrow': { color: 'background.paper' },
} as const;

function BillStatusTooltipShell({
  status,
  children,
}: {
  status: string;
  children: React.ReactElement;
}) {
  const { tooltipsEnabled } = useTooltips();
  const key = billStatusToTooltipKey(status);
  const tip = key ? governmentTooltips[key] : null;

  if (!tooltipsEnabled || !tip) {
    return children;
  }

  return (
    <Tooltip
      title={
        <Box sx={{ p: 0.25 }}>
          <Typography variant="caption" display="block" sx={{ fontWeight: 700, mb: 0.5 }}>
            {tip.title}
          </Typography>
          <Typography variant="body2">{tip.content}</Typography>
        </Box>
      }
      arrow
      enterDelay={300}
      disableInteractive
      componentsProps={{ tooltip: { sx: STATUS_TOOLTIP_POPPER_SX } }}
    >
      <span style={{ display: 'inline-flex', cursor: 'help' }}>{children}</span>
    </Tooltip>
  );
}

type BillStatusMetaChipProps = {
  bill: KYBill;
  /** When set (e.g. LegiScan enrichment), used instead of `bill.status` for label and passed styling. */
  statusOverride?: string | null;
  /** Detail page uses larger MUI Chip; grid cards use MetaChip. */
  variant?: 'card' | 'detail';
};

type StatusVisual = {
  tone: ChipTone;
  icon?: React.ReactElement;
};

function statusVisual(
  status: string,
  bill: KYBill,
): StatusVisual {
  const s = status.trim().toLowerCase();
  const signed = isSignedByGovernorBillStatus(status);
  const chaptered = s.includes('chaptered');
  const overridden = s.includes('veto override') || s.includes('vetoes overridden');
  const vetoed = !overridden && s.includes('vetoed');

  if (overridden) {
    return { tone: 'success', icon: <GavelOutlined sx={{ fontSize: '1.125rem !important' }} /> };
  }
  if (vetoed) {
    return { tone: 'error', icon: <Block sx={{ fontSize: '1.125rem !important' }} /> };
  }
  if (signed || chaptered) {
    return { tone: 'success', icon: <Check sx={{ fontSize: '1.125rem !important' }} /> };
  }
  if (classifyKyBillBrowseBucket(bill) === 'passed') {
    return { tone: 'success', icon: <Check sx={{ fontSize: '1.125rem !important' }} /> };
  }
  return { tone: 'default' };
}

export function BillStatusMetaChip({ bill, statusOverride, variant = 'card' }: BillStatusMetaChipProps) {
  const rawStatus = statusOverride ?? bill.status;
  const billForBucket = statusOverride != null && statusOverride !== bill.status ? { ...bill, status: statusOverride } : bill;
  if (!rawStatus) return null;

  // Bills still "In Committee" (or similarly pending) when the session adjourned are dead.
  const status =
    sessionHasEnded(bill.session) && isActivePendingBillStatus(rawStatus)
      ? 'Adjourned Sine Die'
      : rawStatus;

  const { tone, icon } = statusVisual(status, billForBucket);
  const label = isSignedByGovernorBillStatus(status) ? billStatusChipLabel(status) : formatBillLabelText(status);

  const chip = (
    <MetaChip
      icon={icon}
      label={label}
      tone={tone}
      variant="outlined"
      size="medium"
      sx={variant === 'detail' ? { fontSize: '0.9rem', '& .MuiChip-label': { px: 1.25 } } : undefined}
    />
  );

  return <BillStatusTooltipShell status={status}>{chip}</BillStatusTooltipShell>;
}
