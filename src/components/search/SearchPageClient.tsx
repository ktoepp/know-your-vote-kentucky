'use client';

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import {
  Box,
  Container,
  IconButton,
  Link as MuiLink,
  Typography,
  Alert,
  Avatar,
  Paper,
  Skeleton,
  TextField,
  InputAdornment,
  Button,
  Chip,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Tooltip,
  ToggleButton,
  ToggleButtonGroup,
} from '@mui/material';
import { GaChamberFilterBar } from '@/components/civic/GaChamberFilterBar';
import { gaChamberFilterLabel } from '@/lib/ky-committee-display';
import { Cancel, Search, ArrowForward, Groups, Gavel, Tune } from '@mui/icons-material';
import ListSubheader from '@mui/material/ListSubheader';
import { supabase } from '@/app/lib/supabaseClient';
import type { KYBill, KYLegislatorRoster } from '@/types/kentucky';
import Link from 'next/link';
import { KYBillCard } from '@/components/bills/KYBillCard';
import { CardGrid, CardGridItem } from '@/components/ui/CardGrid';
import DataFreshnessNote from '@/components/civic/DataFreshnessNote';
import { withTimeout } from '@/lib/async-utils';
import { trackSearchPerformed } from '@/lib/analytics';
import {
  buildKyBillSearchFiltersFromUrlSearch,
  canonicalizeKyBillSearchInput,
  fetchKyBillsMatchingSearch,
  isDigitsOnlyBillSearchQuery,
  parseKyBillSearchDateRangeParam,
  type KyBillSearchFilters,
} from '@/lib/ky-search-bills';
import { searchKyMembersInRoster, type KyMemberSearchResult } from '@/lib/ky-search-members';
import { fetchKyCommitteesMatchingSearch, type KyCommitteeSearchResult } from '@/lib/ky-search-committees';
import { formatPartyLetterAbbrev } from '@/lib/bill-display';
import { memberProfilePath } from '@/lib/ky-member-utils';
import { normalizeKyGaDisplayName } from '@/lib/ky-committee-display';
import { parseKyBillSessionParam } from '@/lib/ky-bills-browse-url';
import { parseGaChamberParam } from '@/lib/ky-ga-browse-url';
import { KY_BILL_SESSION_OPTIONS, getCivicDataSessionName } from '@/lib/ky-sessions';
import { PaginatedSection } from '@/components/ui/PaginatedSection';
import { PAGE_SIZE_CHOICES, toPageSizeChoice, usePersistedPageSize } from '@/lib/use-persisted-page-size';
import { useKyBillCommittees } from '@/lib/use-ky-bill-committees';
import { useKySearchSuggestionSubjects } from '@/lib/use-ky-search-suggestion-subjects';
import { useFollowedBillsAndTopics } from '@/lib/use-followed-bills-topics';

/** Enough merged hits for several pages at 25/50/100; search runs multiple parallel `ilike` legs. */
const SEARCH_FETCH_LIMIT = 500;

/** Members roster is ~138 rows; committees ~60 — one page each is "everything". */
const MEMBER_SEARCH_LIMIT = 200;
const COMMITTEE_SEARCH_LIMIT = 100;
/** In the combined "All" view, non-bill sections preview this many, then link to their own tab. */
const ALL_VIEW_PREVIEW = 6;

/** Plain-language copy (F1): what happened + what to do, no Postgres vocabulary. */
const SEARCH_TIMEOUT_COPY =
  'Search took too long. Try fewer or more specific words — or browse by topic.';
const SEARCH_FAILED_COPY =
  'Search hit a problem on our end. Try again in a moment — or browse by topic.';

/** Postgres statement timeout (57014) or our own client-side withTimeout. */
function isSearchTimeoutError(message: string): boolean {
  return message === SEARCH_TIMEOUT_COPY || /statement timeout|57014|timed out/i.test(message);
}

/** Which kind of material the results are scoped to. `all` shows every section. */
type SearchCategory = 'all' | 'bills' | 'members' | 'committees';

/** Normalize the URL `type` param (legacy singular values included) into a category. */
function parseSearchCategory(raw: string | null | undefined): SearchCategory {
  switch ((raw || '').toLowerCase()) {
    case 'bill':
    case 'bills':
      return 'bills';
    case 'member':
    case 'members':
    case 'speaker':
      return 'members';
    case 'committee':
    case 'committees':
      return 'committees';
    default:
      return 'all';
  }
}

function committeeChamberLabel(chamber: KyCommitteeSearchResult['chamber']): string {
  switch (chamber) {
    case 'house':
      return 'House committee';
    case 'senate':
      return 'Senate committee';
    case 'joint':
      return 'Joint committee';
    default:
      return 'Committee';
  }
}

