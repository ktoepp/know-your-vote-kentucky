'use client';

import React, { useCallback, useEffect, useState } from 'react';
import {
  Box,
  Button,
  CircularProgress,
  Chip,
  List,
  ListItem,
  ListItemText,
  Typography,
} from '@mui/material';
import { Bookmark } from 'lucide-react';
import NextLink from 'next/link';
import { useUser } from '@/app/lib/UserContext';
import { normalizeKyGaDisplayName } from '@/lib/ky-committee-display';

type CommitteeFollowRow = {
  created_at: string;
  committee: {
    id: string;
    name: string;
    slug: string;
    chamber: string;
  } | null;
};

export function ProfileFollowedCommitteesSection() {
  const { session } = useUser();
  const token = session?.access_token ?? null;

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [rows, setRows] = useState<CommitteeFollowRow[]>([]);
  const [busyId, setBusyId] = useState<string | null>(null);

  const load = useCallback(async () => {
    if (!token) return;
    setLoading(true);
    setError(null);
    try {
      const res = await fetch('/api/me/follows', {
        headers: { Authorization: `Bearer ${token}` },
      });
      const body = (await res.json().catch(() => ({}))) as {
        committees?: CommitteeFollowRow[];
        error?: string;
      };
      if (!res.ok) throw new Error(typeof body.error === 'string' ? body.error : 'Could not load followed committees');
      setRows(body.committees ?? []);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Could not load followed committees');
    } finally {
      setLoading(false);
    }
  }, [token]);

  useEffect(() => {
    void load();
  }, [load]);

  const unfollow = async (committeeId: string) => {
    if (!token) return;
    setBusyId(committeeId);
    setError(null);
    try {
      const res = await fetch(`/api/committees/${encodeURIComponent(committeeId)}/follow`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` },
      });
      const body = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(typeof body.error === 'string' ? body.error : 'Could not unfollow');
      setRows((prev) => prev.filter((r) => r.committee?.id !== committeeId));
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Could not unfollow');
    } finally {
      setBusyId(null);
    }
  };

  if (!token) return null;

  return (
    <>
      <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 1, mb: 2 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.25 }}>
          <Box sx={{ color: 'primary.main', display: 'flex' }} aria-hidden>
            <Bookmark size={28} strokeWidth={1.7} />
          </Box>
          <Typography variant="h6" component="h2" fontWeight={700}>
            Followed committees
          </Typography>
        </Box>
        <Button component={NextLink} href="/committees" size="small" variant="outlined" sx={{ textTransform: 'none' }}>
          Browse committees
        </Button>
      </Box>

      {error && (
        <Typography color="error" variant="body2" sx={{ mb: 2 }}>
          {error}
        </Typography>
      )}

      {loading ? (
        <Box sx={{ display: 'flex', justifyContent: 'center', py: 3 }}>
          <CircularProgress size={28} aria-label="Loading followed committees" />
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
          <Bookmark size={36} strokeWidth={1.3} style={{ color: 'var(--mui-palette-text-disabled, #bdbdbd)' }} aria-hidden />
          <Typography variant="subtitle1" fontWeight={600}>
            No committees followed yet
          </Typography>
          <Typography variant="body2" color="text.secondary" sx={{ maxWidth: 420 }}>
            Tap <strong>Follow</strong> on any committee page to get notified when new meetings are
            added to the calendar.
          </Typography>
          <Button component={NextLink} href="/committees" variant="contained" size="small" sx={{ mt: 1 }}>
            Browse committees
          </Button>
        </Box>
      ) : (
        <List disablePadding>
          {rows.map((row) => {
            const committee = row.committee;
            if (!committee) return null;
            const displayName = normalizeKyGaDisplayName(committee.name);
            const chamberLabel =
              committee.chamber === 'house'
                ? 'House'
                : committee.chamber === 'senate'
                  ? 'Senate'
                  : committee.chamber === 'joint'
                    ? 'Joint'
                    : null;
            return (
              <ListItem
                key={`${row.created_at}-${committee.id}`}
                disableGutters
                sx={{ alignItems: 'flex-start', py: 1.5 }}
              >
                <ListItemText
                  primary={
                    <Box component="span" sx={{ display: 'flex', alignItems: 'center', gap: 0.75, flexWrap: 'wrap' }}>
                      <Typography
                        component={NextLink}
                        href={`/committees/${encodeURIComponent(committee.slug)}`}
                        variant="body1"
                        fontWeight={600}
                        sx={{ textDecoration: 'none', '&:hover': { textDecoration: 'underline' } }}
                      >
                        {displayName}
                      </Typography>
                      {chamberLabel && (
                        <Chip label={chamberLabel} size="small" variant="outlined" sx={{ height: 20, fontSize: '0.72rem' }} />
                      )}
                    </Box>
                  }
                />
                <Button
                  size="small"
                  variant="outlined"
                  color="inherit"
                  disabled={busyId === committee.id}
                  onClick={() => void unfollow(committee.id)}
                  aria-label={`Unfollow ${displayName}`}
                  sx={{ ml: 2, flexShrink: 0 }}
                >
                  {busyId === committee.id ? '…' : 'Unfollow'}
                </Button>
              </ListItem>
            );
          })}
        </List>
      )}
    </>
  );
}
