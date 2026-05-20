'use client';

import React, { useCallback, useEffect, useState } from 'react';
import {
  Box,
  Button,
  Chip,
  CircularProgress,
  Link as MuiLink,
  List,
  ListItem,
  ListItemText,
  Typography,
} from '@mui/material';
import { Event, HistoryOutlined } from '@mui/icons-material';
import NextLink from 'next/link';
import { useUser } from '@/app/lib/UserContext';
import type { ProfileActivityItem } from '@/app/api/me/activity/route';
import { formatKyMeetingDate } from '@/lib/ky-committee-display';
import { BillNumber } from '@/components/bills/BillNumber';
import { ICON_REM, SECTION_TITLE_DISPLAY_SX, TYPE } from '@/lib/ui-tokens';

const ACTIVITY_FILTER_STORAGE_KEY = 'kyvky-profile-activity-filter';

export type ActivityKindFilter = 'all' | 'bill' | 'hearing';

const FILTER_OPTIONS: { value: ActivityKindFilter; label: string }[] = [
  { value: 'all', label: 'All' },
  { value: 'bill', label: 'Bill updates' },
  { value: 'hearing', label: 'Hearings' },
];

function formatOccurredAt(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  return d.toLocaleString(undefined, {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  });
}

function readStoredFilter(): ActivityKindFilter {
  if (typeof window === 'undefined') return 'all';
  const v = window.localStorage.getItem(ACTIVITY_FILTER_STORAGE_KEY);
  if (v === 'bill' || v === 'hearing' || v === 'all') return v;
  return 'all';
}

function EmptyState({
  filter,
}: {
  filter: ActivityKindFilter;
}) {
  if (filter === 'hearing') {
    return (
      <Typography variant="body2" color="text.secondary">
        No upcoming hearings for bills you follow. Browse{' '}
        <MuiLink component={NextLink} href="/meetings" fontWeight={600}>
          committee meetings
        </MuiLink>{' '}
        or enable <strong>Agenda / hearing scheduled</strong> under{' '}
        <MuiLink component={NextLink} href="/profile#notifications" fontWeight={600}>
          Notifications
        </MuiLink>
        .
      </Typography>
    );
  }
  if (filter === 'bill') {
    return (
      <Typography variant="body2" color="text.secondary">
        No recent status changes for followed bills.{' '}
        <MuiLink component={NextLink} href="/bills" fontWeight={600}>
          Browse bills
        </MuiLink>{' '}
        and tap Follow on bills you want to track.
      </Typography>
    );
  }
  return (
    <Typography variant="body2" color="text.secondary">
      Follow bills to see status changes and committee agenda lines here.{' '}
      <MuiLink component={NextLink} href="/bills" fontWeight={600}>
        Browse bills
      </MuiLink>
      .
    </Typography>
  );
}