function memberSubtitle(member: KyMemberSearchResult): string {
  const role = member.chamber === 'house' ? 'Representative' : member.chamber === 'senate' ? 'Senator' : '';
  const district = member.district ? `District ${member.district}` : '';
  const party = formatPartyLetterAbbrev(member.party);
  return [role, district, party].filter(Boolean).join(' · ');
}

/** Compact member result card — mirrors the bill/committee card footprint in the grid. */
function MemberResultCard({ member }: { member: KyMemberSearchResult }) {
  const href = memberProfilePath(member);
  const img = member.photo_url || member.legiscan_image_url || undefined;
  return (
    <Paper
      component={Link}
      href={href}
      variant="outlined"
      sx={{
        display: 'flex',
        alignItems: 'center',
        gap: 1.5,
        p: 2,
        borderRadius: 2,
        height: '100%',
        textDecoration: 'none',
        color: 'inherit',
        transition: 'border-color 0.2s ease, box-shadow 0.2s ease',
        '&:hover': { borderColor: 'primary.light', boxShadow: '0 4px 20px rgba(37, 99, 235, 0.08)' },
      }}
    >
      <Avatar src={img} sx={{ width: 48, height: 48, bgcolor: 'primary.light' }}>
        {(member.last_name || member.name || '?').charAt(0).toUpperCase()}
      </Avatar>
      <Box sx={{ minWidth: 0 }}>
        <Typography variant="subtitle1" fontWeight={700} noWrap>
          {member.name}
        </Typography>
        <Typography variant="body2" color="text.secondary" noWrap>
          {memberSubtitle(member)}
        </Typography>
      </Box>
    </Paper>
  );
}

/** Compact committee result card. */
function CommitteeResultCard({ committee }: { committee: KyCommitteeSearchResult }) {
  const href = `/committees/${encodeURIComponent(committee.slug)}`;
  return (
    <Paper
      component={Link}
      href={href}
      variant="outlined"
      sx={{
        display: 'flex',
        alignItems: 'center',
        gap: 1.5,
        p: 2,
        borderRadius: 2,
        height: '100%',
        textDecoration: 'none',
        color: 'inherit',
        transition: 'border-color 0.2s ease, box-shadow 0.2s ease',
        '&:hover': { borderColor: 'primary.light', boxShadow: '0 4px 20px rgba(37, 99, 235, 0.08)' },
      }}
    >
      <Avatar sx={{ width: 48, height: 48, bgcolor: 'primary.light' }}>
        <Gavel />
      </Avatar>
      <Box sx={{ minWidth: 0 }}>
        <Typography variant="subtitle1" fontWeight={700} noWrap>
          {normalizeKyGaDisplayName(committee.name)}
        </Typography>
        <Typography variant="body2" color="text.secondary" noWrap>
          {committeeChamberLabel(committee.chamber)}
        </Typography>
      </Box>
    </Paper>
  );
}

/** Section wrapper with a heading + count for one result category. */
function ResultSection({
  title,
  icon,
  count,
  children,
}: {
  title: string;
  icon?: React.ReactNode;
  count: number;
  children: React.ReactNode;
}) {
  return (
    <Box component="section" aria-label={title} sx={{ mb: 4 }}>
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1.5 }}>
        {icon}
        <Typography variant="h6" component="h2" fontWeight={700}>
          {title}
        </Typography>
        <Chip label={count} size="small" variant="outlined" sx={{ fontWeight: 600 }} />
      </Box>
      {children}
    </Box>
  );
}

export interface SearchPageClientProps {
  legislatorRoster: KYLegislatorRoster[];
}

