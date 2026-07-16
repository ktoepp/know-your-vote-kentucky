'use client';

import React, { useState, Suspense, useEffect, useCallback, useMemo } from 'react';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import {
  Box,
  Container,
  Link as MuiLink,
  Typography,
  Alert,
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
} from '@mui/material';
import { GaChamberFilterBar } from '@/components/civic/GaChamberFilterBar';
import { gaChamberFilterLabel } from '@/lib/ky-committee-display';
import { Cancel, Search, Gavel, ArrowForward } from '@mui/icons-material';
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
import { parseKyBillSessionParam } from '@/lib/ky-bills-browse-url';
import { parseGaChamberParam } from '@/lib/ky-ga-browse-url';
import { KY_BILL_SESSION_OPTIONS } from '@/lib/ky-sessions';
import { PaginatedSection } from '@/components/ui/PaginatedSection';
import { PAGE_SIZE_CHOICES, toPageSizeChoice, usePersistedPageSize } from '@/lib/use-persisted-page-size';
import { useKyBillCommittees } from '@/lib/use-ky-bill-committees';
import { useKySearchSuggestionSubjects } from '@/lib/use-ky-search-suggestion-subjects';
import { useFollowedBillsAndTopics } from '@/lib/use-followed-bills-topics';

/** Enough merged hits for several pages at 25/50/100; search runs multiple parallel `ilike` legs. */
const SEARCH_FETCH_LIMIT = 500;

/** Plain-language copy (F1): what happened + what to do, no Postgres vocabulary. */
const SEARCH_TIMEOUT_COPY =
  'Search took too long. Try fewer or more specific words — or browse by topic.';
const SEARCH_FAILED_COPY =
  'Search hit a problem on our end. Try again in a moment — or browse by topic.';

