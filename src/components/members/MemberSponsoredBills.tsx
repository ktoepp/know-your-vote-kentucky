'use client';

import React, { useMemo, useState } from 'react';
import {
  Box,
  FormControl,
  FormControlLabel,
  IconButton,
  InputAdornment,
  InputLabel,
  MenuItem,
  Select,
  Switch,
  TextField,
  Tooltip,
  Typography,
} from '@mui/material';
import { ArrowDownward, ArrowUpward, Search } from '@mui/icons-material';
import type { KYLegislator } from '@/types/kentucky';
import type { MemberSponsoredBill } from '@/lib/member-profile-data';
import { KYBillCard } from '@/components/bills/KYBillCard';
import { CardGrid, CardGridItem } from '@/components/ui/CardGrid';
import { PaginatedSection } from '@/components/ui/PaginatedSection';
import { billMatchesBrowseStatusFilter, compareKyBills, type KyBillSortKey } from '@/lib/bill-display';
import { KY_BILL_SORT_OPTIONS, defaultDirForKyBillSort } from '@/lib/ky-bills-browse-url';

const STATUS_OPTIONS: { value: string; label: string }[] = [
  { value: 'all', label: 'All statuses' },
  { value: 'introduced', label: 'Introduced' },
  { value: 'in_committee', label: 'In committee' },
  { value: 'passed_one_chamber', label: 'Passed one chamber' },
  { value: 'passed', label: 'Passed' },
  { value: 'signed', label: 'Signed' },
  { value: 'vetoed', label: 'Vetoed' },
];

/**
 * Sponsored-bills list for a member profile, mirroring the `/bills` browse grid:
 * 3-col card grid with topic / status / sort filters, plus a show/hide co-sponsored toggle.
 * Filtering is client-side over the member's (small) sponsored set — no URL sync.
 */
