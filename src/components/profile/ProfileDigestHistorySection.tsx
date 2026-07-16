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
  Stack,
  Typography,
} from '@mui/material';
import { HistoryOutlined } from '@mui/icons-material';
import NextLink from 'next/link';
import { useUser } from '@/app/lib/UserContext';

type DigestHistoryBill = {
  id: string;
  bill_number: string | null;
  title: string | null;
  event_type: string;
  event_label: string;
};

export type DigestHistoryEntry = {
  id: number;
  sent_at: string;
  digest_window_start: string;
  digest_window_end: string;
  delivery_status: 'sent' | 'failed' | 'bounced';
  bills: DigestHistoryBill[];
};

const INITIAL_PAGE_SIZE = 10;
const PAGE_SIZE = 10;
const BILLS_COLLAPSED = 5;

function formatSentAt(iso: string): string {
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

type Props = {
  /** Dev preview only: when set, skips the network fetch and renders these entries. */
  mockEntries?: DigestHistoryEntry[];
};

export function ProfileDigestHistorySection({ mockEntries }: Props = {}) {
  const { session } = useUser();
  const token = session?.access_token ?? null;
  const isMock = mockEntries !== undefined;

  const [loading, setLoading] = useState(!isMock);
  const [loadingMore, setLoadingMore] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [entries, setEntries] = useState<DigestHistoryEntry[]>(mockEntries ?? []);
  const [limit, setLimit] = useState(INITIAL_PAGE_SIZE);
  const [reachedEnd, setReachedEnd] = useState(isMock); // mock data is the full set
  const [expanded, setExpanded] = useState<Record<number, boolean>>({});

  const fetchEntries = useCallback(
    async (nextLimit: number) => {
      const res = await fetch(`/api/me/digest-history?limit=${nextLimit}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const body = (await res.json().catch(() => ({}))) as {
        entries?: DigestHistoryEntry[];
        error?: string;
      };
      if (!res.ok) {
        throw new Error(typeof body.error === 'string' ? body.error : 'Could not load digest history');
      }
      return body.entries ?? [];
    },
    [token],
  );

  const load = useCallback(async () => {
    if (!token) return;
    setLoading(true);
    setError(null);
    try {
      const next = await fetchEntries(INITIAL_PAGE_SIZE);
      setEntries(next);
      setLimit(INITIAL_PAGE_SIZE);
      setReachedEnd(next.length < INITIAL_PAGE_SIZE);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Could not load digest history');
    } finally {
      setLoading(false);
    }
  }, [token, fetchEntries]);

  const loadMore = useCallback(async () => {
    if (!token || reachedEnd || loadingMore) return;
    setLoadingMore(true);
    setError(null);
    const nextLimit = limit + PAGE_SIZE;
    try {
      const next = await fetchEntries(nextLimit);
      setEntries(next);
      setLimit(nextLimit);
      if (next.length < nextLimit) setReachedEnd(true);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Could not load earlier digests');
    } finally {
      setLoadingMore(false);
    }
  }, [token, reachedEnd, loadingMore, limit, fetchEntries]);

  useEffect(() => {
    if (isMock) return;
    void load();
  }, [load, isMock]);

  if (!isMock && !token) return null;

  return (
    <>
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.25, mb: 1 }}>
        <Box sx={{ color: 'primary.main', display: 'flex' }} aria-hidden>
          <HistoryOutlined sx={{ fontSize: 28 }} />
        </Box>
        <Typography variant="h6" component="h2" fontWeight={700}>
          Digest history
        </Typography>
      </Box>
      {error && (
        <Typography color="error" variant="body2" sx={{ mb: 2 }}>
          {error}
        </Typography>
      )}

      {loading ? (
        <Box sx={{ display: 'flex', justifyContent: 'center', py: 3 }}>
          <CircularProgress size={28} aria-label="Loading digest history" />
        </Box>
      ) : entries.length === 0 ? (
        <Box
          sx={{
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            textAlign: 'center',
            gap: 1,
            py: 4,
            px: 3,
            border: '1px dashed',
            borderColor: 'divider',
            borderRadius: 2,
            bgcolor: 'background.default',
          }}
        >
          <HistoryOutlined sx={{ fontSize: 36, color: 'text.disabled' }} aria-hidden />
          <Typography variant="subtitle1" fontWeight={600}>
            No digests sent yet
          </Typography>
          <Typography variant="body2" color="text.secondary" sx={{ maxWidth: 420 }}>
            Once a bill you follow has activity — committee action, floor votes, signed or
            vetoed — we&apos;ll email you a digest and list it here.
          </Typography>
        </Box>
      ) : (
        <>
          <List disablePadding>
            {entries.map((entry) => {
              const isExpanded = !!expanded[entry.id];
              const overCap = entry.bills.length > BILLS_COLLAPSED;
              const visibleBills = isExpanded || !overCap
                ? entry.bills
                : entry.bills.slice(0, BILLS_COLLAPSED);
              const hiddenCount = entry.bills.length - visibleBills.length;
              return (
                <ListItem
                  key={entry.id}
                  disableGutters
                  sx={{
                    alignItems: 'flex-start',
                    flexDirection: 'column',
                    gap: 1,
                    py: 2,
                    borderBottom: '1px solid',
                    borderColor: 'divider',
                    '&:last-child': { borderBottom: 'none' },
                  }}
                >
                  <Box sx={{ display: 'flex', alignItems: 'baseline', gap: 1, flexWrap: 'wrap' }}>
                    <Typography variant="subtitle2" fontWeight={700}>
                      {formatSentAt(entry.sent_at)}
                    </Typography>
                    <Typography variant="caption" color="text.secondary">
                      {entry.bills.length} {entry.bills.length === 1 ? 'bill' : 'bills'}
                    </Typography>
                  </Box>
                  {entry.bills.length === 0 ? (
                    <Typography variant="body2" color="text.secondary">
                      No bill updates in this digest — it contained committee updates, or the
                      underlying events are no longer available.
                    </Typography>
                  ) : (
                    <Stack spacing={0.75} sx={{ width: '100%' }}>
                      {visibleBills.map((bill) => {
                        const label = bill.bill_number || `Bill ${bill.id.slice(0, 8)}…`;
                        return (
                          <Box
                            key={`${entry.id}-${bill.id}`}
                            sx={{
                              display: 'flex',
                              flexWrap: 'wrap',
                              alignItems: 'baseline',
                              gap: 1,
                            }}
                          >
                            <MuiLink
                              component={NextLink}
                              href={`/bills/${bill.id}`}
                              fontWeight={600}
                              underline="hover"
                            >
                              {label}
                            </MuiLink>
                            <Chip
                              label={bill.event_label}
                              size="small"
                              variant="outlined"
                              sx={{ height: 22 }}
                            />
                            {bill.title && (
                              <Typography variant="body2" color="text.secondary" sx={{ flex: '1 1 240px' }}>
                                {bill.title}
                              </Typography>
                            )}
                          </Box>
                        );
                      })}
                      {overCap && (
                        <Button
                          size="small"
                          variant="text"
                          onClick={() =>
                            setExpanded((prev) => ({ ...prev, [entry.id]: !isExpanded }))
                          }
                          sx={{ alignSelf: 'flex-start', textTransform: 'none', px: 0.5 }}
                          aria-expanded={isExpanded}
                        >
                          {isExpanded
                            ? 'Show fewer'
                            : `Show all ${entry.bills.length} bills (${hiddenCount} more)`}
                        </Button>
                      )}
                    </Stack>
                  )}
                </ListItem>
              );
            })}
          </List>

          {!reachedEnd && (
            <Box sx={{ display: 'flex', justifyContent: 'center', mt: 2 }}>
              <Button
                onClick={() => void loadMore()}
                disabled={loadingMore}
                variant="outlined"
                size="small"
              >
                {loadingMore ? 'Loading…' : 'Load earlier digests'}
              </Button>
            </Box>
          )}
        </>
      )}
    </>
  );
}
