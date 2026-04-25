'use client';

import { Box, Paper, Typography } from '@mui/material';
import { alpha } from '@mui/material/styles';
import Link from 'next/link';
import { CheckCircle2, Eye, ChevronRight } from 'lucide-react';
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
  line: 'status' | 'viewCount';
  emptyMessage: string;
  kind: 'passed' | 'views';
};

function listIconComponent(kind: 'passed' | 'views') {
  return kind === 'passed' ? CheckCircle2 : Eye;
}

export function HomeCuratedBillList({ title, caption, bills, line, emptyMessage, kind }: HomeCuratedBillListProps) {
  const Icon = listIconComponent(kind);
  const headingId = `curated-bills-${kind}-heading`;
  return (
    <Box component="section" aria-labelledby={headingId}>
      <Box
        sx={{
          display: 'flex',
          alignItems: 'flex-start',
          gap: 1,
          mb: 1.25,
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
            mt: 0.15,
            bgcolor: theme =>
              alpha(kind === 'passed' ? theme.palette.success.main : theme.palette.info.main, 0.12),
            color: kind === 'passed' ? 'success.main' : 'info.main',
          }}
        >
          <Icon size={18} strokeWidth={1.75} />
        </Box>
        <Box sx={{ minWidth: 0 }}>
          <Typography id={headingId} variant="subtitle1" fontWeight={700} component="h2" sx={{ lineHeight: 1.3 }}>
            {title}
          </Typography>
          {caption ? (
            <Typography variant="caption" color="text.secondary" component="p" sx={{ display: 'block', lineHeight: 1.4, m: 0, mt: 0.25 }}>
              {caption}
            </Typography>
          ) : null}
        </Box>
      </Box>

      <Paper
        variant="outlined"
        sx={{
          overflow: 'hidden',
          display: 'flex',
          flexDirection: 'column',
          bgcolor: 'background.paper',
        }}
      >
        {bills.length === 0 ? (
          <Box sx={{ px: 1.5, py: 2 }}>
            <Typography variant="body2" color="text.secondary">
              {emptyMessage}
            </Typography>
          </Box>
        ) : (
          <Box component="nav" aria-labelledby={headingId} sx={{ py: 0.5 }}>
            {bills.map((bill, i) => {
              const when = formatShortDate(bill.last_action_date);
              const views = bill.view_count ?? 0;
              const viewLine =
                views > 0 ? `${views.toLocaleString()} view${views === 1 ? '' : 's'}` : 'No views yet';
              const secondary =
                line === 'status'
                  ? formatBillLabelText(billStatusChipLabel(bill.status) || bill.status || '') || '—'
                  : viewLine;
              const rowLabel = `${bill.bill_number}: ${bill.title}. See more about this bill.`;
              return (
                <Box
                  key={bill.id}
                  component={Link}
                  href={`/bills/${bill.id}`}
                  aria-label={rowLabel}
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
                    '&:hover .home-curated-see-more': { textDecoration: 'underline' },
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
                  <Typography variant="caption" color="text.secondary" sx={{ display: 'block', lineHeight: 1.35, mb: 0.75 }}>
                    {when ? <>{when} · </> : null}
                    {secondary}
                  </Typography>
                  <Typography
                    className="home-curated-see-more"
                    component="span"
                    variant="caption"
                    sx={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'flex-end',
                      gap: 0.25,
                      fontWeight: 600,
                      color: 'primary.main',
                    }}
                  >
                    See more
                    <ChevronRight size={14} strokeWidth={2.25} aria-hidden focusable={false} />
                  </Typography>
                </Box>
              );
            })}
          </Box>
        )}
      </Paper>
    </Box>
  );
}
