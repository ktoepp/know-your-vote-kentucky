'use client';

import React from 'react';
import Link from 'next/link';
import { Check } from '@mui/icons-material';
import { Box, Chip as MuiChip, Tooltip, Typography } from '@mui/material';
import type { KYBill } from '@/types/kentucky';
import { MetaChip } from '@/components/ui/Chip';
import { useTooltips } from '@/lib/TooltipContext';
import {
  billStatusChipLabel,
  billStatusToTooltipKey,
  classifyKyBillBrowseBucket,
  formatBillLabelText,
  isSignedByGovernorBillStatus,
} from '@/lib/bill-display';
import { governmentTooltips } from '@/lib/tooltipContent';

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
          <Box
            sx={{
              mt: 0.75,
              pt: 0.75,
              borderTop: '1px solid',
              borderColor: 'divider',
              textAlign: 'right',
            }}
          >
            <Link
              href={`/glossary#${key}`}
              style={{
                fontSize: '0.75rem',
                fontWeight: 500,
                textDecoration: 'underline',
                textUnderlineOffset: 2,
                opacity: 0.85,
              }}
            >
              Learn more →
            </Link>
          </Box>
        </Box>
      }
      arrow
      enterDelay={300}
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

export function BillStatusMetaChip({ bill, statusOverride, variant = 'card' }: BillStatusMetaChipProps) {
  const status = statusOverride ?? bill.status;
  const billForBucket = statusOverride != null && statusOverride !== bill.status ? { ...bill, status: statusOverride } : bill;
  if (!status) return null;

  const signed = isSignedByGovernorBillStatus(status);
  const chaptered = status.trim().toLowerCase().includes('chaptered');
  const passed = !signed && !chaptered && classifyKyBillBrowseBucket(billForBucket) === 'passed';
  const showCheck = signed || chaptered || passed;
  const label = signed ? billStatusChipLabel(status) : formatBillLabelText(status);

  let chip: React.ReactElement;
  if (variant === 'detail') {
    chip = (
      <MuiChip
        icon={showCheck ? <Check sx={{ fontSize: '1.125rem !important' }} /> : undefined}
        label={label}
        size="medium"
        color={showCheck ? 'success' : 'default'}
        variant={showCheck ? 'outlined' : 'filled'}
        sx={{
          fontSize: '0.9rem',
          fontWeight: 600,
          '& .MuiChip-label': { px: 1.25 },
          ...(showCheck && {
            color: 'success.main',
            borderColor: 'success.main',
            '& .MuiChip-icon': { color: 'success.main' },
          }),
        }}
      />
    );
  } else if (showCheck) {
    chip = (
      <MetaChip
        icon={<Check sx={{ fontSize: '1.125rem !important' }} />}
        label={label}
        tone="success"
        variant="outlined"
      />
    );
  } else {
    chip = <MetaChip label={label} tone="default" variant="outlined" />;
  }

  return <BillStatusTooltipShell status={status}>{chip}</BillStatusTooltipShell>;
}