export function MemberSponsoredBills({
  entries,
  legislatorRoster,
  sessionSelector,
}: {
  entries: MemberSponsoredBill[];
  legislatorRoster: KYLegislator[];
  /** Shared legislative-session dropdown (owned by the profile view); rendered beside the co-sponsored toggle. */
  sessionSelector?: React.ReactNode;
}) {
  const [search, setSearch] = useState('');
  const [includeCosponsored, setIncludeCosponsored] = useState(true);
  const [statusFilter, setStatusFilter] = useState('all');
  const [topicFilter, setTopicFilter] = useState('');
  const [sortBy, setSortBy] = useState<KyBillSortKey>('last_action_date');
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('desc');
  const normalizedSearch = search.trim().toLowerCase();

  const cosponsoredCount = useMemo(
    () => entries.filter((e) => e.role === 'cosponsor').length,
    [entries],
  );

  const topicOptions = useMemo(() => {
    const set = new Set<string>();
    for (const e of entries) for (const t of e.bill.topics ?? []) set.add(t);
    return [...set].sort((a, b) => a.localeCompare(b));
  }, [entries]);

  const visible = useMemo(() => {
    let list = entries;
    if (!includeCosponsored) list = list.filter((e) => e.role === 'primary');
    if (statusFilter !== 'all') list = list.filter((e) => billMatchesBrowseStatusFilter(e.bill, statusFilter));
    if (topicFilter) list = list.filter((e) => e.bill.topics?.includes(topicFilter));
    if (normalizedSearch) {
      list = list.filter((e) =>
        [e.bill.bill_number, e.bill.title]
          .filter(Boolean)
          .join(' ')
          .toLowerCase()
          .includes(normalizedSearch),
      );
    }
    return [...list].sort((a, b) => {
      const c = compareKyBills(a.bill, b.bill, sortBy);
      return sortDir === 'asc' ? c : -c;
    });
  }, [entries, includeCosponsored, statusFilter, topicFilter, normalizedSearch, sortBy, sortDir]);

  const billsWord = visible.length === 1 ? 'bill' : 'bills';

  return (
    <Box>
      {/* Filter bar — search, co-sponsored toggle, session, and topic/status/sort all flow in one wrapping row */}
      <Box
        role="region"
        aria-label="Sponsored bill filters"
        sx={{
          display: 'flex',
          alignItems: 'center',
          gap: 1.5,
          mb: 2,
          flexWrap: 'wrap',
        }}
      >
        <TextField
          size="small"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search bills by number or title"
          aria-label="Search sponsored bills"
          sx={{ width: { xs: '100%', sm: 208 } }}
          InputProps={{
            startAdornment: (
              <InputAdornment position="start">
                <Search sx={{ fontSize: 18, color: 'text.secondary' }} aria-hidden />
              </InputAdornment>
            ),
          }}
        />
        {cosponsoredCount > 0 && (
          <FormControlLabel
            control={
              <Switch
                checked={includeCosponsored}
                onChange={(e) => setIncludeCosponsored(e.target.checked)}
                size="small"
              />
            }
            label={`Show co-sponsored (${cosponsoredCount})`}
            sx={{ m: 0 }}
          />
        )}
        {sessionSelector}
        {topicOptions.length > 0 && (
          <FormControl size="small" sx={{ minWidth: 150 }}>
            <InputLabel id="member-bills-topic-label">Topic</InputLabel>
            <Select
              labelId="member-bills-topic-label"
              label="Topic"
              value={topicFilter}
              onChange={(e) => setTopicFilter(e.target.value)}
            >
              <MenuItem value="">All topics</MenuItem>
              {topicOptions.map((t) => (
                <MenuItem key={t} value={t}>
                  {t}
                </MenuItem>
              ))}
            </Select>
          </FormControl>
        )}
        <FormControl size="small" sx={{ minWidth: 145 }}>
          <InputLabel id="member-bills-status-label">Status</InputLabel>
          <Select
            labelId="member-bills-status-label"
            label="Status"
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
          >
            {STATUS_OPTIONS.map((opt) => (
              <MenuItem key={opt.value} value={opt.value}>
                {opt.label}
              </MenuItem>
            ))}
          </Select>
        </FormControl>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.25 }}>
          <FormControl size="small" sx={{ minWidth: 150 }}>
            <InputLabel id="member-bills-sort-label">Sort by</InputLabel>
            <Select
              labelId="member-bills-sort-label"
              label="Sort by"
              value={sortBy}
              onChange={(e) => {
                const key = e.target.value as KyBillSortKey;
                setSortBy(key);
                setSortDir(defaultDirForKyBillSort(key));
              }}
            >
              {KY_BILL_SORT_OPTIONS.map((opt) => (
                <MenuItem key={opt.value} value={opt.value}>
                  {opt.label}
                </MenuItem>
              ))}
            </Select>
          </FormControl>
          <Tooltip title={sortDir === 'desc' ? 'Descending. Select to sort ascending.' : 'Ascending. Select to sort descending.'}>
            <IconButton
              size="small"
              aria-label={sortDir === 'desc' ? 'Sort descending' : 'Sort ascending'}
              onClick={() => setSortDir((d) => (d === 'desc' ? 'asc' : 'desc'))}
              sx={{ border: '1px solid', borderColor: 'divider', borderRadius: 1 }}
            >
              {sortDir === 'desc' ? <ArrowDownward fontSize="small" /> : <ArrowUpward fontSize="small" />}
            </IconButton>
          </Tooltip>
        </Box>
      </Box>

      <Typography variant="body2" fontWeight={600} sx={{ mb: 2 }}>
        {visible.length.toLocaleString()} {billsWord}
        {visible.length !== entries.length ? ` of ${entries.length.toLocaleString()}` : ''}
      </Typography>

      {visible.length === 0 ? (
        <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
          No sponsored bills match these filters.
        </Typography>
      ) : (
        <PaginatedSection
          items={visible}
          pageSize={12}
          variant="loadmore"
          resetKey={`${includeCosponsored}|${statusFilter}|${topicFilter}|${sortBy}|${sortDir}|${normalizedSearch}`}
        >
          {(page) => (
            <CardGrid>
              {page.map((e) => (
                <CardGridItem key={e.bill.id}>
                  <KYBillCard bill={e.bill} legislators={legislatorRoster} />
                </CardGridItem>
              ))}
            </CardGrid>
          )}
        </PaginatedSection>
      )}
    </Box>
  );
}
