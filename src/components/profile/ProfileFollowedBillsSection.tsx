'use client';

import React, { useCallback, useEffect, useState } from 'react';
import {
  Box,
  Button,
  CircularProgress,
  Link as MuiLink,
  List,
  ListItem,
  ListItemText,
  Typography,
} from '@mui/material';
import { BookmarkBorder } from '@mui/icons-material';
import NextLink from 'next/link';
import { useUser } from '@/app/lib/UserContext';

type FollowRow = {
  created_at: string;
  bill: {
    id: string;
    bill_number: string | null;
    title: string | null;
    status: string | null;
  } | null;
};

export function ProfileFollowedBillsSection() {
  const { session } = useUser();
  const token = session?.access_token ?? null;

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [rows, setRows] = useState<FollowRow[]>([]);
  const [busyId, setBusyId] = useState<string | null>(null);

  const load = useCallback(async () => {
    if (!token) return;
    setLoading(true);
    setError(null);
    try {
      const res = await fetch('/api/me/follows', {
        headers: { Authorization: `Bearer ${token}` },
      });
      const body = (await res.json().catch(() => ({}))) as { bills?: FollowRow[]; error?: string };
      if (!res.ok) throw new Error(typeof body.error === 'string' ? body.error : 'Could not load followed bills');
      setRows(body.bills ?? []);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Could not load followed bills');
    } finally {
      setLoading(false);
    }
  }, [token]);

  useEffect(() => {
    void load();
  }, [load]);

  const unfollow = async (billId: string) => {
    if (!token) return;
    setBusyId(billId);
    setError(null);
    try {
      const res = await fetch(`/api/bills/${encodeURIComponent(billId)}/follow`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` },
      });
      const body = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(typeof body.error === 'string' ? body.error : 'Could not unfollow');
      setRows((prev) => prev.filter((r) => r.bill?.id !== billId));
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Could not unfollow');
    } finally {
      setBusyId(null);
    }
  };

  if (!token) return null;

  return (
    <>
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.25, mb: 2 }}>
        <Box sx={{ color: 'primary.main', display: 'flex' }} aria-hidden>
          <BookmarkBorder sx={{ fontSize: 28 }} />
        </Box>
        <Typography variant="h6" component="h2" fontWeight={700}>
          Followed bills
        </Typography>
      </Box>

      {error && (
        <Typography color="error" variant="body2" sx={{ mb: 2 }}>
          {error}
        </Typography>
      )}

      {loading ? (
        <Box sx={{ display: 'flex', justifyContent: 'center', py: 3 }}>
          <CircularProgress size={28} aria-label="Loading followed bills" />
        </Box>
      ) : rows.length === 0 ? (
        <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
          You&apos;re not following any bills yet.{' '}
          <MuiLink component={NextLink} href="/bills">
            Browse current bills
          </MuiLink>{' '}
          and use Follow on a bill to track it.
        </Typography>
      ) : (
        <List disablePadding>
          {rows.map((row) => {
            const bill = row.bill;
            if (!bill) return null;
            const label = bill.bill_number || `Bill ${bill.id.slice(0, 8)}…`;
            return (
              <ListItem
                key={`${row.created_at}-${bill.id}`}
                disableGutters
                sx={{ alignItems: 'flex-start', flexDirection: { xs: 'column', sm: 'row' }, gap: 1, py: 1.5 }}
              >
                <ListItemText
                  primary={
                    <MuiLink component={NextLink} href={`/bills/${bill.id}`} fontWeight={600} underline="hover">
                      {label}
                    </MuiLink>
                  }
                  secondary={bill.title ?? bill.status ?? undefined}
                  secondaryTypographyProps={{ sx: { mt: 0.5 } }}
                />
                <Button
                  size="small"
                  variant="outlined"
                  color="inherit"
                  disabled={busyId === bill.id}
                  onClick={() => void unfollow(bill.id)}
                  aria-label={`Unfollow ${label}`}
                >
                  {busyId === bill.id ? 'Removing…' : 'Unfollow'}
                </Button>
              </ListItem>
            );
          })}
        </List>
      )}
    </>
  );
}
