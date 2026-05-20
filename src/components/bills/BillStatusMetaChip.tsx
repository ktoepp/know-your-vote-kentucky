'use client';

import React from 'react';
import { Check } from '@mui/icons-material';
import { Chip as MuiChip } from '@mui/material';
import type { KYBill } from '@/types/kentucky';
import { MetaChip } from '@/components/ui/Chip';
import {
  billStatusChipLabel,
  classifyKyBillBrowseBucket,
  formatBillLabelText,
  isSignedByGovernorBillStatus,
} from '@/lib/bill-display';

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
  const passed = !signed && classifyKyBillBrowseBucket(billForBucket) === 'passed';
  const showCheck = signed || passed;
  const label = signed ? billStatusChipLabel(status) : formatBillLabelText(status);

  if (variant === 'detail') {
    return (
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
  }

  if (showCheck) {
    return (
      <MetaChip
        icon={<Check sx={{ fontSize: '1.125rem !important' }} />}
        label={label}
        tone="success"
        variant="outlined"
      />
    );
  }

  return <MetaChip label={label} tone="default" variant="outlined" />;
}
