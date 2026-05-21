'use client';

import React, { useCallback, useEffect, useState } from 'react';
import {
  Alert,
  Box,
  Button,
  CircularProgress,
  IconButton,
  Link as MuiLink,
  List,
  ListItem,
  ListItemText,
  TextField,
  Typography,
} from '@mui/material';
import { Close as CloseIcon, Link as LinkIcon } from '@mui/icons-material';
import NextLink from 'next/link';
import { useUser } from '@/app/lib/UserContext';

type SavedSearch = {
  id: string;
  label: string;
  href: string;
  created_at: string;
};

export function ProfileSavedSearchesSection() {
  const { session } = useUser();
  const token = session?.access_token ?? null;

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [rows, setRows] = useState<SavedSearch[]>([]);
  const [busyId, setBusyId] = useState<string | null>(null);

  const load = useCallback(async () => {
    if (!token) return;
    setLoading(true);
    setError(null);
    try {
      const res = await fetch('/api/me/saved-searches', {
        headers: { Authorization: `Bearer ${token}` },
      });
      const body = (await res.json().catch(() => ({}))) as {
        searches?: SavedSearch[];
        error?: string;
      };
      if (!res.ok) throw new Error(typeof body.error === 'string' ? body.error : 'Could not load saved searches');
      setRows(body.searches ?? []);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Could not load saved searches');
    } finally {
      setLoading(false);
    }
  }, [token]);

  useEffect(() => {
    void load();
  }, [load]);

  const remove = async (id: string) => {
    if (!token) return;
    setBusyId(id);
    try {
      const res = await fetch(`/api/me/saved-searches?id=${encodeURIComponent(id)}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` },
      });
      const body = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(typeof body.error === 'string' ? body.error : 'Delete failed');
      setRows((prev) => prev.filter((r) => r.id !== id));
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Delete failed');
    } finally {
      setBusyId(null);
    }
  };

  if (!token) return null;

  return (
    <>
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.25, mb: 1 }}>
        <LinkIcon sx={{ color: 'primary.main', fontSize: 28 }} aria-hidden />
        <Typography variant="h6" component="h2" fontWeight={700}>
          Saved searches
        </Typography>
      </Box>
      <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
        Bookmark bill browse filters with <strong>Save search</strong> on the bills page. Topic follows and
        digests still cover most &quot;new bill&quot; alerts without a rules wizard.
      </Typography>

      {error && (
        <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError(null)}>
          {error}
        </Alert>
      )}

      {loading ? (
        <Box sx={{ display: 'flex', justifyContent: 'center', py: 2 }}>
          <CircularProgress size={28} aria-label="Loading saved searches" />
        </Box>
      ) : rows.length === 0 ? (
        <Typography variant="body2" color="text.secondary">
          No saved searches yet.{' '}
          <MuiLink component={NextLink} href="/bills" fontWeight={600}>
            Browse bills
          </MuiLink>
          , apply filters, then use <strong>Save search</strong>.
        </Typography>
      ) : (
        <List dense disablePadding>
          {rows.map((row) => (
            <ListItem
              key={row.id}
              disableGutters
              secondaryAction={
                <IconButton
                  edge="end"
                  aria-label={`Remove saved search ${row.label}`}
                  disabled={busyId === row.id}
                  onClick={() => void remove(row.id)}
                >
                  <CloseIcon fontSize="small" />
                </IconButton>
              }
            >
              <ListItemText
                primary={
                  <MuiLink component={NextLink} href={row.href} fontWeight={600} underline="hover">
                    {row.label}
                  </MuiLink>
                }
                secondary={row.href}
                secondaryTypographyProps={{ sx: { fontFamily: 'monospace', fontSize: '0.75rem' } }}
              />
            </ListItem>
          ))}
        </List>
      )}
    </>
  );
}

/** Dialog fields used from BillsBrowse when saving a search. */
export function SaveSearchDialogFields({
  label,
  onLabelChange,
}: {
  label: string;
  onLabelChange: (v: string) => void;
}) {
  return (
    <TextField
      autoFocus
      label="Name this search"
      value={label}
      onChange={(e) => onLabelChange(e.target.value)}
      fullWidth
      size="small"
      inputProps={{ maxLength: 120 }}
      placeholder="e.g. Education bills in committee"
    />
  );
}
