'use client';

import React, { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import Link from 'next/link';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import {
  Container,
  Typography,
  Box,
  CircularProgress,
  Alert,
  Chip,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Button,
  IconButton,
  Tooltip,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Snackbar,
} from '@mui/material';
import { Cancel, Search, ArrowDownward, ArrowUpward, BookmarkAdd } from '@mui/icons-material';
import { SaveSearchDialogFields } from '@/components/profile/ProfileSavedSearchesSection';
import { supabase } from '@/app/lib/supabaseClient';
import type { KYBill, KYLegislatorRoster } from '@/types/kentucky';
import type { KyBillsBrowseChamberMode } from '@/lib/ky-bills-browse-server';
import { kyBillsBrowseQueryKey } from '@/lib/ky-bills-browse-query';
import { KYBillCard } from '@/components/bills/KYBillCard';
import { CardGrid, CardGridItem } from '@/components/ui/CardGrid';
import { GaChamberFilterBar } from '@/components/civic/GaChamberFilterBar';
import DataFreshnessNote from '@/components/civic/DataFreshnessNote';
import { gaChamberFilterLabel, type GaChamberFilter } from '@/lib/ky-committee-display';
import type { KyBillSortKey } from '@/lib/bill-display';
import {
  defaultDirForKyBillSort,
  isDefaultKyBillSort,
  KY_BILL_SORT_OPTIONS,
  kyBillSortLabel,
  parseKyBillSessionParam,
  parseKyBillSortDirParam,
  parseKyBillSortParam,
} from '@/lib/ky-bills-browse-url';
import { KY_BILL_SESSION_OPTIONS } from '@/lib/ky-sessions';
import { withTimeout } from '@/lib/async-utils';
import { usePersistedPageSize } from '@/lib/use-persisted-page-size';
import { useFollowedBillsAndTopics } from '@/lib/use-followed-bills-topics';
import { KY_TOPICS } from '@/lib/ky-topic-classifier';
import { LANDING_TOPICS } from '@/components/home/landing-data';
import { FOLLOW_COPY } from '@/lib/follow-labels';
import { useUser } from '@/app/lib/UserContext';
import { trackTopicFilterUsed } from '@/lib/analytics';

export type BillsBrowseChamberMode = KyBillsBrowseChamberMode;

export type BillsBrowseInitial = {
  queryKey: string;
  bills: KYBill[];
  total: number;
  capped: boolean;
};

export interface BillsBrowseProps {
  chamberMode: BillsBrowseChamberMode;
  /** Pre-select a topic filter on mount (e.g. from ?topic= URL param). */
  initialTopic?: string;
  legislatorRoster: KYLegislatorRoster[];
  initialBrowse?: BillsBrowseInitial;
}

// The page H1 + subtitle render server-side in BillsBrowsePage: `useSearchParams`
// below bails this whole tree out of the static HTML (up to the Suspense boundary),
// and crawlers must still see the heading.
export function BillsBrowse({
  chamberMode,
  initialTopic,
  legislatorRoster,
  initialBrowse,
}: BillsBrowseProps) {
  const searchParams = useSearchParams();
  const router = useRouter();
  const pathname = usePathname();
  const followsParam = searchParams.get('follows') === 'me';
  const { session } = useUser();
  const { followedBillIds, followedTopics, ready: followsReady, authed } = useFollowedBillsAndTopics();
  const effectiveFollowsMe = authed && followsParam;
  const followsAwaiting = effectiveFollowsMe && !followsReady;

  const browseBaseHref = chamberMode === 'house' ? '/bills/house' : chamberMode === 'senate' ? '/bills/senate' : '/bills';

  const setFollowsMeInUrl = useCallback(
    (next: boolean) => {
      const p = new URLSearchParams(searchParams.toString());
      if (next) p.set('follows', 'me');
      else p.delete('follows');
      const qs = p.toString();
      router.replace(qs ? `${pathname}?${qs}` : pathname);
    },
    [pathname, router, searchParams],
  );

  const setTopicInUrl = useCallback(
    (next: string) => {
      setTopicFilter(next);
      const p = new URLSearchParams(searchParams.toString());
      if (next) {
        p.set('topic', next);
        trackTopicFilterUsed(next, { source: 'bills_browse' });
      } else {
        p.delete('topic');
      }
      const qs = p.toString();
      router.replace(qs ? `${pathname}?${qs}` : pathname, { scroll: false });
    },
    [pathname, router, searchParams],
  );

  const setSessionInUrl = useCallback(
    (next: string) => {
      const p = new URLSearchParams(searchParams.toString());
      if (next) p.set('session', next);
      else p.delete('session');
      const qs = p.toString();
      router.replace(qs ? `${pathname}?${qs}` : pathname, { scroll: false });
    },
    [pathname, router, searchParams],
  );

  useEffect(() => {
    const fromUrl = searchParams.get('topic') ?? '';
    setTopicFilter((prev) => (prev === fromUrl ? prev : fromUrl));
  }, [searchParams]);

  const skipInitialBrowseRef = useRef(Boolean(initialBrowse));
  const [bills, setBills] = useState<KYBill[]>(initialBrowse?.bills ?? []);
  const [browseTotal, setBrowseTotal] = useState(initialBrowse?.total ?? 0);
  const [browseCapped, setBrowseCapped] = useState(initialBrowse?.capped ?? false);
  const [loading, setLoading] = useState(!initialBrowse);
  const [loadingMore, setLoadingMore] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [chamberFilter, setChamberFilter] = useState<GaChamberFilter>(
    chamberMode === 'all' ? '' : chamberMode,
  );
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [topicFilter, setTopicFilter] = useState<string>(initialTopic ?? '');
  const sessionFilter = parseKyBillSessionParam(searchParams.get('session'));
  const legislators = legislatorRoster;
  const sortBy = parseKyBillSortParam(searchParams.get('sort'));
  const sortDir = parseKyBillSortDirParam(searchParams.get('dir'));
  const { pageSize } = usePersistedPageSize('bills', 25);

  const [copyToast, setCopyToast] = useState<string | null>(null);
  const [saveOpen, setSaveOpen] = useState(false);
  const [saveLabel, setSaveLabel] = useState('');
  const [saveBusy, setSaveBusy] = useState(false);

  const followIdsKey = useMemo(() => {
    if (!effectiveFollowsMe || !followsReady) return '';
    return Array.from(followedBillIds).sort().join(',');
  }, [effectiveFollowsMe, followsReady, followedBillIds]);

  const setSortInUrl = useCallback(
    (nextBy: KyBillSortKey, nextDir: 'asc' | 'desc') => {
      const p = new URLSearchParams(searchParams.toString());
      if (isDefaultKyBillSort(nextBy, nextDir)) {
        p.delete('sort');
        p.delete('dir');
      } else {
        p.set('sort', nextBy);
        p.set('dir', nextDir);
      }
      const qs = p.toString();
      router.replace(qs ? `${pathname}?${qs}` : pathname, { scroll: false });
    },
    [pathname, router, searchParams],
  );

  const buildBrowseQuery = useCallback(
    (page: number) => {
      const p = new URLSearchParams();
      p.set('chamberMode', chamberMode);
      p.set('chamberFilter', chamberFilter);
      p.set('status', statusFilter);
      if (topicFilter) p.set('topic', topicFilter);
      if (sessionFilter) p.set('session', sessionFilter);
      p.set('sortBy', sortBy);
      p.set('sortDir', sortDir);
      p.set('page', String(page));
      p.set('pageSize', String(pageSize));
      if (followIdsKey) {
        p.set('followIds', followIdsKey);
      }
      return p;
    },
    [
      chamberMode,
      chamberFilter,
      statusFilter,
      topicFilter,
      sessionFilter,
      sortBy,
      sortDir,
      pageSize,
      followIdsKey,
    ],
  );

  const currentBrowseQueryKey = useMemo(
    () =>
      kyBillsBrowseQueryKey({
        chamberMode,
        chamberFilter,
        statusFilter,
        topicFilter,
        sessionFilter,
        followIds: [],
        sortBy,
        sortDir,
        page: 1,
        pageSize,
      }),
    [chamberMode, chamberFilter, statusFilter, topicFilter, sessionFilter, sortBy, sortDir, pageSize],
  );

  useEffect(() => {
    if (effectiveFollowsMe && !followsReady) return;
    if (
      skipInitialBrowseRef.current &&
      initialBrowse &&
      !followIdsKey &&
      currentBrowseQueryKey === initialBrowse.queryKey
    ) {
      skipInitialBrowseRef.current = false;
      setBills(initialBrowse.bills);
      setBrowseTotal(initialBrowse.total);
      setBrowseCapped(initialBrowse.capped);
      setLoading(false);
      return;
    }
    let cancelled = false;
    const controller = new AbortController();
    async function load() {
      setLoading(true);
      setError(null);
      try {
        const res = await withTimeout(
          fetch(`/api/bills/browse?${buildBrowseQuery(1)}`, { signal: controller.signal }),
          30_000,
          'Loading bills timed out. Check your network.',
        );
        if (!res.ok) {
          const body = await res.json().catch(() => ({}));
          throw new Error(body.error || 'Failed to load bills');
        }
        const json = (await res.json()) as { bills?: KYBill[]; total?: number; capped?: boolean };
        if (cancelled) return;
        setBills(json.bills ?? []);
        setBrowseTotal(json.total ?? 0);
        setBrowseCapped(Boolean(json.capped));
      } catch (err: unknown) {
        if (cancelled) return;
        if (err instanceof Error && err.name === 'AbortError') return;
        setError(err instanceof Error ? err.message : 'Failed to load bills');
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    load();
    return () => {
      cancelled = true;
      controller.abort();
    };
  }, [
    buildBrowseQuery,
    currentBrowseQueryKey,
    effectiveFollowsMe,
    followIdsKey,
    followsReady,
    initialBrowse,
  ]);

  const loadMoreBills = useCallback(async () => {
    if (loadingMore || bills.length >= browseTotal) return;
    setLoadingMore(true);
    try {
      const nextPage = Math.floor(bills.length / pageSize) + 1;
      const res = await fetch(`/api/bills/browse?${buildBrowseQuery(nextPage)}`);
      if (!res.ok) return;
      const json = (await res.json()) as { bills?: KYBill[] };
      setBills((prev) => [...prev, ...(json.bills ?? [])]);
    } finally {
      setLoadingMore(false);
    }
  }, [loadingMore, bills.length, browseTotal, pageSize, buildBrowseQuery]);

  const browsePagerResetKey = `${followsParam}|${chamberFilter}|${statusFilter}|${topicFilter}|${sessionFilter}|${sortBy}|${sortDir}|${pageSize}`;

  const showChamberSelect = chamberMode === 'all';

  const topicMenuItems = useMemo(() => {
    const canonical = [...KY_TOPICS].sort((a, b) => a.localeCompare(b));
    if (topicFilter && !(KY_TOPICS as readonly string[]).includes(topicFilter)) {
      return [...canonical, topicFilter].sort((a, b) => a.localeCompare(b));
    }
    return canonical;
  }, [topicFilter]);

  const nonDefaultSort = !isDefaultKyBillSort(sortBy, sortDir);

  const currentSearchHref = useMemo(() => {
    const qs = searchParams.toString();
    return qs ? `${browseBaseHref}?${qs}` : browseBaseHref;
  }, [browseBaseHref, searchParams]);

  const hasActiveClientFilters = useMemo(
    () =>
      statusFilter !== 'all' ||
      Boolean(topicFilter) ||
      Boolean(sessionFilter) ||
      effectiveFollowsMe ||
      (chamberMode === 'all' && Boolean(chamberFilter)) ||
      nonDefaultSort,
    [statusFilter, topicFilter, sessionFilter, effectiveFollowsMe, chamberMode, chamberFilter, nonDefaultSort],
  );

  const saveSearch = useCallback(async () => {
    if (!session?.access_token || !saveLabel.trim()) return;
    setSaveBusy(true);
    try {
      const res = await fetch('/api/me/saved-searches', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${session.access_token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ label: saveLabel.trim(), href: currentSearchHref }),
      });
      const body = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(typeof body.error === 'string' ? body.error : 'Save failed');
      setSaveOpen(false);
      setSaveLabel('');
      setCopyToast('Search saved to your profile.');
    } catch (e) {
      setCopyToast(e instanceof Error ? e.message : 'Save failed');
    } finally {
      setSaveBusy(false);
    }
  }, [session?.access_token, saveLabel, currentSearchHref]);

  const billsFoundSummary = useMemo(() => {
    const loaded = bills.length;
    const total = browseTotal;
    const billsWord = total === 1 ? 'bill' : 'bills';
    if (!hasActiveClientFilters) {
      if (browseCapped && total > loaded) {
        return `${total.toLocaleString()} ${billsWord} · Showing ${loaded.toLocaleString()} with the most recent activity`;
      }
      return `${total.toLocaleString()} ${billsWord}`;
    }
    const verb = total === 1 ? 'matches' : 'match';
    let s = `${total.toLocaleString()} ${billsWord} ${verb} your filters`;
    if (browseCapped) {
      s += ' · Based on the most recently updated bills in this view; more may match';
    }
    if (loaded < total) {
      s += ` · Showing ${loaded.toLocaleString()} of ${total.toLocaleString()}`;
    }
    return s;
  }, [hasActiveClientFilters, browseTotal, bills.length, browseCapped]);

  return (
    <Box sx={{ minHeight: '100vh', bgcolor: 'background.default' }}>
      <Container maxWidth="lg" sx={{ pt: 0, pb: 4 }}>
        <Box
          sx={{
            display: 'flex',
            flexWrap: 'wrap',
            gap: 1,
            justifyContent: 'center',
            mb: 3,
            // WCAG 2.5.5: clickable chips need 44×44 on touch. Desktop keeps the
            // dense size="small" footprint.
            '& .MuiChip-clickable': {
              height: { xs: 44, sm: 'auto' },
            },
          }}
          role="group"
          aria-label="Browse by topic"
        >
          {LANDING_TOPICS.map(({ label, topic }) => (
            <Chip
              key={topic}
              label={label}
              size="small"
              clickable
              color={topicFilter === topic ? 'primary' : 'default'}
              variant={topicFilter === topic ? 'filled' : 'outlined'}
              onClick={() => setTopicInUrl(topicFilter === topic ? '' : topic)}
              sx={{ fontWeight: 500, borderRadius: '16px' }}
            />
          ))}
          {topicFilter && !LANDING_TOPICS.some((t) => t.topic === topicFilter) && (
            <Chip
              label={topicFilter}
              size="small"
              clickable
              color="primary"
              variant="filled"
              onClick={() => setTopicInUrl('')}
              sx={{ fontWeight: 500, borderRadius: '16px' }}
            />
          )}
          {topicFilter ? (
            <Chip label="All topics" size="small" clickable variant="outlined" onClick={() => setTopicInUrl('')} sx={{ fontWeight: 500, borderRadius: '16px' }} />
          ) : (
            <Chip label="more →" size="small" clickable variant="outlined" component={Link} href={browseBaseHref} sx={{ fontWeight: 500, borderRadius: '16px' }} />
          )}
        </Box>

        {!supabase && (
          <Alert severity="warning" sx={{ mb: 2 }}>
            Set <strong>NEXT_PUBLIC_SUPABASE_URL</strong> and <strong>NEXT_PUBLIC_SUPABASE_ANON_KEY</strong> in{' '}
            <code>.env.local</code> and restart the dev server to load bills.
          </Alert>
        )}

        {/* Filter bar */}
        <Box
          component="div"
          role="region"
          aria-label="Bill browse filters"
          sx={{
            display: 'flex',
            flexDirection: { xs: 'column', sm: 'row' },
            alignItems: { xs: 'flex-start', sm: 'center' },
            justifyContent: 'space-between',
            gap: 2,
            mb: 2,
            flexWrap: 'wrap',
          }}
        >
          {/* Left: Chamber pills */}
          {showChamberSelect && (
            <GaChamberFilterBar value={chamberFilter} onChange={setChamberFilter} />
          )}

          {/* Right: Topic + Status dropdowns */}
          <Box sx={{ display: 'flex', gap: 1.5, flexWrap: 'wrap', ml: { sm: 'auto' } }}>
            <FormControl size="small" sx={{ minWidth: 150 }}>
              <InputLabel id="browse-topic-label">Topic</InputLabel>
              <Select
                labelId="browse-topic-label"
                label="Topic"
                value={topicFilter}
                onChange={(e) => setTopicInUrl(e.target.value)}
              >
                <MenuItem value="">All topics</MenuItem>
                {topicMenuItems.map((t) => (
                  <MenuItem key={t} value={t}>{t}</MenuItem>
                ))}
              </Select>
            </FormControl>
            <FormControl size="small" sx={{ minWidth: 145 }}>
              <InputLabel id="browse-status-label">Status</InputLabel>
              <Select
                labelId="browse-status-label"
                label="Status"
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
              >
                <MenuItem value="all">All statuses</MenuItem>
                <MenuItem value="introduced">Introduced</MenuItem>
                <MenuItem value="in_committee">In committee</MenuItem>
                <MenuItem value="passed_one_chamber">Passed one chamber</MenuItem>
                <MenuItem value="passed">Passed</MenuItem>
                <MenuItem value="signed">Signed</MenuItem>
                <MenuItem value="vetoed">Vetoed</MenuItem>
              </Select>
            </FormControl>
            <FormControl size="small" sx={{ minWidth: 175 }}>
              <InputLabel id="browse-session-label">Session</InputLabel>
              <Select
                labelId="browse-session-label"
                label="Session"
                value={sessionFilter}
                onChange={(e) => setSessionInUrl(e.target.value)}
                MenuProps={{ PaperProps: { sx: { maxHeight: 420 } } }}
              >
                <MenuItem value="">All sessions</MenuItem>
                {KY_BILL_SESSION_OPTIONS.map((s) => (
                  <MenuItem key={s} value={s}>{s}</MenuItem>
                ))}
              </Select>
            </FormControl>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.25 }}>
              <FormControl size="small" sx={{ minWidth: 150 }}>
                <InputLabel id="browse-sort-label">Sort by</InputLabel>
                <Select
                  labelId="browse-sort-label"
                  label="Sort by"
                  value={sortBy}
                  onChange={(e) => {
                    const key = e.target.value as KyBillSortKey;
                    setSortInUrl(key, defaultDirForKyBillSort(key));
                  }}
                >
                  {KY_BILL_SORT_OPTIONS.map((opt) => (
                    <MenuItem key={opt.value} value={opt.value}>
                      {opt.label}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
              <Tooltip title={sortDir === 'desc' ? 'Descending — switch to ascending' : 'Ascending — switch to descending'}>
                <IconButton
                  size="small"
                  aria-label={sortDir === 'desc' ? 'Sort descending' : 'Sort ascending'}
                  onClick={() => setSortInUrl(sortBy, sortDir === 'desc' ? 'asc' : 'desc')}
                  sx={{ border: '1px solid', borderColor: 'divider', borderRadius: 1 }}
                >
                  {sortDir === 'desc' ? <ArrowDownward fontSize="small" /> : <ArrowUpward fontSize="small" />}
                </IconButton>
              </Tooltip>
            </Box>
          </Box>
        </Box>

        {/* Active filter chips */}
        {hasActiveClientFilters && (
          <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.75, mb: 2, alignItems: 'center' }}>
            <Typography variant="caption" sx={{ fontWeight: 700, mr: 0.5, color: 'text.primary' }}>
              Active filters:
            </Typography>
            {effectiveFollowsMe && (
              <Chip
                label={FOLLOW_COPY.followingFilter}
                size="small"
                onDelete={() => setFollowsMeInUrl(false)}
                deleteIcon={<Cancel />}
                color="primary"
                variant="outlined"
              />
            )}
            {showChamberSelect && chamberFilter && (
              <Chip
                label={gaChamberFilterLabel(chamberFilter)}
                size="small"
                onDelete={() => setChamberFilter('')}
                deleteIcon={<Cancel />}
                color="primary"
                variant="outlined"
              />
            )}
            {statusFilter !== 'all' && (
              <Chip
                label={{ introduced: 'Introduced', in_committee: 'In committee', passed_one_chamber: 'Passed one chamber', passed: 'Passed', signed: 'Signed', vetoed: 'Vetoed' }[statusFilter] ?? statusFilter}
                size="small"
                onDelete={() => setStatusFilter('all')}
                deleteIcon={<Cancel />}
                color="primary"
                variant="outlined"
              />
            )}
            {topicFilter && (
              <Chip
                label={topicFilter}
                size="small"
                onDelete={() => setTopicInUrl('')}
                deleteIcon={<Cancel />}
                color="secondary"
                variant="outlined"
              />
            )}
            {sessionFilter && (
              <Chip
                label={sessionFilter}
                size="small"
                onDelete={() => setSessionInUrl('')}
                deleteIcon={<Cancel />}
                color="primary"
                variant="outlined"
              />
            )}
            {nonDefaultSort && (
              <Chip
                label={kyBillSortLabel(sortBy, sortDir)}
                size="small"
                onDelete={() => setSortInUrl('last_action_date', 'desc')}
                deleteIcon={<Cancel />}
                color="primary"
                variant="outlined"
              />
            )}
            {authed && (
              <Button
                size="small"
                variant="outlined"
                startIcon={<BookmarkAdd fontSize="small" />}
                onClick={() => {
                  setSaveLabel(
                    topicFilter ||
                      (statusFilter !== 'all' ? statusFilter.replace(/_/g, ' ') : '') ||
                      'My bill search',
                  );
                  setSaveOpen(true);
                }}
                sx={{ textTransform: 'none' }}
              >
                Save search
              </Button>
            )}
            <Chip
              label="Clear all"
              size="small"
              onClick={() => {
                setChamberFilter('');
                setStatusFilter('all');
                setTopicInUrl('');
                const p = new URLSearchParams(searchParams.toString());
                p.delete('follows');
                p.delete('sort');
                p.delete('dir');
                p.delete('session');
                p.delete('topic');
                const qs = p.toString();
                router.replace(qs ? `${pathname}?${qs}` : pathname);
              }}
              variant="outlined"
              sx={{ ml: 0.5 }}
            />
          </Box>
        )}

        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 2 }}>
          <Typography variant="body2" fontWeight={600} component="p" sx={{ m: 0 }}>
            {billsFoundSummary}
          </Typography>
          {loading && <CircularProgress size={18} />}
        </Box>

        {error && (
          <Alert severity="error" sx={{ mb: 2 }}>
            {error}
          </Alert>
        )}

        {followsParam && !authed && (
          <Alert severity="info" sx={{ mb: 2 }}>
            {FOLLOW_COPY.signInForFollowingFilter}{' '}
            <Button component={Link} href={`/auth/login?next=${encodeURIComponent(pathname + (searchParams.toString() ? `?${searchParams}` : ''))}`} size="small" sx={{ ml: 1 }}>
              Log in
            </Button>
          </Alert>
        )}

        {followsAwaiting && (
          <Box sx={{ display: 'flex', justifyContent: 'center', py: 6 }} aria-busy="true" aria-label="Loading followed bills">
            <CircularProgress />
          </Box>
        )}

        {!loading && !followsAwaiting && bills.length === 0 ? (
          <Box sx={{ p: 6, textAlign: 'center', borderRadius: 2, border: '1px solid', borderColor: 'divider', bgcolor: 'background.paper' }}>
            <Search sx={{ fontSize: 48, color: 'text.disabled', mb: 2 }} />
            <Typography variant="h6" color="text.secondary" gutterBottom>
              {effectiveFollowsMe ? 'No followed bills in this view' : 'No bills found'}
            </Typography>
            <Typography variant="body2" color="text.secondary" sx={{ mb: effectiveFollowsMe ? 2 : 0 }}>
              {!supabase
                ? 'Supabase is not configured. Bills will appear once connected.'
                : effectiveFollowsMe
                  ? "You haven't followed any bills yet. Browse current bills and select Follow on a bill to start following."
                  : 'Try adjusting your filters.'}
            </Typography>
            {effectiveFollowsMe && (
              <Button component={Link} href={browseBaseHref} variant="contained">
                Browse all bills
              </Button>
            )}
          </Box>
        ) : !followsAwaiting ? (
          <Box key={browsePagerResetKey}>
            <CardGrid>
              {bills.map((bill) => (
                <CardGridItem key={bill.id}>
                  <KYBillCard
                    bill={bill}
                    legislators={legislators}
                    followedBillIds={authed ? followedBillIds : null}
                    followedTopics={authed ? followedTopics : null}
                  />
                </CardGridItem>
              ))}
            </CardGrid>
            <Box sx={{ mt: 3, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 1 }}>
              <Typography variant="caption" color="text.secondary">
                Showing {bills.length.toLocaleString()} of {browseTotal.toLocaleString()}
              </Typography>
              {bills.length < browseTotal && (
                <Button variant="outlined" onClick={loadMoreBills} disabled={loadingMore}>
                  {loadingMore ? 'Loading…' : 'Load more'}
                </Button>
              )}
            </Box>
          </Box>
        ) : null}

        <DataFreshnessNote variant="page" source="bills" />

        <Snackbar
          open={Boolean(copyToast)}
          autoHideDuration={5000}
          onClose={() => setCopyToast(null)}
          message={copyToast}
          anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
        />

        <Dialog open={saveOpen} onClose={() => !saveBusy && setSaveOpen(false)} maxWidth="xs" fullWidth>
          <DialogTitle>Save this search</DialogTitle>
          <DialogContent>
            <SaveSearchDialogFields label={saveLabel} onLabelChange={setSaveLabel} />
            <Typography variant="caption" color="text.secondary" display="block" sx={{ mt: 1.5 }}>
              {currentSearchHref}
            </Typography>
          </DialogContent>
          <DialogActions>
            <Button onClick={() => setSaveOpen(false)} disabled={saveBusy}>
              Cancel
            </Button>
            <Button variant="contained" disabled={saveBusy || !saveLabel.trim()} onClick={() => void saveSearch()}>
              {saveBusy ? 'Saving…' : 'Save'}
            </Button>
          </DialogActions>
        </Dialog>
      </Container>
    </Box>
  );
}
