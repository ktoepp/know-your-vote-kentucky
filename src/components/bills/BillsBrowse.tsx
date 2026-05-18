'use client';

import React, { useState, useEffect, useMemo, useCallback } from 'react';
import Link from 'next/link';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import {
  Container,
  Typography,
  Box,
  TextField,
  InputAdornment,
  CircularProgress,
  Alert,
  Paper,
  Grid,
  IconButton,
  ToggleButtonGroup,
  ToggleButton,
  Tooltip,
  Chip,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Button,
} from '@mui/material';
import { Cancel, Search, Refresh, Gavel } from '@mui/icons-material';
import { LayoutGrid, List } from 'lucide-react';
import { supabase } from '@/app/lib/supabaseClient';
import type { KYBill, KYLegislatorRoster } from '@/types/kentucky';
import { KYBillCard } from '@/components/bills/KYBillCard';
import { BillsListTable } from '@/components/bills/BillsListTable';
import DataFreshnessNote from '@/components/civic/DataFreshnessNote';
import {
  billMatchesBrowseStatusFilter,
  compareKyBills,
  effectiveBillChamber,
  kyBillNumericPartEquals,
  normalizeKyBillDesignation,
  type KyBillSortKey,
} from '@/lib/bill-display';
import { billMatchesCommitteeFilter } from '@/lib/ky-committee-utils';
import { withTimeout } from '@/lib/async-utils';
import { PaginatedSection } from '@/components/ui/PaginatedSection';
import { PAGE_SIZE_CHOICES, toPageSizeChoice, usePersistedPageSize } from '@/lib/use-persisted-page-size';
import { useKyBillCommittees } from '@/lib/use-ky-bill-committees';
import { useFollowedBillsAndTopics } from '@/lib/use-followed-bills-topics';
import { KY_TOPICS } from '@/lib/ky-topic-classifier';

/**
 * One query loads up to this many rows; client filters/sorts, then `PaginatedSection` paginates 25/50/100.
 * Dense sessions can exceed this cap; when no client filters run, the banner uses an exact chamber-scoped count query.
 */
const BROWSE_QUERY_ROW_LIMIT = 1000;

