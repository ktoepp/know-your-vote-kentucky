'use client';

import React, { useState, useEffect, useMemo, useCallback } from 'react';
import Link from 'next/link';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import {
  Container,
  Typography,
  Box,
  CircularProgress,
  Alert,
  Grid,
  ToggleButtonGroup,
  ToggleButton,
  Chip,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Button,
} from '@mui/material';
import { Cancel, Search, Gavel } from '@mui/icons-material';
import { supabase } from '@/app/lib/supabaseClient';
import type { KYBill, KYLegislatorRoster } from '@/types/kentucky';
import { KYBillCard } from '@/components/bills/KYBillCard';
import DataFreshnessNote from '@/components/civic/DataFreshnessNote';
import {
  billMatchesBrowseStatusFilter,
  compareKyBills,
  effectiveBillChamber,
  type KyBillSortKey,
} from '@/lib/bill-display';
import { withTimeout } from '@/lib/async-utils';
import { PaginatedSection } from '@/components/ui/PaginatedSection';
import { usePersistedPageSize } from '@/lib/use-persisted-page-size';
import { useFollowedBillsAndTopics } from '@/lib/use-followed-bills-topics';
import { KY_TOPICS } from '@/lib/ky-topic-classifier';

/**
 * One query loads up to this many rows; client filters/sorts, then `PaginatedSection` paginates 25/50/100.
 * Dense sessions can exceed this cap; when no client filters run, the banner uses an exact chamber-scoped count query.
 */
const BROWSE_QUERY_ROW_LIMIT = 1000;


export type BillsBrowseChamberMode = 'all' | 'house' | 'senate';

const KY_BILLS_COUNT_SELECT = 'id';

/** Chamber-scoped row query for browse + refresh (house/senate include prefix fallback when `chamber` is null). Status is never filtered in SQL; use `billMatchesBrowseStatusFilter` in the client. */
function applyKyBillsRowQuery(
  chamberMode: BillsBrowseChamberMode,
  chamberFilter: 'all' | 'house' | 'senate',
) {
  if (!supabase) return null;
  let query = supabase.from('ky_bills').select('*').order('session', { ascending: false }).order('last_action_date', { ascending: false });
  const effectiveChamber = chamberMode === 'all' ? chamberFilter : chamberMode;
  if (effectiveChamber === 'house') {
    query = query.or('chamber.eq.house,bill_number.ilike.H%');
  } else if (effectiveChamber === 'senate') {
    query = query.or('chamber.eq.senate,bill_number.ilike.S%');
  }
  return query.limit(BROWSE_QUERY_ROW_LIMIT);
}

/** Exact chamber-scoped bill count (matches {@link applyKyBillsRowQuery} predicates, no limit). */
function applyKyBillsCountQuery(
  chamberMode: BillsBrowseChamberMode,
  chamberFilter: 'all' | 'house' | 'senate',
) {
  if (!supabase) return null;
  let query = supabase.from('ky_bills').select(KY_BILLS_COUNT_SELECT, { count: 'exact', head: true });
  const effectiveChamber = chamberMode === 'all' ? chamberFilter : chamberMode;
  if (effectiveChamber === 'house') {
    query = query.or('chamber.eq.house,bill_number.ilike.H%');
  } else if (effectiveChamber === 'senate') {
    query = query.or('chamber.eq.senate,bill_number.ilike.S%');
  }
  return query;
}

export interface BillsBrowseProps {
  title: string;
  subtitle: string;
  chamberMode: BillsBrowseChamberMode;
  /** Pre-select a topic filter on mount (e.g. from ?topic= URL param). */
  initialTopic?: string;
}

