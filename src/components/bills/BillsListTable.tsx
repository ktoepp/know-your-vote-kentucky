'use client';

import React from 'react';
import Link from 'next/link';
import {
  Paper,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  TableSortLabel,
  Tooltip,
  Typography,
} from '@mui/material';
import type { KYBill } from '@/types/kentucky';
import type { KyBillSortKey } from '@/lib/bill-display';
import {
  billStatusChipLabel,
  billStatusToTooltipKey,
  effectiveBillChamber,
  formatBillLabelText,
  isSignedByGovernorBillStatus,
} from '@/lib/bill-display';
import { governmentTooltips } from '@/lib/tooltipContent';

export interface BillsListTableProps {
  bills: KYBill[];
  sortBy: KyBillSortKey;
  sortDir: 'asc' | 'desc';
  onRequestSort: (key: KyBillSortKey) => void;
}

function billHref(bill: KYBill): string {
  return `/bills/${bill.id}`;
}

function formatShortDate(iso: string | null | undefined): string {
  if (iso == null || iso === '') return '';
  const t = Date.parse(iso);
  if (Number.isNaN(t)) return '';
  return new Date(t).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
}

function chamberLabel(bill: KYBill): string {
  const c = effectiveBillChamber(bill);
  if (c === 'house') return 'House';
  if (c === 'senate') return 'Senate';
  return '';
}

export function BillsListTable({ bills, sortBy, sortDir, onRequestSort }: BillsListTableProps) {
  const head = (id: KyBillSortKey, label: string, width?: string) => (
    <TableCell sortDirection={sortBy === id ? sortDir : false} sx={{ fontWeight: 600, width }}>
      <TableSortLabel active={sortBy === id} direction={sortBy === id ? sortDir : 'asc'} onClick={() => onRequestSort(id)}>
        {label}
      </TableSortLabel>
    </TableCell>
  );

  return (
    <TableContainer component={Paper} elevation={1} sx={{ borderRadius: 2 }}>
      <Table size="small" sx={{ minWidth: 720 }} aria-label="Bills list">
        <TableHead>
          <TableRow>
            {head('bill_number', 'Bill number')}
            {head('title', 'Title')}
            {head('chamber', 'Chamber', '100px')}
            {head('session', 'Session', '110px')}
            {head('status', 'Status', '140px')}
            {head('introduced_date', 'Introduced', '112px')}
            {head('last_action_date', 'Last action', '112px')}
          </TableRow>
        </TableHead>
        <TableBody>
          {bills.map((bill) => (
            <TableRow key={bill.id} hover sx={{ '&:last-child td': { border: 0 } }}>
              <TableCell sx={{ whiteSpace: 'nowrap', fontWeight: 600 }}>
                <Typography
                  component={Link}
                  href={billHref(bill)}
                  sx={{ color: 'primary.main', textDecoration: 'none', '&:hover': { textDecoration: 'underline' } }}
                >
                  {bill.bill_number}
                </Typography>
              </TableCell>
              <TableCell>
                <Typography
                  component={Link}
                  href={billHref(bill)}
                  variant="body2"
                  sx={{
                    color: 'text.primary',
                    textDecoration: 'none',
                    display: '-webkit-box',
                    WebkitLineClamp: 2,
                    WebkitBoxOrient: 'vertical',
                    overflow: 'hidden',
                    '&:hover': { color: 'primary.main' },
                  }}
                >
                  {bill.title}
                </Typography>
              </TableCell>
              <TableCell>{chamberLabel(bill)}</TableCell>
              <TableCell>{bill.session || ''}</TableCell>
              <TableCell>
                {bill.status ? (() => {
                  const label = formatBillLabelText(
                    isSignedByGovernorBillStatus(bill.status!) ? billStatusChipLabel(bill.status) : bill.status!,
                  );
                  const key = billStatusToTooltipKey(bill.status);
                  const tip = key ? governmentTooltips[key] : null;
                  return tip ? (
                    <Tooltip
                      title={<><strong>{tip.title}</strong><br />{tip.content}</>}
                      arrow
                      enterDelay={300}
                      componentsProps={{ tooltip: { sx: { maxWidth: 320 } } }}
                    >
                      <span style={{ cursor: 'help', borderBottom: '1px dotted currentColor' }}>{label}</span>
                    </Tooltip>
                  ) : label;
                })() : ''}
              </TableCell>
              <TableCell>{formatShortDate(bill.introduced_date)}</TableCell>
              <TableCell>{formatShortDate(bill.last_action_date)}</TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </TableContainer>
  );
}