export function SearchPageClient({ legislatorRoster }: SearchPageClientProps) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const qFromUrl = searchParams.get('q') || searchParams.get('query') || '';
  const canonicalUrlQ = useMemo(
    () => canonicalizeKyBillSearchInput(qFromUrl.trim()),
    [qFromUrl],
  );

  const category = parseSearchCategory(searchParams.get('type'));
  const [query, setQuery] = useState(qFromUrl);
  const [bills, setBills] = useState<KYBill[] | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [searched, setSearched] = useState(false);
  /** Default-session search found nothing, so the shown results span all sessions. */
  const [sessionBroadened, setSessionBroadened] = useState(false);
  const [committees, setCommittees] = useState<KyCommitteeSearchResult[] | null>(null);
  /** Mobile only: the bill filter row is collapsed behind a "Filters" button. */
  const [filtersOpen, setFiltersOpen] = useState(false);
  const legislators = legislatorRoster;
  // Only the bill-scoped params drive the bill search; switching the category tab (`type`)
  // must NOT re-run it. Keyed on just these so tab switches are instant.
  const billFilterKey = useMemo(
    () => ['chamber', 'dateRange', 'status', 'committee', 'session'].map((k) => searchParams.get(k) ?? '').join('|'),
    [searchParams],
  );
  const { pageSize: searchPageSize, setPageSize: setSearchPageSize } = usePersistedPageSize('search', 25);
  const { committees: committeeOptions } = useKyBillCommittees();
  const { rows: subjectSuggestions, loading: suggestionsLoading } = useKySearchSuggestionSubjects({ limit: 14 });
  const { followedBillIds, followedTopics, authed: followAuthed } = useFollowedBillsAndTopics();

  // Members search runs entirely over the roster the page already holds — no fetch, instant.
  const members = useMemo(
    () => (canonicalUrlQ.trim() ? searchKyMembersInRoster(legislators, canonicalUrlQ, MEMBER_SEARCH_LIMIT) : []),
    [legislators, canonicalUrlQ],
  );

  const performSearch = useCallback(async (
    searchQuery: string,
    filters: KyBillSearchFilters,
    opts?: { broadenIfEmpty?: boolean; sessionScope?: 'default' | 'explicit' | 'all' },
  ) => {
    if (!searchQuery.trim()) return;
    setLoading(true);
    setError(null);
    setSearched(true);
    setSessionBroadened(false);
    const startedAt = performance.now();
    const q = searchQuery.trim();
    try {
      if (!supabase) {
        setBills([]);
        setLoading(false);
        return;
      }
      let nextBills = await withTimeout(
        fetchKyBillsMatchingSearch(supabase, q, SEARCH_FETCH_LIMIT, filters),
        25_000,
        SEARCH_TIMEOUT_COPY,
      );
      // Defaulting to the current session must never hide matches that only exist in
      // earlier sessions (e.g. a 2018 bill number, or a topic that last moved in 2025):
      // when the default scope comes up empty, widen to all sessions and say so.
      let broadened = false;
      if (opts?.broadenIfEmpty && filters.session && nextBills.length === 0) {
        nextBills = await withTimeout(
          fetchKyBillsMatchingSearch(supabase, q, SEARCH_FETCH_LIMIT, { ...filters, session: undefined }),
          25_000,
          SEARCH_TIMEOUT_COPY,
        );
        broadened = nextBills.length > 0;
      }
      setSessionBroadened(broadened);
      setBills(nextBills);
      trackSearchPerformed({
        query: q,
        resultCount: nextBills.length,
        durationMs: performance.now() - startedAt,
        sessionScope: broadened ? 'default_broadened' : opts?.sessionScope,
      });
    } catch (err: any) {
      const raw = String(err?.message || err || 'unknown search error');
      const timedOut = isSearchTimeoutError(raw);
      setError(timedOut ? SEARCH_TIMEOUT_COPY : SEARCH_FAILED_COPY);
      trackSearchPerformed({
        query: q,
        resultCount: null,
        durationMs: performance.now() - startedAt,
        error: raw === SEARCH_TIMEOUT_COPY ? 'client_timeout_25s' : raw.slice(0, 300),
      });
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    const raw = qFromUrl.trim();
    if (!raw) return;
    const c = canonicalizeKyBillSearchInput(raw);
    if (c !== raw) {
      const params = new URLSearchParams(searchParams.toString());
      params.set('q', c);
      router.replace(`${pathname}?${params.toString()}`, { scroll: false });
    }
  }, [qFromUrl, pathname, router, searchParams]);

  // Bills always search (regardless of the active category tab) so every tab shows a live
  // count. The bill-only filters (chamber/session/…) still shape this leg.
  useEffect(() => {
    const q = canonicalUrlQ.trim();
    if (!q) {
      setLoading(false);
      setSearched(false);
      setBills(null);
      return;
    }

    setQuery(q);

    const filters = buildKyBillSearchFiltersFromUrlSearch(searchParams);
    // No session in the URL → default to the current session (F5); `session=all` is the
    // explicit opt-out. buildKyBillSearchFiltersFromUrlSearch treats 'all' as unset already.
    const explicitAll = searchParams.get('session') === 'all';
    const usingDefaultSession = !explicitAll && !filters.session;
    if (usingDefaultSession) filters.session = getCivicDataSessionName();
    void performSearch(q, filters, {
      broadenIfEmpty: usingDefaultSession,
      sessionScope: explicitAll ? 'all' : usingDefaultSession ? 'default' : 'explicit',
    });
    // searchParams is read for filters but intentionally excluded: only q + bill filters
    // (billFilterKey) should re-trigger the bill search, not the category tab.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [canonicalUrlQ, billFilterKey, performSearch]);

  // Committees search — one lightweight ilike against the public `ky_committees` table.
  useEffect(() => {
    const q = canonicalUrlQ.trim();
    if (!q || !supabase) {
      setCommittees(q ? [] : null);
      return;
    }
    let cancelled = false;
    void (async () => {
      try {
        const rows = await withTimeout(
          fetchKyCommitteesMatchingSearch(supabase!, q, COMMITTEE_SEARCH_LIMIT),
          15_000,
          SEARCH_TIMEOUT_COPY,
        );
        if (!cancelled) setCommittees(rows);
      } catch {
        if (!cancelled) setCommittees([]);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [canonicalUrlQ]);

  const pushSearchUrl = (nextQuery: string, overrides?: Partial<Record<string, string>>) => {
    const params = new URLSearchParams(searchParams.toString());
    const qTrim = canonicalizeKyBillSearchInput(nextQuery.trim());
    if (!qTrim) return;
    params.set('q', qTrim);
    const keys = ['chamber', 'dateRange', 'status', 'committee', 'session', 'type'] as const;
    for (const k of keys) {
      if (overrides && k in overrides) {
        const v = overrides[k];
        if (v && v !== 'all') params.set(k, v);
        else params.delete(k);
      }
    }
    router.replace(`${pathname}?${params.toString()}`);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    pushSearchUrl(query);
  };

  const setCategory = (next: SearchCategory) => {
    const params = new URLSearchParams(searchParams.toString());
    if (next === 'all') params.delete('type');
    else params.set('type', next);
    const qc = canonicalUrlQ.trim();
    if (qc) params.set('q', qc);
    router.replace(`${pathname}?${params.toString()}`, { scroll: false });
  };

  // Validate URL values here so hand-edited params (chamber=banana, dateRange=weird) don't
  // render phantom filter chips for filters that aren't actually applied.
  const chamberSelect = parseGaChamberParam(searchParams.get('chamber'));
  const dateRangeSelect = parseKyBillSearchDateRangeParam(searchParams.get('dateRange'));
  const statusSelect = searchParams.get('status') || 'all';
  const committeeSelect = searchParams.get('committee') || '';
  const sessionSelect = parseKyBillSessionParam(searchParams.get('session'));
  const sessionParamIsAll = searchParams.get('session') === 'all';
  const defaultSession = getCivicDataSessionName();
  /** Session the visible results are scoped to; '' = spanning all sessions. */
  const effectiveSession = sessionParamIsAll || sessionBroadened ? '' : sessionSelect || defaultSession;
  const showAllSessions = effectiveSession === '';

  const committeeChipLabel = useMemo(() => {
    if (!committeeSelect) return '';
    const found = committeeOptions.find((c) => c.slug === committeeSelect);
    return found?.label ?? committeeSelect.replace(/-/g, ' ');
  }, [committeeSelect, committeeOptions]);

  const hasActiveBillFilters = Boolean(
    chamberSelect || (statusSelect && statusSelect !== 'all') || dateRangeSelect || committeeSelect || sessionSelect,
  );

  /** Count of applied filters (drives the mobile "Filters" button badge + the suggestions gate). */
  const activeFilterCount =
    (chamberSelect ? 1 : 0) +
    (statusSelect && statusSelect !== 'all' ? 1 : 0) +
    (dateRangeSelect ? 1 : 0) +
    (committeeSelect ? 1 : 0) +
    (sessionSelect || sessionParamIsAll ? 1 : 0);
  /** No filters applied → surface the suggested searches (initial load, and after "Clear all"). */
  const noFiltersActive = activeFilterCount === 0;

  const showBillFilters = category === 'all' || category === 'bills';

  const setFilterParam = (key: string, value: string) => {
    const params = new URLSearchParams(searchParams.toString());
    // For `session`, 'all' is a real choice (all sessions) — deleting the param means
    // "default to the current session" instead. Everywhere else 'all' still means unset.
    const isUnset = key === 'session' ? !value : !value || value === 'all';
    if (isUnset) params.delete(key);
    else params.set(key, value);
    const qRaw = (params.get('q') || query).trim();
    const q = qRaw ? canonicalizeKyBillSearchInput(qRaw) : '';
    if (q) params.set('q', q);
    router.replace(`${pathname}?${params.toString()}`);
  };

  /** Drop every bill filter at once, preserving the query (and category tab). */
  const clearBillFilters = () => {
    const params = new URLSearchParams(searchParams.toString());
    for (const k of ['chamber', 'status', 'dateRange', 'committee', 'session']) params.delete(k);
    const qc = canonicalUrlQ.trim();
    if (qc) params.set('q', qc);
    router.replace(`${pathname}?${params.toString()}`);
  };

  const billCount = bills?.length ?? 0;
  const memberCount = members.length;
  const committeeCount = committees?.length ?? 0;
  const totalResults = billCount + memberCount + committeeCount;

  // All-session views sort by session (newest first) so results group under session
  // headers; the stable sort preserves relevance order within each session.
  const displayBills = useMemo(() => {
    if (!bills || !showAllSessions) return bills;
    return [...bills].sort((a, b) => String(b.session ?? '').localeCompare(String(a.session ?? '')));
  }, [bills, showAllSessions]);

  const showBillsSection = category === 'all' || category === 'bills';
  const showMembersSection = category === 'all' || category === 'members';
  const showCommitteesSection = category === 'all' || category === 'committees';

  const renderBillCards = (list: KYBill[]) => (
    <CardGrid>
      {list.map((bill) => (
        <CardGridItem key={bill.id}>
          <KYBillCard
            bill={bill}
            legislators={legislators}
            followedBillIds={followAuthed ? followedBillIds : null}
            followedTopics={followAuthed ? followedTopics : null}
          />
        </CardGridItem>
      ))}
    </CardGrid>
  );

  const membersForView = category === 'members' ? members : members.slice(0, ALL_VIEW_PREVIEW);
  const committeesForView =
    category === 'committees' ? committees ?? [] : (committees ?? []).slice(0, ALL_VIEW_PREVIEW);

  // The page H1 renders server-side in src/app/search/page.tsx: `useSearchParams`
  // here bails this tree out of the static HTML, and crawlers must still see it.
  return (
    <Box sx={{ minHeight: '100vh', bgcolor: 'background.default' }}>
      <Container maxWidth="lg" sx={{ pt: 0, pb: 4 }}>
        {/* Search bar + filters — no surface chrome (flat on the page background). */}
        <Box component="form" onSubmit={handleSubmit} sx={{ mb: 3 }}>
          <Box sx={{ display: 'flex', gap: 1.5, alignItems: 'flex-start', flexWrap: 'wrap' }}>
          <TextField
            fullWidth
            autoFocus={!qFromUrl}
            placeholder="Search bills, members, committees…"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            inputProps={{ 'aria-label': 'Search bills, members, and committees' }}
            sx={{ flex: '1 1 320px' }}
            InputProps={{
              startAdornment: (
                <InputAdornment position="start">
                  <Tooltip
                    arrow
                    enterTouchDelay={0}
                    leaveTouchDelay={5000}
                    title="Search bills (HB 23), members (by name or district), and committees at once. Bill numbers work with or without spaces or dashes (HB23, HB 23, HB-23); a bare number (23) finds every bill type with that number."
                  >
                    <IconButton aria-label="Search tips" size="small" edge="start" sx={{ mr: 0.5 }}>
                      <Search sx={{ color: 'primary.main', opacity: 0.92 }} />
                    </IconButton>
                  </Tooltip>
                </InputAdornment>
              ),
            }}
          />
          <Button type="submit" variant="contained" disabled={loading} sx={{ height: 44 }}>
            Search
          </Button>
          </Box>

          {/* Category tabs — keep the input position fixed; scope results below. */}
          {searched && (
            <Box sx={{ mt: 2 }}>
              <ToggleButtonGroup
                value={category}
                exclusive
                size="small"
                onChange={(_, v) => {
                  if (v) setCategory(v as SearchCategory);
                }}
                aria-label="Filter results by type"
                sx={{ flexWrap: 'wrap' }}
              >
                <ToggleButton value="all">
                  All <Box component="span" sx={{ opacity: 0.65, ml: 0.5 }}>({totalResults >= SEARCH_FETCH_LIMIT ? `${SEARCH_FETCH_LIMIT}+` : totalResults})</Box>
                </ToggleButton>
                <ToggleButton value="bills">
                  Bills <Box component="span" sx={{ opacity: 0.65, ml: 0.5 }}>({billCount >= SEARCH_FETCH_LIMIT ? `${SEARCH_FETCH_LIMIT}+` : billCount})</Box>
                </ToggleButton>
                <ToggleButton value="members">
                  Members <Box component="span" sx={{ opacity: 0.65, ml: 0.5 }}>({memberCount})</Box>
                </ToggleButton>
                <ToggleButton value="committees">
                  Committees <Box component="span" sx={{ opacity: 0.65, ml: 0.5 }}>({committeeCount})</Box>
                </ToggleButton>
              </ToggleButtonGroup>
            </Box>
          )}

          {showBillFilters && (
            <Button
              type="button"
              onClick={() => setFiltersOpen((o) => !o)}
              startIcon={<Tune />}
              size="small"
              variant="text"
              color="inherit"
              aria-expanded={filtersOpen}
              sx={{ display: { xs: 'inline-flex', sm: 'none' }, mt: 2, alignSelf: 'flex-start', color: 'text.secondary', fontWeight: 600 }}
            >
              Filters{activeFilterCount > 0 ? ` (${activeFilterCount})` : ''}
            </Button>
          )}

          {showBillFilters && (
            <Box sx={{ display: { xs: filtersOpen ? 'flex' : 'none', sm: 'flex' }, flexDirection: { xs: 'column', sm: 'row' }, gap: 2, mt: 2, flexWrap: 'wrap', alignItems: { xs: 'stretch', sm: 'flex-end' } }}>
              <Box>
                <Typography
                  variant="caption"
                  sx={{
                    display: 'block',
                    mb: 0.5,
                    fontWeight: 700,
                    textTransform: 'uppercase',
                    letterSpacing: 0.5,
                    color: 'text.primary',
                  }}
                >
                  Chamber
                </Typography>
                <GaChamberFilterBar value={chamberSelect} onChange={(v) => setFilterParam('chamber', v)} />
              </Box>
              <FormControl size="small" sx={{ minWidth: 160 }}>
                <InputLabel id="search-filter-status-label">Status</InputLabel>
                <Select
                  labelId="search-filter-status-label"
                  label="Status"
                  value={statusSelect}
                  onChange={(e) => setFilterParam('status', e.target.value as string)}
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
              <FormControl size="small" sx={{ minWidth: 140 }}>
                <InputLabel id="search-filter-date-range-label">Date range</InputLabel>
                <Select
                  labelId="search-filter-date-range-label"
                  label="Date range"
                  value={dateRangeSelect}
                  onChange={(e) => setFilterParam('dateRange', e.target.value as string)}
                >
                  <MenuItem value="">Any time</MenuItem>
                  <MenuItem value="today">Today</MenuItem>
                  <MenuItem value="week">This week</MenuItem>
                  <MenuItem value="month">This month</MenuItem>
                  <MenuItem value="quarter">This quarter</MenuItem>
                  <MenuItem value="year">This year</MenuItem>
                </Select>
              </FormControl>
              <FormControl size="small" sx={{ minWidth: 175 }}>
                <InputLabel id="search-filter-session-label">Session</InputLabel>
                <Select
                  labelId="search-filter-session-label"
                  label="Session"
                  value={sessionParamIsAll ? 'all' : sessionSelect || defaultSession}
                  onChange={(e) => setFilterParam('session', e.target.value as string)}
                  MenuProps={{ PaperProps: { sx: { maxHeight: 420 } } }}
                >
                  <MenuItem value="all">All sessions</MenuItem>
                  {KY_BILL_SESSION_OPTIONS.map((s) => (
                    <MenuItem key={s} value={s}>
                      {s === defaultSession ? `${s} (current)` : s}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
              <FormControl size="small" sx={{ minWidth: 220 }}>
                <InputLabel id="search-filter-committee-label">Committee</InputLabel>
                <Select
                  labelId="search-filter-committee-label"
                  label="Committee"
                  value={committeeSelect}
                  onChange={(e) => setFilterParam('committee', e.target.value as string)}
                  MenuProps={{ PaperProps: { sx: { maxHeight: 420 } } }}
                >
                  <MenuItem value="">All committees</MenuItem>
                  {(() => {
                    const items: React.ReactNode[] = [];
                    let lastChamber: string | undefined;
                    const chamberLabel: Record<string, string> = { house: 'House', senate: 'Senate', joint: 'Joint' };
                    for (const c of committeeOptions) {
                      const ch = c.chamber ?? 'joint';
                      if (ch !== lastChamber) {
                        items.push(<ListSubheader key={`hdr-${ch}`} disableSticky>{chamberLabel[ch] ?? ch}</ListSubheader>);
                        lastChamber = ch;
                      }
                      items.push(<MenuItem key={c.slug} value={c.slug} sx={{ pl: 3 }}>{c.label}</MenuItem>);
                    }
                    return items;
                  })()}
                </Select>
              </FormControl>
              {displayBills && displayBills.length > 0 && (
                <FormControl size="small" sx={{ minWidth: 110 }}>
                  <InputLabel id="search-per-page-label">Per page</InputLabel>
                  <Select
                    labelId="search-per-page-label"
                    label="Per page"
                    value={searchPageSize}
                    onChange={(e) => setSearchPageSize(toPageSizeChoice(parseInt(String(e.target.value), 10)))}
                  >
                    {PAGE_SIZE_CHOICES.map((n) => (
                      <MenuItem key={n} value={n}>{n}</MenuItem>
                    ))}
                  </Select>
                </FormControl>
              )}
            </Box>
          )}

          {/* Active filter chips */}
          {showBillFilters && (chamberSelect || (statusSelect && statusSelect !== 'all') || dateRangeSelect || committeeSelect || sessionSelect || sessionParamIsAll) && (
            <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.75, mt: 1.5, alignItems: 'center' }}>
              <Typography variant="caption" sx={{ fontWeight: 700, mr: 0.5, color: 'text.primary' }}>
                Active filters:
              </Typography>
              {chamberSelect && (
                <Chip
                  label={gaChamberFilterLabel(chamberSelect)}
                  size="small"
                  onDelete={() => setFilterParam('chamber', '')}
                  deleteIcon={<Cancel />}
                  color="primary"
                  variant="outlined"
                />
              )}
              {statusSelect && statusSelect !== 'all' && (
                <Chip label={{ introduced: 'Introduced', in_committee: 'In committee', passed_one_chamber: 'Passed one chamber', passed: 'Passed', signed: 'Signed', vetoed: 'Vetoed' }[statusSelect] ?? statusSelect} size="small" onDelete={() => setFilterParam('status', 'all')} deleteIcon={<Cancel />} color="primary" variant="outlined" />
              )}
              {dateRangeSelect && (
                <Chip label={{ today: 'Today', week: 'This week', month: 'This month', quarter: 'This quarter', year: 'This year' }[dateRangeSelect] ?? dateRangeSelect} size="small" onDelete={() => setFilterParam('dateRange', '')} deleteIcon={<Cancel />} color="primary" variant="outlined" />
              )}
              {committeeSelect && (
                <Chip label={committeeChipLabel} size="small" onDelete={() => setFilterParam('committee', '')} deleteIcon={<Cancel />} color="primary" variant="outlined" />
              )}
              {sessionSelect && (
                <Chip label={sessionSelect} size="small" onDelete={() => setFilterParam('session', '')} deleteIcon={<Cancel />} color="primary" variant="outlined" />
              )}
              {sessionParamIsAll && (
                <Chip label="All sessions" size="small" onDelete={() => setFilterParam('session', '')} deleteIcon={<Cancel />} color="primary" variant="outlined" />
              )}
              <Button
                type="button"
                onClick={clearBillFilters}
                startIcon={<Cancel />}
                size="small"
                variant="text"
                color="inherit"
                sx={{ ml: 0.5, color: 'text.secondary' }}
              >
                Clear filters
              </Button>
            </Box>
          )}
          {noFiltersActive && (
            <Box sx={{ mt: 2 }}>
              <Typography
                variant="caption"
                sx={{ display: 'block', mb: 1, fontWeight: 700, color: 'text.primary' }}
              >
                Suggested searches
              </Typography>
              <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap', alignItems: 'center' }}>
                {suggestionsLoading &&
                  [96, 120, 84, 108].map((width, k) => (
                    <Skeleton
                      key={k}
                      variant="rounded"
                      width={width}
                      height={24}
                      aria-hidden
                      sx={{ borderRadius: 16 }}
                    />
                  ))}
                {!suggestionsLoading &&
                  subjectSuggestions.map((s) => (
                    <Chip
                      key={s.subject_name}
                      label={
                        <>
                          {s.subject_name}{' '}
                          <Box component="span" sx={{ opacity: 0.65 }}>({s.bill_count})</Box>
                        </>
                      }
                      size="small"
                      color="primary"
                      variant="outlined"
                      onClick={() => {
                        setQuery(s.subject_name);
                        pushSearchUrl(s.subject_name);
                      }}
                      sx={{ cursor: 'pointer' }}
                    />
                  ))}
                {!suggestionsLoading && subjectSuggestions.length === 0 && (
                  <>
                    <Chip
                      label="education"
                      size="small"
                      variant="outlined"
                      onClick={() => {
                        setQuery('education');
                        pushSearchUrl('education');
                      }}
                      sx={{ cursor: 'pointer' }}
                    />
                    <Chip
                      label="Medicaid"
                      size="small"
                      variant="outlined"
                      onClick={() => {
                        setQuery('Medicaid');
                        pushSearchUrl('Medicaid');
                      }}
                      sx={{ cursor: 'pointer' }}
                    />
                  </>
                )}
              </Box>
            </Box>
          )}

          {/* Condensed result summary — hugs the bottom center of the search area. */}
          {searched && !loading && bills && (
            <Box sx={{ mt: 2.5, textAlign: 'center' }}>
              <Typography variant="body2" color="text.secondary" role="status">
                {totalResults >= SEARCH_FETCH_LIMIT ? `${SEARCH_FETCH_LIMIT}+` : totalResults} result
                {totalResults !== 1 ? 's' : ''} for &quot;{query}&quot;
                {(category === 'all' || category === 'bills') && (showAllSessions ? ' across all sessions' : ` in the ${effectiveSession}`)}
                {(category === 'all' || category === 'bills') && !showAllSessions && (
                  <>
                    {' · '}
                    <MuiLink
                      component="button"
                      type="button"
                      onClick={() => setFilterParam('session', 'all')}
                      sx={{ verticalAlign: 'baseline', fontWeight: 600 }}
                    >
                      Search all sessions
                    </MuiLink>
                  </>
                )}
                {' · '}
                Also search{' '}
                <MuiLink component={Link} href={`/meetings?q=${encodeURIComponent(query.trim())}`} fontWeight={600}>
                  committee agendas
                </MuiLink>
              </Typography>
            </Box>
          )}
        </Box>

        {error && (
          <Alert
            severity="error"
            sx={{ mb: 3 }}
            action={
              <Button color="inherit" size="small" component={Link} href="/bills">
                Browse by topic
              </Button>
            }
          >
            {error}
          </Alert>
        )}
        {loading && (
          <Box role="status" aria-live="polite" aria-label="Searching" sx={{ mt: 1 }}>
            <Skeleton variant="text" width={220} sx={{ fontSize: '0.875rem', mb: 1 }} />
            <Skeleton variant="text" width={180} sx={{ fontSize: '0.875rem', mb: 3 }} />
            <CardGrid>
              {Array.from({ length: 6 }, (_, i) => (
                <CardGridItem key={i}>
                  <Skeleton variant="rounded" height={190} sx={{ borderRadius: 3 }} />
                </CardGridItem>
              ))}
            </CardGrid>
          </Box>
        )}

        {searched && !loading && (
          <>
            {/* Empty state only when NO category has any match (wait for both async legs). */}
            {totalResults === 0 && bills && committees !== null && (
              <Paper sx={{ p: 6, textAlign: 'center', borderRadius: 2 }}>
                <Search sx={{ fontSize: 48, color: 'text.disabled', mb: 2 }} />
                <Typography variant="h6" component="h2" color="text.secondary">
                  No results found
                </Typography>
                <Typography variant="body2" color="text.secondary" sx={{ mt: 1, maxWidth: 560, mx: 'auto' }}>
                  We searched bills, members, and committees. Bill numbers accept spaces and punctuation (for example
                  HB 23, HB23, HB-23). You can filter bills by chamber, status, time, or committee above
                  {hasActiveBillFilters ? '; those selections may narrow results sharply' : ''}.
                </Typography>
                {isDigitsOnlyBillSearchQuery(query) && (
                  <Typography variant="body2" color="text.secondary" sx={{ mt: 1.5, maxWidth: 560, mx: 'auto' }}>
                    Searching with only a numeral lists every designation that uses that bill number across types (for
                    example House and Senate measures with the same number).
                  </Typography>
                )}
              </Paper>
            )}

            {/* Members */}
            {showMembersSection && memberCount > 0 && (
              <ResultSection title="Members" icon={<Groups color="action" />} count={memberCount}>
                <CardGrid>
                  {membersForView.map((m) => (
                    <CardGridItem key={m.id}>
                      <MemberResultCard member={m} />
                    </CardGridItem>
                  ))}
                </CardGrid>
                {category === 'all' && memberCount > membersForView.length && (
                  <Button onClick={() => setCategory('members')} endIcon={<ArrowForward />} sx={{ mt: 1 }}>
                    See all {memberCount} members
                  </Button>
                )}
              </ResultSection>
            )}

            {/* Committees */}
            {showCommitteesSection && committeeCount > 0 && (
              <ResultSection title="Committees" icon={<Gavel color="action" />} count={committeeCount}>
                <CardGrid>
                  {committeesForView.map((c) => (
                    <CardGridItem key={c.id}>
                      <CommitteeResultCard committee={c} />
                    </CardGridItem>
                  ))}
                </CardGrid>
                {category === 'all' && committeeCount > committeesForView.length && (
                  <Button onClick={() => setCategory('committees')} endIcon={<ArrowForward />} sx={{ mt: 1 }}>
                    See all {committeeCount} committees
                  </Button>
                )}
              </ResultSection>
            )}

            {/* Bills */}
            {showBillsSection && bills && (
              <>
                {sessionBroadened && (
                  <Alert severity="info" sx={{ mb: 2 }}>
                    No matches in the {defaultSession}, so these results include earlier sessions.
                  </Alert>
                )}

                {displayBills && displayBills.length > 0 && (
                  <ResultSection title="Bills" icon={<Search color="action" />} count={billCount}>
                    <PaginatedSection
                      items={displayBills}
                      pageSize={searchPageSize}
                      resetKey={`bill-${query}-${displayBills.length}-${displayBills[0]?.id ?? ''}-${searchPageSize}`}
                      variant="responsive"
                    >
                      {(pageBills) => {
                        if (!showAllSessions) return renderBillCards(pageBills);
                        // Mixed-session pages get session headers (F5): items arrive
                        // session-sorted, so consecutive runs are whole groups.
                        const groups: { session: string; items: KYBill[] }[] = [];
                        for (const b of pageBills) {
                          const label = b.session || 'Other sessions';
                          const last = groups[groups.length - 1];
                          if (last && last.session === label) last.items.push(b);
                          else groups.push({ session: label, items: [b] });
                        }
                        return (
                          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2.5 }}>
                            {groups.map((g) => (
                              <Box key={g.session} component="section" aria-label={g.session}>
                                <Typography
                                  variant="subtitle2"
                                  component="h3"
                                  sx={{
                                    fontWeight: 700,
                                    mb: 1,
                                    color: 'text.secondary',
                                    textTransform: 'uppercase',
                                    letterSpacing: 0.5,
                                    fontSize: '0.75rem',
                                  }}
                                >
                                  {g.session}
                                </Typography>
                                {renderBillCards(g.items)}
                              </Box>
                            ))}
                          </Box>
                        );
                      }}
                    </PaginatedSection>
                    <Button component={Link} href="/bills" endIcon={<ArrowForward />} sx={{ mt: 1 }}>Browse all bills</Button>
                  </ResultSection>
                )}
              </>
            )}
          </>
        )}

        <DataFreshnessNote variant="page" />
      </Container>
    </Box>
  );
}