function defaultSortDirForKey(key: KyBillSortKey): 'asc' | 'desc' {
  return key === 'last_action_date' || key === 'introduced_date' ? 'desc' : 'asc';
}

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
  const [searchQuery, setSearchQuery] = useState('');
  const [chamberFilter, setChamberFilter] = useState<'all' | 'house' | 'senate'>(
    chamberMode === 'all' ? 'all' : chamberMode,
  );
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [topicFilter, setTopicFilter] = useState<string>(initialTopic ?? '');
  const [committeeFilter, setCommitteeFilter] = useState('');
  const [legislators, setLegislators] = useState<KYLegislatorRoster[]>([]);
  const { committees: committeeOptions } = useKyBillCommittees();
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('list');
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
    if (!billMatchesCommitteeFilter(bill, committeeFilter)) {
      return false;
    }
    if (topicFilter && !bill.topics?.includes(topicFilter)) {
      return false;
    }
    if (effectiveFollowsMe) {
      if (!followsReady) return false;
      if (!followedBillIds.has(bill.id)) return false;
    }
    if (!searchQuery) return true;
    const rawSq = searchQuery.trim();
    const q = rawSq.toLowerCase();
    const normQ = normalizeKyBillDesignation(rawSq);
    const digitsOnly = normQ.length > 0 && /^\d+$/.test(normQ);
    const billNumMatch = digitsOnly
      ? kyBillNumericPartEquals(bill.bill_number, normQ)
      : normQ.length >= 2 &&
        normalizeKyBillDesignation(bill.bill_number || '').includes(normQ);
    return (
      billNumMatch ||
      bill.title?.toLowerCase().includes(q) ||
      bill.description?.toLowerCase().includes(q) ||
      bill.ai_summary?.toLowerCase().includes(q) ||
      bill.session?.toLowerCase().includes(q) ||
      bill.last_action?.toLowerCase().includes(q) ||
      bill.status?.toLowerCase().includes(q) ||
      (bill.committee_name || '').toLowerCase().includes(q)
    );
  });

  const sortedBills = useMemo(() => {
    const next = [...filteredBills];
    next.sort((a, b) => {
      const c = compareKyBills(a, b, sortBy);
      return sortDir === 'asc' ? c : -c;
    });
    return next;
  }, [filteredBills, sortBy, sortDir]);

  const handleRequestSort = useCallback(
    (key: KyBillSortKey) => {
      if (sortBy === key) {
        setSortDir((d) => (d === 'asc' ? 'desc' : 'asc'));
      } else {
        setSortBy(key);
        setSortDir(defaultSortDirForKey(key));
      }
    },
    [sortBy],
  );

  const browsePagerResetKey = `${followsParam}|${searchQuery}|${chamberFilter}|${statusFilter}|${committeeFilter}|${topicFilter}|${viewMode}|${sortBy}|${sortDir}|${pageSize}|${sortedBills.length}|${sortedBills[0]?.id ?? ''}`;

  const showChamberSelect = chamberMode === 'all';

  const committeeFilterLabel = useMemo(() => {
    if (!committeeFilter) return '';
    return committeeOptions.find((c) => c.slug === committeeFilter)?.label ?? committeeFilter.replace(/-/g, ' ');
  }, [committeeFilter, committeeOptions]);

  const topicMenuItems = useMemo(() => {
    const canonical = [...KY_TOPICS].sort((a, b) => a.localeCompare(b));
    if (topicFilter && !(KY_TOPICS as readonly string[]).includes(topicFilter)) {
      return [...canonical, topicFilter].sort((a, b) => a.localeCompare(b));
    }
    return canonical;
  }, [topicFilter]);

  const hasActiveClientFilters = useMemo(
    () =>
      Boolean(searchQuery.trim()) ||
      statusFilter !== 'all' ||
      Boolean(committeeFilter) ||
      Boolean(topicFilter) ||
      effectiveFollowsMe ||
      (chamberMode === 'all' && chamberFilter !== 'all'),
    [searchQuery, statusFilter, committeeFilter, topicFilter, effectiveFollowsMe, chamberMode, chamberFilter],
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
        <Typography variant="h4" component="h1" fontWeight={700} gutterBottom>
          {title}
        </Typography>
        <Typography variant="body1" color="text.secondary" sx={{ mb: 1 }}>
          {subtitle}
        </Typography>
        <DataFreshnessNote variant="page" source="bills" />

        {!supabase && (
          <Alert severity="warning" sx={{ mb: 2 }}>
            Set <strong>NEXT_PUBLIC_SUPABASE_URL</strong> and <strong>NEXT_PUBLIC_SUPABASE_ANON_KEY</strong> in{' '}
            <code>.env.local</code> and restart the dev server to load bills.
          </Alert>
        )}

        <Paper elevation={1} sx={{ p: 2, mb: 1.5, borderRadius: 2 }}>
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, minWidth: 0 }}>
            <TextField
              fullWidth
              placeholder="Search by bill number, title, session, status, or summary..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              InputProps={{
                startAdornment: (
                  <InputAdornment position="start">
                    <Search sx={{ color: 'primary.main', opacity: 0.92 }} aria-hidden />
                  </InputAdornment>
                ),
              }}
              size="small"
              sx={{ minWidth: 0 }}
            />
            <Box
              component="div"
              role="region"
              aria-label="Bill browse filters"
              sx={{
                display: 'flex',
                flexDirection: 'row',
                flexWrap: 'nowrap',
                gap: 2,
                alignItems: 'flex-start',
                minWidth: 0,
                overflowX: 'auto',
                overflowY: 'hidden',
                pb: 1,
                mx: -0.5,
                px: 0.5,
                WebkitOverflowScrolling: 'touch',
              }}
            >
              {showChamberSelect && (
                <Box sx={{ flexShrink: 0 }}>
                  <Typography variant="caption" sx={{ display: 'block', mb: 0.5, fontWeight: 700, textTransform: 'uppercase', letterSpacing: 0.5, color: 'text.primary' }}>
                    Chamber
                  </Typography>
                  <ToggleButtonGroup
                    value={chamberFilter}
                    exclusive
                    size="small"
                    onChange={(_, v) => { if (v !== null) setChamberFilter(v); }}
                    aria-label="Filter by chamber"
                    sx={{ flexShrink: 0 }}
                  >
                    <ToggleButton value="all">All</ToggleButton>
                    <ToggleButton value="house">House</ToggleButton>
                    <ToggleButton value="senate">Senate</ToggleButton>
                  </ToggleButtonGroup>
                </Box>
              )}
              <Box sx={{ flexShrink: 0 }}>
                <Typography variant="caption" sx={{ display: 'block', mb: 0.5, fontWeight: 700, textTransform: 'uppercase', letterSpacing: 0.5, color: 'text.primary' }}>
                  Your bills
                </Typography>
                <Tooltip title={!authed ? 'Sign in to show only bills you follow' : ''} disableHoverListener={authed}>
                  <span>
                    <ToggleButtonGroup
                      value={followsParam ? 'following' : 'all'}
                      exclusive
                      size="small"
                      onChange={(_, v) => {
                        if (v === null) return;
                        setFollowsMeInUrl(v === 'following');
                      }}
                      aria-label="Filter to followed bills"
                      sx={{ flexShrink: 0 }}
                    >
                      <ToggleButton value="all">All bills</ToggleButton>
                      <ToggleButton value="following" disabled={!authed}>
                        Following
                      </ToggleButton>
                    </ToggleButtonGroup>
                  </span>
                </Tooltip>
              </Box>
              <Box sx={{ flexShrink: 0 }}>
                <Typography variant="caption" sx={{ display: 'block', mb: 0.5, fontWeight: 700, textTransform: 'uppercase', letterSpacing: 0.5, color: 'text.primary' }}>
                  Status
                </Typography>
                <ToggleButtonGroup
                  value={statusFilter}
                  exclusive
                  size="small"
                  onChange={(_, v) => { if (v !== null) setStatusFilter(v); }}
                  aria-label="Filter by status"
                  sx={{ flexShrink: 0, flexWrap: 'nowrap' }}
                >
                  <ToggleButton value="all">All</ToggleButton>
                  <ToggleButton value="introduced">Intro</ToggleButton>
                  <ToggleButton value="in_committee">Cmte</ToggleButton>
                  <ToggleButton value="passed_one_chamber">1 Chamber</ToggleButton>
                  <ToggleButton value="passed">Passed</ToggleButton>
                  <ToggleButton value="signed">Signed</ToggleButton>
                  <ToggleButton value="vetoed">Vetoed</ToggleButton>
                </ToggleButtonGroup>
              </Box>
              <Box sx={{ flexShrink: 0 }}>
                <Typography variant="caption" sx={{ display: 'block', mb: 0.5, fontWeight: 700, textTransform: 'uppercase', letterSpacing: 0.5, color: 'text.primary' }}>
                  Committee
                </Typography>
                <FormControl size="small" sx={{ minWidth: 200, flexShrink: 0 }}>
                  <InputLabel id="browse-committee-label">Committee</InputLabel>
                  <Select
                    labelId="browse-committee-label"
                    label="Committee"
                    value={committeeFilter}
                    onChange={(e) => setCommitteeFilter(e.target.value)}
                  >
                    <MenuItem value="">All committees</MenuItem>
                    {committeeOptions.map((c) => (
                      <MenuItem key={c.slug} value={c.slug}>
                        {c.label}
                      </MenuItem>
                    ))}
                  </Select>
                </FormControl>
              </Box>
              <Box sx={{ flexShrink: 0 }}>
                <Typography variant="caption" sx={{ display: 'block', mb: 0.5, fontWeight: 700, textTransform: 'uppercase', letterSpacing: 0.5, color: 'text.primary' }}>
                  Topic
                </Typography>
                <FormControl size="small" sx={{ minWidth: 200, flexShrink: 0 }}>
                  <InputLabel id="browse-topic-label">Topic / subject</InputLabel>
                  <Select
                    labelId="browse-topic-label"
                    label="Topic / subject"
                    value={topicFilter}
                    onChange={(e) => setTopicFilter(e.target.value)}
                  >
                    <MenuItem value="">All topics</MenuItem>
                    {topicMenuItems.map((t) => (
                      <MenuItem key={t} value={t}>
                        {t}
                      </MenuItem>
                    ))}
                  </Select>
                </FormControl>
              </Box>
              <Box sx={{ display: 'flex', gap: 0.5, alignItems: 'flex-end', pb: 0.25, flexShrink: 0 }}>
                <Tooltip title="Grid or list">
                  <ToggleButtonGroup
                    size="small"
                    exclusive
                    value={viewMode}
                    onChange={(_, v) => v && setViewMode(v)}
                    aria-label="View mode"
                    sx={{ flexShrink: 0 }}
                  >
                    <ToggleButton value="grid" aria-label="Grid view">
                      <LayoutGrid size={18} strokeWidth={2} />
                    </ToggleButton>
                    <ToggleButton value="list" aria-label="List view">
                      <List size={18} strokeWidth={2} />
                    </ToggleButton>
                  </ToggleButtonGroup>
                </Tooltip>
                <IconButton
                  onClick={() => {
                    void (async () => {
                      setLoading(true);
                      setError(null);
                      try {
                        const rowQuery = applyKyBillsRowQuery(chamberMode, chamberFilter);
                        const countQuery = applyKyBillsCountQuery(chamberMode, chamberFilter);
                        if (!rowQuery) {
                          setLoading(false);
                          return;
                        }
                        const [rowRes, countRes] = await Promise.all([
                          withTimeout(rowQuery, 30_000, 'Loading bills timed out. Check Supabase or your network.'),
                          countQuery
                            ? withTimeout(
                                countQuery,
                                30_000,
                                'Loading bill count timed out. Check Supabase or your network.',
                              )
                            : Promise.resolve({ count: null as number | null, error: null }),
                        ]);
                        if (rowRes.error) throw rowRes.error;
                        if (countRes.error) {
                          console.warn('ky_bills count:', countRes.error);
                          setChamberBillTotal(null);
                        } else {
                          setChamberBillTotal(countRes.count ?? null);
                        }
                        setBills(rowRes.data || []);
                      } catch (err: any) {
                        setError(err.message || 'Failed to load bills');
                      } finally {
                        setLoading(false);
                      }
                    })();
                  }}
                  disabled={loading}
                  aria-label="Refresh bills"
                >
                  <Refresh />
                </IconButton>
              </Box>
            </Box>
          </Box>
        </Paper>

        {/* Active filter chips */}
        {(chamberFilter !== 'all' || statusFilter !== 'all' || committeeFilter || topicFilter || searchQuery || effectiveFollowsMe) && (
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
            {committeeFilter && (
              <Chip
                label={committeeFilterLabel}
                size="small"
                onDelete={() => setCommitteeFilter('')}
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
            {searchQuery && (
              <Chip
                label={`"${searchQuery}"`}
                size="small"
                onDelete={() => setSearchQuery('')}
                deleteIcon={<Cancel />}
                color="primary"
                variant="outlined"
              />
            )}
            <Chip
              label="Clear all"
              size="small"
              onClick={() => {
                setChamberFilter('all');
                setStatusFilter('all');
                setCommitteeFilter('');
                setTopicFilter('');
                setSearchQuery('');
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
          <Paper sx={{ p: 6, textAlign: 'center', borderRadius: 2 }}>
            <Search sx={{ fontSize: 48, color: 'text.disabled', mb: 2 }} />
            <Typography variant="h6" color="text.secondary" gutterBottom>
              {effectiveFollowsMe ? 'No followed bills in this view' : 'No bills found'}
            </Typography>
            <Typography variant="body2" color="text.secondary" sx={{ mb: effectiveFollowsMe ? 2 : 0 }}>
              {!supabase
                ? 'Supabase is not configured. Bills will appear once connected.'
                : effectiveFollowsMe
                  ? "You haven't followed any bills yet. Browse current bills and tap Follow on a bill to start tracking."
                  : 'Try adjusting your search terms or filters.'}
            </Typography>
            {effectiveFollowsMe && (
              <Button component={Link} href={browseBaseHref} variant="contained">
                Browse all bills
              </Button>
            )}
          </Paper>
        ) : !followsAwaiting ? (
          <PaginatedSection
            items={sortedBills}
            pageSize={pageSize}
            resetKey={browsePagerResetKey}
            variant="loadmore"
          >
            {(pageBills) =>
              viewMode === 'list' ? (
                <BillsListTable
                  bills={pageBills}
                  sortBy={sortBy}
                  sortDir={sortDir}
                  onRequestSort={handleRequestSort}
                  followedBillIds={followedBillIds}
                />
              ) : (
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
              )
            }
          </PaginatedSection>
        ) : null}
      </Container>
    </Box>
  );
}
