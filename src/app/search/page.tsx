'use client';

import React, { useState, Suspense, useEffect, useCallback, useMemo } from 'react';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import {
  Box,
  Container,
  Typography,
  CircularProgress,
  Alert,
  Paper,
  TextField,
  InputAdornment,
  Button,
  Grid,
  Chip,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  ToggleButtonGroup,
  ToggleButton,
} from '@mui/material';
import { Cancel, Search, Gavel, ArrowForward } from '@mui/icons-material';
import ListSubheader from '@mui/material/ListSubheader';
import { supabase } from '../lib/supabaseClient';
import type { KYBill, KYLegislatorRoster } from '../../types/kentucky';
import Link from 'next/link';
import { KYBillCard } from '@/components/bills/KYBillCard';
import DataFreshnessNote from '@/components/civic/DataFreshnessNote';
import { withTimeout } from '@/lib/async-utils';
import {
  buildKyBillSearchFiltersFromUrlSearch,
  canonicalizeKyBillSearchInput,
  fetchKyBillsMatchingSearch,
  isDigitsOnlyBillSearchQuery,
  type KyBillSearchFilters,
} from '@/lib/ky-search-bills';
import { PaginatedSection } from '@/components/ui/PaginatedSection';
import { PAGE_SIZE_CHOICES, toPageSizeChoice, usePersistedPageSize } from '@/lib/use-persisted-page-size';
import { useKyBillCommittees } from '@/lib/use-ky-bill-committees';
import { useKySearchSuggestionSubjects } from '@/lib/use-ky-search-suggestion-subjects';
import { useFollowedBillsAndTopics } from '@/lib/use-followed-bills-topics';

/** Enough merged hits for several pages at 25/50/100; search runs multiple parallel `ilike` legs. */
const SEARCH_FETCH_LIMIT = 500;

