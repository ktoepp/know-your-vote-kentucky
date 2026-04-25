'use client';

import { Box, Paper, Typography } from '@mui/material';
import { alpha } from '@mui/material/styles';
import Link from 'next/link';
import { CheckCircle2, Activity } from 'lucide-react';
import type { KYBill } from '@/types/kentucky';
import { billStatusChipLabel, formatBillLabelText } from '@/lib/bill-display';

const ROW_ICON_BOX = 32;

function formatShortDate(iso: string | null | undefined): string {
  if (iso == null || iso === '') return '';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '';
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
}

export type HomeCuratedBillListProps = {
  title: string;
  caption?: string;
  bills: KYBill[];
  line: 'status' | 'lastAction';
  emptyMessage: string;
  kind: 'passed' | 'action';
};

function listIconComponent(kind: 'passed' | 'action') {
  return kind === 'passed' ? CheckCircle2 : Activity;
}

export function HomeCuratedBillList({ title, caption, bills, line, emptyMessage, kind }: HomeCuratedBillListProps) {
  const Icon = listIconComponent(kind);
  return (
    <Paper
      variant="outlined"
      sx={{
        overflow: 'hidden',
        display: 'flex',
        flexDirection: 'column',
        bgcolor: 'background.paper',
      }}
    >
      <Box
        sx={{
          px: 1.5,
          py: 1.25,
          borderBottom: 1,
          borderColor: 'divider',
          display: 'flex',
          alignItems: 'flex-start',
          gap: 1,
        }}
      >
        <Box
          aria-hidden
          sx={{
            width: ROW_ICON_BOX,
            height: ROW_ICON_BOX,
            borderRadius: 1,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            flexShrink: 0,
            bgcolor: theme => alpha(kind === 'passed' ? theme.palette.success.main : theme.palette.info.main, 0.12),
            color: kind === 'passed' ? 'success.main' : 'info.main',
          }}
        >
          <Icon size={18} strokeWidth={1.75} />
        </Box>
        <Box sx={{ minWidth: 0, pt: 0.1 }}>
          <Typography variant="subtitle2" fontWeight={700} component="h2" sx={{ lineHeight: 1.25 }}>
            {title}
          </Typography>
          {caption ? (
            <Typography variant="caption" color="text.secondary" sx={{ display: 'block', lineHeight: 1.4 }}>
              {caption}
            </Typography>
          ) : null}
        </Box>
      </Box>

      {bills.length === 0 ? (
        <Box sx={{ px: 1.5, py: 2 }}>
          <Typography variant="body2" color="text.secondary">
            {emptyMessage}
          </Typography>
        </Box>
      ) : (
        <Box component="nav" aria-label={title} sx={{ py: 0.5 }}>
          {bills.map((bill, i) => {
            const when = formatShortDate(bill.last_action_date);
            const secondary =
              line === 'status'
                ? formatBillLabelText(billStatusChipLabel(bill.status) || bill.status || '') || '—'
                : formatBillLabelText(bill.last_action) || '—';
            return (
              <Box
                key={bill.id}
                component={Link}
                href={`/bills/${bill.id}`}
                sx={{
                  display: 'block',
                  py: 1.1,
                  px: 1.5,
                  textDecoration: 'none',
                  color: 'text.primary',
                  borderBottom: i < bills.length - 1 ? 1 : 0,
                  borderColor: 'divider',
                  transition: 'background-color 0.12s',
                  '&:hover': { bgcolor: 'action.hover' },
                }}
              >
                <Typography
                  component="div"
                  variant="caption"
                  color="primary"
                  fontWeight={700}
                  sx={{ display: 'block', letterSpacing: 0.02, mb: 0.25 }}
                >
                  {bill.bill_number}
                </Typography>
                <Typography
                  variant="body2"
                  sx={{
                    lineHeight: 1.35,
                    mb: 0.35,
                    display: '-webkit-box',
                    WebkitLineClamp: 2,
                    WebkitBoxOrient: 'vertical',
                    overflow: 'hidden',
                  }}
                >
                  {bill.title}
                </Typography>
                <Typography variant="caption" color="text.secondary" sx={{ display: 'block', lineHeight: 1.35 }}>
                  {when ? <>{when} · </> : null}
                  {secondary}
                </Typography>
              </Box>
            );
          })}
        </Box>
      )}
    </Paper>
  );
}
