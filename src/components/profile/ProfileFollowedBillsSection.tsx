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
        <Box
          sx={{
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            textAlign: 'center',
            gap: 1.5,
            py: 4,
            px: 3,
            mb: 2,
            border: '1px dashed',
            borderColor: 'divider',
            borderRadius: 2,
            bgcolor: 'background.default',
          }}
        >
          <BookmarkBorder sx={{ fontSize: 36, color: 'text.disabled' }} aria-hidden />
          <Typography variant="subtitle1" fontWeight={600}>
            No bills followed yet
          </Typography>
          <Typography variant="body2" color="text.secondary" sx={{ maxWidth: 420 }}>
            Tap <strong>Follow</strong> on any bill page to add it here. We&apos;ll email you a
            digest when it changes status — committee action, floor votes, sent to governor,
            signed, vetoed.
          </Typography>
          <Box sx={{ display: 'flex', gap: 1, mt: 1, flexWrap: 'wrap', justifyContent: 'center' }}>
            <Button
              component={NextLink}
              href="/bills"
              variant="contained"
              size="small"
            >
              Browse bills
            </Button>
            <Button
              component={NextLink}
              href="/district-map"
              variant="outlined"
              size="small"
            >
              Find your legislators
            </Button>
          </Box>
        </Box>
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