function SearchPageContent() {
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
  const [legislators, setLegislators] = useState<KYLegislatorRoster[]>([]);
  const filterKey = searchParams.toString();
  const { pageSize: searchPageSize, setPageSize: setSearchPageSize } = usePersistedPageSize('search', 25);
  const { committees: committeeOptions } = useKyBillCommittees();
  const { rows: subjectSuggestions, loading: suggestionsLoading } = useKySearchSuggestionSubjects({ limit: 14 });
  const { followedBillIds, followedTopics, authed: followAuthed } = useFollowedBillsAndTopics();

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

  const performSearch = useCallback(async (searchQuery: string, filters: KyBillSearchFilters) => {
    if (!searchQuery.trim()) return;
    setLoading(true);
    setError(null);
    setSearched(true);
    setNonBillType(null);
    try {
      if (!supabase) {
        setBills([]);
        setLoading(false);
        return;
      }
      const q = searchQuery.trim();
      const nextBills = await withTimeout(
        fetchKyBillsMatchingSearch(supabase, q, SEARCH_FETCH_LIMIT, filters),
        25_000,
        'Search timed out. Check your connection or try a shorter query.',
      );
      setBills(nextBills);
    } catch (err: any) {
      setError(err.message || 'Search failed');
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
    const keys = ['chamber', 'dateRange', 'status', 'committee', 'type'] as const;
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

  const chamberSelect = searchParams.get('chamber') || '';
  const dateRangeSelect = searchParams.get('dateRange') || '';
  const statusSelect = searchParams.get('status') || 'all';
  const committeeSelect = searchParams.get('committee') || '';

  const committeeChipLabel = useMemo(() => {
    if (!committeeSelect) return '';
    const found = committeeOptions.find((c) => c.slug === committeeSelect);
    return found?.label ?? committeeSelect.replace(/-/g, ' ');
  }, [committeeSelect, committeeOptions]);

  const hasActiveBillFilters = Boolean(
    chamberSelect || (statusSelect && statusSelect !== 'all') || dateRangeSelect || committeeSelect,
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
        <DataFreshnessNote variant="page" />

        {/* Search Bar */}
        <Paper elevation={1} sx={{ p: 2, mb: 4, borderRadius: 2 }} component="form" onSubmit={handleSubmit}>
          <TextField
            fullWidth
            placeholder="Example: HB 23, SB 6, Medicaid, budgets…"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
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
          <Box sx={{ display: 'flex', flexDirection: { xs: 'column', sm: 'row' }, gap: 2, mt: 2, flexWrap: 'wrap', alignItems: 'flex-end' }}>
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
              <ToggleButtonGroup
                value={chamberSelect || 'all'}
                exclusive
                size="small"
                onChange={(_, v) => { if (v !== null) setFilterParam('chamber', v === 'all' ? '' : v); }}
                aria-label="Filter by chamber"
              >
                <ToggleButton value="all">All</ToggleButton>
                <ToggleButton value="house">House</ToggleButton>
                <ToggleButton value="senate">Senate</ToggleButton>
              </ToggleButtonGroup>
            </Box>
            <FormControl size="small" sx={{ minWidth: 160 }}>
              <InputLabel>Status</InputLabel>
              <Select
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
              <InputLabel>Date range</InputLabel>
              <Select
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
            <FormControl size="small" sx={{ minWidth: 220 }}>
              <InputLabel>Committee</InputLabel>
              <Select
                label="Committee"
                value={committeeSelect}
                onChange={(e) => setFilterParam('committee', e.target.value as string)}
                MenuProps={{ PaperProps: { sx: { maxHeight: 420 } } }}
              >
                <MenuItem value="">All committees</MenuItem>
                {(() => {
                  const items: React.ReactNode[] = [];
                  let lastChamber: string | undefined;
                  const chamberLabel: Record<string, string> = { house: 'House', senate: 'Senate', joint: 'Joint / Interim' };
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
          {(chamberSelect || (statusSelect && statusSelect !== 'all') || dateRangeSelect || committeeSelect) && (
            <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.75, mt: 1.5, alignItems: 'center' }}>
              <Typography variant="caption" sx={{ fontWeight: 700, mr: 0.5, color: 'text.primary' }}>
                Active filters:
              </Typography>
              {chamberSelect && (
                <Chip label={chamberSelect === 'house' ? 'House' : 'Senate'} size="small" onDelete={() => setFilterParam('chamber', '')} deleteIcon={<Cancel />} color="primary" variant="outlined" />
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
              <Chip label="Clear all" size="small" onClick={() => { setFilterParam('chamber', ''); setFilterParam('status', 'all'); setFilterParam('dateRange', ''); setFilterParam('committee', ''); }} variant="outlined" sx={{ ml: 0.5 }} />
            </Box>
          )}
          {!searched && (
            <Box sx={{ mt: 2 }}>
              <Typography
                variant="caption"
                sx={{ display: 'block', mb: 1, fontWeight: 700, color: 'text.primary' }}
              >
                Popular LegiScan subjects this session
              </Typography>
              <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap', alignItems: 'center' }}>
                {suggestionsLoading &&
                  [1, 2, 3, 4].map((k) => (
                    <Chip key={k} label="…" size="small" sx={{ opacity: 0.4 }} />
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
                      sx={{ cursor: 'pointer' }}
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
                      sx={{ cursor: 'pointer' }}
                    />
                    <Chip
                      label="Try: Medicaid"
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
                <Chip
                  label='Bill number: 23'
                  size="small"
                  variant="outlined"
                  onClick={() => {
                    setQuery('23');
                    pushSearchUrl('23');
                  }}
                  sx={{ cursor: 'pointer' }}
                />
                <Chip
                  label="HB 1"
                  size="small"
                  variant="outlined"
                  onClick={() => {
                    setQuery('HB 1');
                    pushSearchUrl('HB 1');
                  }}
                  sx={{ cursor: 'pointer' }}
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

        {error && <Alert severity="error" sx={{ mb: 3 }}>{error}</Alert>}
        {loading && <Box sx={{ display: 'flex', justifyContent: 'center', py: 8 }}><CircularProgress /></Box>}

        {searched && !loading && bills && (
          <>
            <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
              {totalResults} result{totalResults !== 1 ? 's' : ''} for &quot;{query}&quot;
            </Typography>

            {totalResults === 0 && (
              <Paper sx={{ p: 6, textAlign: 'center', borderRadius: 2 }}>
                <Search sx={{ fontSize: 48, color: 'text.disabled', mb: 2 }} />
                <Typography variant="h6" color="text.secondary">
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
                  <Typography variant="h6" fontWeight={600}>Bills ({bills.length})</Typography>
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
                    <Grid container spacing={3}>
                      {pageBills.map((bill) => (
                        <Grid item xs={12} sm={6} md={4} key={bill.id}>
                          <KYBillCard
                            bill={bill}
                            legislators={legislators}
                            followedBillIds={followAuthed ? followedBillIds : null}
                            followedTopics={followAuthed ? followedTopics : null}
                          />
                        </Grid>
                      ))}
                    </Grid>
                  )}
                </PaginatedSection>
                <Button component={Link} href="/bills" endIcon={<ArrowForward />} sx={{ mt: 1 }}>Browse all bills</Button>
              </Box>
            )}
          </>
        )}
      </Container>
    </Box>
  );
}

export default function SearchPage() {
  return (
    <Suspense fallback={<Container maxWidth="lg" sx={{ py: 4 }}><Box sx={{ display: 'flex', justifyContent: 'center', py: 8 }}><CircularProgress /></Box></Container>}>
      <SearchPageContent />
    </Suspense>
  );
}