export function ProfileActivitySection() {
  const { session } = useUser();
  const token = session?.access_token ?? null;

  const [kindFilter, setKindFilter] = useState<ActivityKindFilter>('all');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [items, setItems] = useState<ProfileActivityItem[]>([]);

  useEffect(() => {
    setKindFilter(readStoredFilter());
  }, []);

  const load = useCallback(async () => {
    if (!token) return;
    setLoading(true);
    setError(null);
    try {
      const qs = kindFilter === 'all' ? '' : `?kind=${kindFilter}`;
      const res = await fetch(`/api/me/activity${qs}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const body = (await res.json().catch(() => ({}))) as {
        items?: ProfileActivityItem[];
        error?: string;
      };
      if (!res.ok) throw new Error(typeof body.error === 'string' ? body.error : 'Could not load activity');
      setItems(body.items ?? []);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Could not load activity');
    } finally {
      setLoading(false);
    }
  }, [token, kindFilter]);

  useEffect(() => {
    void load();
  }, [load]);

  const setFilter = (next: ActivityKindFilter) => {
    setKindFilter(next);
    if (typeof window !== 'undefined') {
      window.localStorage.setItem(ACTIVITY_FILTER_STORAGE_KEY, next);
    }
  };

  if (!token) return null;

  return (
    <>
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, mb: 1 }}>
        <HistoryOutlined sx={{ color: 'primary.main', fontSize: ICON_REM.section }} aria-hidden />
        <Typography
          component="h2"
          variant={TYPE.sectionTitle.variant}
          fontWeight={TYPE.sectionTitle.fontWeight}
          sx={SECTION_TITLE_DISPLAY_SX}
        >
          Your activity
        </Typography>
      </Box>
      <Typography variant="body2" color="text.secondary" sx={{ mb: 1.5 }}>
        Recent updates and upcoming hearings for bills you follow — one timeline instead of separate alert columns.
      </Typography>

      <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.75, mb: 2 }} role="group" aria-label="Activity filter">
        {FILTER_OPTIONS.map((opt) => (
          <Chip
            key={opt.value}
            label={opt.label}
            size="small"
            clickable
            color={kindFilter === opt.value ? 'primary' : 'default'}
            variant={kindFilter === opt.value ? 'filled' : 'outlined'}
            onClick={() => setFilter(opt.value)}
          />
        ))}
      </Box>

      {loading && (
        <Box sx={{ display: 'flex', justifyContent: 'center', py: 3 }}>
          <CircularProgress size={28} aria-label="Loading activity" />
        </Box>
      )}

      {error && (
        <Typography color="error" variant="body2" sx={{ mb: 2 }}>
          {error}
        </Typography>
      )}

      {!loading && !error && items.length === 0 && <EmptyState filter={kindFilter} />}

      {!loading && items.length > 0 && (
        <List disablePadding>
          {items.map((item) => (
            <ListItem key={item.id} alignItems="flex-start" sx={{ px: 0, py: 1.25 }}>
              <ListItemText
                primary={
                  <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.75, alignItems: 'center', mb: 0.5 }}>
                    <Chip
                      size="small"
                      icon={item.kind === 'hearing' ? <Event fontSize="small" /> : undefined}
                      label={item.kind === 'hearing' ? 'Hearing' : 'Bill update'}
                      color={item.kind === 'hearing' ? 'info' : 'default'}
                      variant="outlined"
                    />
                    <Typography component="span" variant="caption" color="text.secondary">
                      {item.kind === 'hearing' && item.occurred_at
                        ? formatKyMeetingDate(item.occurred_at.slice(0, 10))
                        : formatOccurredAt(item.occurred_at)}
                    </Typography>
                  </Box>
                }
                secondary={
                  <Box component="div" sx={{ pt: 0.25 }}>
                    <Box sx={{ display: 'block', mb: 0.25 }}>
                      {item.bill_number ? (
                        <>
                          <BillNumber billNumber={item.bill_number} size="compact" href={item.href} />
                          {item.bill_title ? (
                            <Typography component="span" variant="body2" color="text.secondary" sx={{ ml: 0.5 }}>
                              — {item.bill_title}
                            </Typography>
                          ) : null}
                        </>
                      ) : (
                        <MuiLink component={NextLink} href={item.href} fontWeight={600} underline="hover">
                          {item.label}
                        </MuiLink>
                      )}
                    </Box>
                    <Typography variant="body2" color="text.secondary">
                      {item.label}
                    </Typography>
                    {item.detail && (
                      <Typography variant="caption" color="text.secondary" display="block" sx={{ mt: 0.5 }}>
                        {item.detail}
                      </Typography>
                    )}
                  </Box>
                }
                secondaryTypographyProps={{ component: 'div' }}
              />
            </ListItem>
          ))}
        </List>
      )}

      <Button component={NextLink} href="/meetings" size="small" sx={{ mt: 1, textTransform: 'none' }}>
        Browse all committee meetings
      </Button>
    </>
  );
}