export function BillsBrowse({ title, subtitle, chamberMode, initialTopic }: BillsBrowseProps) {
  const searchParams = useSearchParams();
  const router = useRouter();
  const pathname = usePathname();
  const followsParam = searchParams.get('follows') === 'me';
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

  const [bills, setBills] = useState<KYBill[]>([]);
  /** Exact rows matching chamber scope in DB (ignores client-only filters). */
  const [chamberBillTotal, setChamberBillTotal] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [chamberFilter, setChamberFilter] = useState<'all' | 'house' | 'senate'>(
    chamberMode === 'all' ? 'all' : chamberMode,
  );
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [topicFilter, setTopicFilter] = useState<string>(initialTopic ?? '');
  const [legislators, setLegislators] = useState<KYLegislatorRoster[]>([]);
  const [sortBy, setSortBy] = useState<KyBillSortKey>('last_action_date');
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('desc');
  const { pageSize, setPageSize } = usePersistedPageSize('bills', 25);

  useEffect(() => {
    if (!supabase) return;
    let cancelled = false;
    supabase
      .from('ky_legislators')
      .select('id,legiscan_id,name,first_name,last_name,party,chamber,district,photo_url,ballotpedia,legiscan_image_url')
      .eq('active', true)
      .then(({ data }) => {
        if (!cancelled) setLegislators(data || []);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    let cancelled = false;
    async function load() {
      setLoading(true);
      setError(null);
      try {
        const rowQuery = applyKyBillsRowQuery(chamberMode, chamberFilter);
        const countQuery = applyKyBillsCountQuery(chamberMode, chamberFilter);
        if (!rowQuery) {
          if (!cancelled) setLoading(false);
          return;
        }
        const [rowRes, countRes] = await Promise.all([
          withTimeout(rowQuery, 30_000, 'Loading bills timed out. Check Supabase or your network.'),
          countQuery
            ? withTimeout(countQuery, 30_000, 'Loading bill count timed out. Check Supabase or your network.')
            : Promise.resolve({ count: null as number | null, error: null }),
        ]);
        if (rowRes.error) throw rowRes.error;
        if (countRes.error) {
          console.warn('ky_bills count:', countRes.error);
          if (!cancelled) setChamberBillTotal(null);
        } else if (!cancelled) {
          setChamberBillTotal(countRes.count ?? null);
        }
        if (!cancelled) setBills(rowRes.data || []);
      } catch (err: any) {
        if (!cancelled) setError(err.message || 'Failed to load bills');
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    load();
    return () => {
      cancelled = true;
    };
  }, [chamberMode, chamberFilter]);

  const filteredBills = bills.filter((bill) => {
    if (chamberMode === 'all' && chamberFilter !== 'all') {
      if (effectiveBillChamber(bill) !== chamberFilter) return false;
    }
    if (!billMatchesBrowseStatusFilter(bill, statusFilter)) {
      return false;
    }
    if (topicFilter && !bill.topics?.includes(topicFilter)) {
      return false;
    }
    if (effectiveFollowsMe) {
      if (!followsReady) return false;
      if (!followedBillIds.has(bill.id)) return false;
    }
    return true;
  });

  const sortedBills = useMemo(() => {
    const next = [...filteredBills];
    next.sort((a, b) => {
      const c = compareKyBills(a, b, sortBy);
      return sortDir === 'asc' ? c : -c;
    });
    return next;
  }, [filteredBills, sortBy, sortDir]);

  const browsePagerResetKey = `${followsParam}|${chamberFilter}|${statusFilter}|${topicFilter}|${sortBy}|${sortDir}|${pageSize}|${sortedBills.length}|${sortedBills[0]?.id ?? ''}`;

  const showChamberSelect = chamberMode === 'all';

  const topicMenuItems = useMemo(() => {
    const canonical = [...KY_TOPICS].sort((a, b) => a.localeCompare(b));
    if (topicFilter && !(KY_TOPICS as readonly string[]).includes(topicFilter)) {
      return [...canonical, topicFilter].sort((a, b) => a.localeCompare(b));
    }
    return canonical;
  }, [topicFilter]);

  const hasActiveClientFilters = useMemo(
    () =>
      statusFilter !== 'all' ||
      Boolean(topicFilter) ||
      effectiveFollowsMe ||
      (chamberMode === 'all' && chamberFilter !== 'all'),
    [statusFilter, topicFilter, effectiveFollowsMe, chamberMode, chamberFilter],
  );

  const hitFetchCap = bills.length >= BROWSE_QUERY_ROW_LIMIT;

  const billsFoundSummary = useMemo(() => {
    const n = sortedBills.length;
    const billsWord = n === 1 ? 'bill' : 'bills';
    if (!hasActiveClientFilters && chamberBillTotal != null) {
      const total = chamberBillTotal;
      const totalWord = total === 1 ? 'bill' : 'bills';
      if (total > bills.length && hitFetchCap) {
        return `${total.toLocaleString()} ${totalWord} · Showing ${bills.length.toLocaleString()} with the most recent activity`;
      }
      return `${total.toLocaleString()} ${totalWord}`;
    }
    if (!hasActiveClientFilters && chamberBillTotal == null) {
      let s = `${n.toLocaleString()} ${billsWord} loaded`;
      if (hitFetchCap) {
        s += ` · Only the ${BROWSE_QUERY_ROW_LIMIT.toLocaleString()} most recently updated bills are loaded; full total unavailable`;
      }
      return s;
    }
    const verb = n === 1 ? 'matches' : 'match';
    let s = `${n.toLocaleString()} ${billsWord} ${verb} your filters`;
    if (hitFetchCap) {
      s += ` · Based on the ${BROWSE_QUERY_ROW_LIMIT.toLocaleString()} most recently updated bills in this view; more may match`;
    }
    return s;
  }, [
    hasActiveClientFilters,
    chamberBillTotal,
    sortedBills.length,
    bills.length,
    hitFetchCap,
  ]);

  return (
    <Box sx={{ minHeight: '100vh', bgcolor: 'background.default' }}>
      <Container maxWidth="lg" sx={{ py: 4 }}>
        {/* Heading */}
        <Box sx={{ textAlign: 'center', mb: 4 }}>
          <Typography variant="h4" component="h1" fontWeight={700} gutterBottom>
            {title}
          </Typography>
          <Typography variant="body1" color="text.secondary">
            {subtitle}
          </Typography>
          <DataFreshnessNote variant="page" source="bills" />
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
            <ToggleButtonGroup
              value={chamberFilter}
              exclusive
              size="small"
              onChange={(_, v) => { if (v !== null) setChamberFilter(v); }}
              aria-label="Filter by chamber"
            >
              <ToggleButton value="house">House</ToggleButton>
              <ToggleButton value="senate">Senate</ToggleButton>
              <ToggleButton value="all">All</ToggleButton>
            </ToggleButtonGroup>
          )}

          {/* Right: Topic + Status dropdowns */}
          <Box sx={{ display: 'flex', gap: 1.5, flexWrap: 'wrap', ml: { sm: 'auto' } }}>
            <FormControl size="small" sx={{ minWidth: 150 }}>
              <InputLabel id="browse-topic-label">Topic</InputLabel>
              <Select
                labelId="browse-topic-label"
                label="Topic"
                value={topicFilter}
                onChange={(e) => setTopicFilter(e.target.value)}
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
          </Box>
        </Box>

        {/* Active filter chips */}
        {(chamberFilter !== 'all' || statusFilter !== 'all' || topicFilter || effectiveFollowsMe) && (
          <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.75, mb: 2, alignItems: 'center' }}>
            <Typography variant="caption" sx={{ fontWeight: 700, mr: 0.5, color: 'text.primary' }}>
              Active filters:
            </Typography>
            {effectiveFollowsMe && (
              <Chip
                label="Following"
                size="small"
                onDelete={() => setFollowsMeInUrl(false)}
                deleteIcon={<Cancel />}
                color="primary"
                variant="outlined"
              />
            )}
            {showChamberSelect && chamberFilter !== 'all' && (
              <Chip
                label={chamberFilter === 'house' ? 'House' : 'Senate'}
                size="small"
                onDelete={() => setChamberFilter('all')}
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
                onDelete={() => setTopicFilter('')}
                deleteIcon={<Cancel />}
                color="secondary"
                variant="outlined"
              />
            )}
            <Chip
              label="Clear all"
              size="small"
              onClick={() => {
                setChamberFilter('all');
                setStatusFilter('all');
                setTopicFilter('');
                const p = new URLSearchParams(searchParams.toString());
                p.delete('follows');
                const qs = p.toString();
                router.replace(qs ? `${pathname}?${qs}` : pathname);
              }}
              variant="outlined"
              sx={{ ml: 0.5 }}
            />
          </Box>
        )}

        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 2 }}>
          <Gavel sx={{ fontSize: '1.2rem', color: 'primary.main' }} />
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
            Sign in to use the <strong>Following</strong> filter.{' '}
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

        {!loading && !followsAwaiting && sortedBills.length === 0 ? (
          <Box sx={{ p: 6, textAlign: 'center', borderRadius: 2, border: '1px solid', borderColor: 'divider', bgcolor: 'background.paper' }}>
            <Search sx={{ fontSize: 48, color: 'text.disabled', mb: 2 }} />
            <Typography variant="h6" color="text.secondary" gutterBottom>
              {effectiveFollowsMe ? 'No followed bills in this view' : 'No bills found'}
            </Typography>
            <Typography variant="body2" color="text.secondary" sx={{ mb: effectiveFollowsMe ? 2 : 0 }}>
              {!supabase
                ? 'Supabase is not configured. Bills will appear once connected.'
                : effectiveFollowsMe
                  ? "You haven't followed any bills yet. Browse current bills and tap Follow on a bill to start tracking."
                  : 'Try adjusting your filters.'}
            </Typography>
            {effectiveFollowsMe && (
              <Button component={Link} href={browseBaseHref} variant="contained">
                Browse all bills
              </Button>
            )}
          </Box>
        ) : !followsAwaiting ? (
          <PaginatedSection
            items={sortedBills}
            pageSize={pageSize}
            resetKey={browsePagerResetKey}
            variant="loadmore"
          >
            {(pageBills) => (
              <Grid container spacing={3}>
                {pageBills.map((bill) => (
                  <Grid item xs={12} sm={6} md={4} key={bill.id}>
                    <KYBillCard
                      bill={bill}
                      legislators={legislators}
                      followedBillIds={authed ? followedBillIds : null}
                      followedTopics={authed ? followedTopics : null}
                    />
                  </Grid>
                ))}
              </Grid>
            )}
          </PaginatedSection>
        ) : null}
      </Container>
    </Box>
  );
}