/** Postgres statement timeout (57014) or our own client-side withTimeout. */
function isSearchTimeoutError(message: string): boolean {
  return message === SEARCH_TIMEOUT_COPY || /statement timeout|57014|timed out/i.test(message);
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

  const contentType = searchParams.get('type') || 'all';
  const [query, setQuery] = useState(qFromUrl);
  const [bills, setBills] = useState<KYBill[] | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [searched, setSearched] = useState(false);
  const [nonBillType, setNonBillType] = useState<string | null>(null);
  const legislators = legislatorRoster;
  const filterKey = searchParams.toString();
  const { pageSize: searchPageSize, setPageSize: setSearchPageSize } = usePersistedPageSize('search', 25);
  const { committees: committeeOptions } = useKyBillCommittees();
  const { rows: subjectSuggestions, loading: suggestionsLoading } = useKySearchSuggestionSubjects({ limit: 14 });
  const { followedBillIds, followedTopics, authed: followAuthed } = useFollowedBillsAndTopics();

  const performSearch = useCallback(async (searchQuery: string, filters: KyBillSearchFilters) => {
    if (!searchQuery.trim()) return;
    setLoading(true);
    setError(null);
    setSearched(true);
    setNonBillType(null);
    const startedAt = performance.now();
    const q = searchQuery.trim();
    try {
      if (!supabase) {
        setBills([]);
        setLoading(false);
        return;
      }
      const nextBills = await withTimeout(
        fetchKyBillsMatchingSearch(supabase, q, SEARCH_FETCH_LIMIT, filters),
        25_000,
        SEARCH_TIMEOUT_COPY,
      );
      setBills(nextBills);
      trackSearchPerformed({
        query: q,
        resultCount: nextBills.length,
        durationMs: performance.now() - startedAt,
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
    if (contentType !== 'all' && contentType !== 'bill') return;
    const c = canonicalizeKyBillSearchInput(raw);
    if (c !== raw) {
      const params = new URLSearchParams(searchParams.toString());
      params.set('q', c);
      router.replace(`${pathname}?${params.toString()}`, { scroll: false });
    }
  }, [qFromUrl, contentType, pathname, router, searchParams]);

  useEffect(() => {
    const q = canonicalUrlQ.trim();
    if (!q) {
      setLoading(false);
      setSearched(false);
      setBills(null);
      setNonBillType(null);
      return;
    }

    setQuery(q);

    if (contentType !== 'all' && contentType !== 'bill') {
      setSearched(true);
      setNonBillType(contentType);
      setBills([]);
      setLoading(false);
      setError(null);
      return;
    }

    setNonBillType(null);
    const filters = buildKyBillSearchFiltersFromUrlSearch(searchParams);
    void performSearch(q, filters);
  }, [canonicalUrlQ, contentType, filterKey, performSearch, searchParams]);

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

  // Validate URL values here so hand-edited params (chamber=banana, dateRange=weird) don't
  // render phantom filter chips for filters that aren't actually applied.
  const chamberSelect = parseGaChamberParam(searchParams.get('chamber'));
  const dateRangeSelect = parseKyBillSearchDateRangeParam(searchParams.get('dateRange'));
  const statusSelect = searchParams.get('status') || 'all';
  const committeeSelect = searchParams.get('committee') || '';
  const sessionSelect = parseKyBillSessionParam(searchParams.get('session'));

  const committeeChipLabel = useMemo(() => {
    if (!committeeSelect) return '';
    const found = committeeOptions.find((c) => c.slug === committeeSelect);
    return found?.label ?? committeeSelect.replace(/-/g, ' ');
  }, [committeeSelect, committeeOptions]);

  const hasActiveBillFilters = Boolean(
    chamberSelect || (statusSelect && statusSelect !== 'all') || dateRangeSelect || committeeSelect || sessionSelect,
  );

  const setFilterParam = (key: string, value: string) => {
    const params = new URLSearchParams(searchParams.toString());
    if (!value || value === 'all') params.delete(key);
    else params.set(key, value);
    const qRaw = (params.get('q') || query).trim();
    const q = qRaw ? canonicalizeKyBillSearchInput(qRaw) : '';
    if (q) params.set('q', q);
    router.replace(`${pathname}?${params.toString()}`);
  };

  const totalResults = bills?.length ?? 0;

  return (
    <Box sx={{ minHeight: '100vh', bgcolor: 'background.default' }}>
      <Container maxWidth="lg" sx={{ py: 4 }}>
        <Typography variant="h4" component="h1" fontWeight={700} gutterBottom>
          Search Kentucky bills
        </Typography>

        {/* Search Bar */}
        <Paper elevation={1} sx={{ p: 2, mb: 4, borderRadius: 2 }} component="form" onSubmit={handleSubmit}>
          <TextField
            fullWidth
            placeholder="Example: HB 23, SB 6, Medicaid, budgets…"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            inputProps={{ 'aria-label': 'Search Kentucky bills' }}
            InputProps={{
              startAdornment: (
                <InputAdornment position="start">
                  <Search sx={{ color: 'primary.main', opacity: 0.92 }} aria-hidden />
                </InputAdornment>
              ),
              endAdornment: <Button type="submit" variant="contained" disabled={loading}>Search</Button>,
            }}
          />
          <Typography variant="body2" color="text.primary" component="p" sx={{ mt: 1, mx: 0.5, lineHeight: 1.5 }}>
            Bill numbers work with or without spaces and common punctuation ({`HB23`}, {`HB 23`}, {`HB-23`}). Typing{' '}
            <Box component="span" sx={{ fontWeight: 600 }}>only a number</Box> finds every designation with that
            numeral (House, Senate, and resolutions together).
          </Typography>
          <Box sx={{ display: 'flex', flexDirection: { xs: 'column', sm: 'row' }, gap: 2, mt: 2, flexWrap: 'wrap', alignItems: { xs: 'stretch', sm: 'flex-end' } }}>
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
                value={sessionSelect}
                onChange={(e) => setFilterParam('session', e.target.value as string)}
              >
                <MenuItem value="">All sessions</MenuItem>
                {KY_BILL_SESSION_OPTIONS.map((s) => (
                  <MenuItem key={s} value={s}>{s}</MenuItem>
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
          </Box>

          {/* Active filter chips */}
          {(chamberSelect || (statusSelect && statusSelect !== 'all') || dateRangeSelect || committeeSelect || sessionSelect) && (
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
              <Chip label="Clear all" size="small" onClick={() => {
                const params = new URLSearchParams(searchParams.toString());
                params.delete('chamber');
                params.delete('status');
                params.delete('dateRange');
                params.delete('committee');
                params.delete('session');
                router.replace(`${pathname}?${params.toString()}`);
              }} variant="outlined" sx={{ ml: 0.5 }} />
            </Box>
          )}
          {!searched && (
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
                      label={`${s.subject_name} (${s.bill_count})`}
                      size="small"
                      color="primary"
                      variant="outlined"
                      onClick={() => {
                        setQuery(s.subject_name);
                        pushSearchUrl(s.subject_name);
                      }}
                      sx={{ cursor: 'pointer', '&.MuiChip-sizeSmall': { height: { xs: 44, sm: 20 } } }}
                    />
                  ))}
                {!suggestionsLoading && subjectSuggestions.length === 0 && (
                  <>
                    <Chip
                      label="Try: education"
                      size="small"
                      variant="outlined"
                      onClick={() => {
                        setQuery('education');
                        pushSearchUrl('education');
                      }}
                      sx={{ cursor: 'pointer', '&.MuiChip-sizeSmall': { height: { xs: 44, sm: 20 } } }}
                    />
                    <Chip
                      label="Try: Medicaid"
                      size="small"
                      variant="outlined"
                      onClick={() => {
                        setQuery('Medicaid');
                        pushSearchUrl('Medicaid');
                      }}
                      sx={{ cursor: 'pointer', '&.MuiChip-sizeSmall': { height: { xs: 44, sm: 20 } } }}
                    />
                  </>
                )}
                <Chip
                  label='Bill number: 23'
                  size="small"
                  variant="outlined"
                  onClick={() => {
                    setQuery('23');
                    pushSearchUrl('23');
                  }}
                  sx={{ cursor: 'pointer', '&.MuiChip-sizeSmall': { height: { xs: 44, sm: 20 } } }}
                />
                <Chip
                  label="HB 1"
                  size="small"
                  variant="outlined"
                  onClick={() => {
                    setQuery('HB 1');
                    pushSearchUrl('HB 1');
                  }}
                  sx={{ cursor: 'pointer', '&.MuiChip-sizeSmall': { height: { xs: 44, sm: 20 } } }}
                />
              </Box>
            </Box>
          )}
        </Paper>

        {nonBillType && (
          <Alert
            severity="info"
            sx={{ mb: 3 }}
            action={
              <Button
                color="inherit"
                size="small"
                onClick={() => {
                  const p = new URLSearchParams(searchParams.toString());
                  p.delete('type');
                  router.replace(`${pathname}?${p.toString()}`);
                }}
              >
                Search bills
              </Button>
            }
          >
            <Typography variant="body2" component="span">
              You are filtering by a category this page does not search yet. This search covers Kentucky bills only —
              use &quot;Search bills&quot; to reset that filter and show bill matches again.
            </Typography>
          </Alert>
        )}

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
          <Box role="status" aria-live="polite" aria-label="Searching bills" sx={{ mt: 1 }}>
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

        {searched && !loading && bills && (
          <>
            <Typography variant="body2" color="text.secondary" role="status" sx={{ mb: 1 }}>
              {totalResults >= SEARCH_FETCH_LIMIT ? `${SEARCH_FETCH_LIMIT}+` : totalResults} result
              {totalResults !== 1 ? 's' : ''} for &quot;{query}&quot;
            </Typography>
            <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
              Also search{' '}
              <MuiLink component={Link} href={`/meetings?q=${encodeURIComponent(query.trim())}`} fontWeight={600}>
                committee agendas
              </MuiLink>
              .
            </Typography>

            {totalResults === 0 && (
              <Paper sx={{ p: 6, textAlign: 'center', borderRadius: 2 }}>
                <Search sx={{ fontSize: 48, color: 'text.disabled', mb: 2 }} />
                <Typography variant="h6" component="h2" color="text.secondary">
                  No results found
                </Typography>
                <Typography variant="body2" color="text.secondary" sx={{ mt: 1, maxWidth: 560, mx: 'auto' }}>
                  Bill numbers accept spaces and punctuation (for example HB 23, HB23, HB-23). You can filter by chamber,
                  status, time, or committee above{hasActiveBillFilters ? '; those selections may narrow results sharply' : ''}.
                </Typography>
                {isDigitsOnlyBillSearchQuery(query) && (
                  <Typography variant="body2" color="text.secondary" sx={{ mt: 1.5, maxWidth: 560, mx: 'auto' }}>
                    Searching with only a numeral lists every designation that uses that bill number across types (for
                    example House and Senate measures with the same number).
                  </Typography>
                )}
                {hasActiveBillFilters && (
                  <Box sx={{ mt: 2 }}>
                    <Button
                      size="small"
                      variant="outlined"
                      onClick={() => {
                        const params = new URLSearchParams(searchParams.toString());
                        params.delete('chamber');
                        params.delete('status');
                        params.delete('dateRange');
                        params.delete('committee');
                        params.delete('session');
                        const qc = canonicalUrlQ.trim();
                        if (!qc) {
                          router.replace(`${pathname}?${params.toString()}`);
                          return;
                        }
                        params.set('q', qc);
                        router.replace(`${pathname}?${params.toString()}`);
                      }}
                    >
                      Clear filters
                    </Button>
                  </Box>
                )}
              </Paper>
            )}

            {bills.length > 0 && (
              <Box sx={{ mb: 4 }}>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 2 }}>
                  <Gavel color="primary" />
                  <Typography variant="h6" component="h2" fontWeight={600}>Bills ({bills.length})</Typography>
                </Box>
                <PaginatedSection
                  items={bills}
                  pageSize={searchPageSize}
                  pageSizeOptions={[...PAGE_SIZE_CHOICES]}
                  onPageSizeChange={(n) => setSearchPageSize(toPageSizeChoice(n))}
                  resetKey={`bill-${query}-${bills.length}-${bills[0]?.id ?? ''}-${searchPageSize}`}
                  variant="responsive"
                >
                  {(pageBills) => (
                    <CardGrid>
                      {pageBills.map((bill) => (
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
                  )}
                </PaginatedSection>
                <Button component={Link} href="/bills" endIcon={<ArrowForward />} sx={{ mt: 1 }}>Browse all bills</Button>
              </Box>
            )}
          </>
        )}

        <DataFreshnessNote variant="page" />
      </Container>
    </Box>
  );
}

