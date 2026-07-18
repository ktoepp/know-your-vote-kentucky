'use client';

import React, { useState, useEffect, useMemo, useDeferredValue } from 'react';
import Link from 'next/link';
import {
  Container,
  Typography,
  Box,
  Chip,
  CircularProgress,
  Alert,
  TextField,
  InputAdornment,
  Link as MuiLink,
  ToggleButton,
  ToggleButtonGroup,
} from '@mui/material';
import { AccountBalance, Cancel, Groups, House, Search } from '@mui/icons-material';
import type { KYLegislator } from '@/types/kentucky';
import { isKentuckyGovernor, memberCanonicalSlug, memberProfilePath, memberSlug } from '@/lib/ky-member-utils';
import { MemberCard } from '@/components/members/MemberCard';
import { CardGrid, CardGridItem } from '@/components/ui/CardGrid';
import DataFreshnessNote from '@/components/civic/DataFreshnessNote';
import { PaginatedSection } from '@/components/ui/PaginatedSection';

function sortLegislatorsByName(a: KYLegislator, b: KYLegislator) {
  const al = (a.last_name || '').trim().toLowerCase() || a.name.trim().toLowerCase();
  const bl = (b.last_name || '').trim().toLowerCase() || b.name.trim().toLowerCase();
  return al.localeCompare(bl);
}

const MEMBERS_PAGE_SIZE = 24;

/**
 * Skip layout/paint for offscreen cards (long sections). The intrinsic-size estimate keeps
 * scrollbar geometry stable until a card first renders; `auto` then remembers its real size.
 */
const CARD_ITEM_CONTENT_VISIBILITY_SX = {
  contentVisibility: 'auto',
  containIntrinsicSize: 'auto 460px',
} as const;

function ChamberSection({
  title,
  caption,
  icon,
  legislators,
  expandToItem,
}: {
  title: string;
  caption?: string;
  icon: React.ReactNode;
  legislators: KYLegislator[];
  /** Index (within `legislators`) that must be mounted — used for #hash deep links. */
  expandToItem?: number;
}) {
  if (legislators.length === 0) return null;
  return (
    <Box component="section" sx={{ mb: 4 }}>
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, mb: 2, flexWrap: 'wrap' }}>
        <Box sx={{ color: 'primary.main', display: 'flex', alignItems: 'center' }}>{icon}</Box>
        <Box>
          <Typography variant="h6" component="h2" fontWeight={700}>
            {title}
          </Typography>
          {caption && (
            <Typography variant="body2" color="text.secondary">
              {caption}
            </Typography>
          )}
        </Box>
        <Chip label={legislators.length} size="small" variant="outlined" sx={{ fontWeight: 600 }} />
      </Box>
      <PaginatedSection
        items={legislators}
        pageSize={MEMBERS_PAGE_SIZE}
        variant="loadmore"
        expandToItem={expandToItem}
      >
        {(visible) => (
          <CardGrid>
            {visible.map((leg) => (
              <CardGridItem key={leg.id} sx={CARD_ITEM_CONTENT_VISIBILITY_SX}>
                <MemberCard leg={leg} profileHref={memberProfilePath(leg)} />
              </CardGridItem>
            ))}
          </CardGrid>
        )}
      </PaginatedSection>
    </Box>
  );
}

export interface MembersBrowseProps {
  initialRoster: KYLegislator[];
}

export function MembersBrowse({ initialRoster }: MembersBrowseProps) {
  const legislatorRoster = initialRoster;
  const legislators = useMemo(() => legislatorRoster.filter((l) => l.active), [legislatorRoster]);
  const [searchQuery, setSearchQuery] = useState('');
  const [chamberFilter, setChamberFilter] = useState<'all' | 'governor' | 'house' | 'senate'>('all');
  // Deferred: the TextField updates immediately; re-filtering the card grid happens
  // in an interruptible background render, so typing stays responsive.
  const deferredQuery = useDeferredValue(searchQuery);

  const legislatorsScoped = useMemo(() => {
    if (chamberFilter === 'governor') return legislators.filter(isKentuckyGovernor);
    if (chamberFilter === 'house') return legislators.filter((l) => l.chamber === 'house');
    if (chamberFilter === 'senate') return legislators.filter((l) => l.chamber === 'senate');
    return legislators;
  }, [legislators, chamberFilter]);

  const filtered = useMemo(() => {
    const q = deferredQuery.toLowerCase();
    const matched = q
      ? legislatorsScoped.filter(
          (leg) => leg.name?.toLowerCase().includes(q) || leg.district?.toLowerCase().includes(q),
        )
      : [...legislatorsScoped];
    return matched.sort(sortLegislatorsByName);
  }, [legislatorsScoped, deferredQuery]);

  const { executiveLegislators, houseLegislators, senateLegislators } = useMemo(
    () => ({
      executiveLegislators: filtered.filter((l) => isKentuckyGovernor(l) || l.chamber == null),
      houseLegislators: filtered.filter((l) => l.chamber === 'house'),
      senateLegislators: filtered.filter((l) => l.chamber === 'senate'),
    }),
    [filtered],
  );

  // Deep links (/members#slug): read the hash once after mount (client-only, so SSR markup
  // stays hydration-safe), expand whichever section holds the target so the card actually
  // mounts (it may sit past the first load-more page), then scroll to it once.
  const [hashTarget, setHashTarget] = useState('');
  useEffect(() => {
    const hash = window.location.hash.replace(/^#/, '');
    if (hash) setHashTarget(hash);
  }, []);

  const hashMatch = useMemo(() => {
    if (!hashTarget) return null;
    // Match stored slug or the legacy name slug, so pre-042 links keep working.
    const matches = (l: KYLegislator) =>
      memberCanonicalSlug(l) === hashTarget || memberSlug(l.name || l.id) === hashTarget;
    const executive = executiveLegislators.findIndex(matches);
    const house = houseLegislators.findIndex(matches);
    const senate = senateLegislators.findIndex(matches);
    const found =
      (executive >= 0 && executiveLegislators[executive]) ||
      (house >= 0 && houseLegislators[house]) ||
      (senate >= 0 && senateLegislators[senate]) ||
      null;
    // Card DOM ids use the canonical slug; a legacy-alias hash must scroll to that id.
    return { executive, house, senate, elementId: found ? memberCanonicalSlug(found) : hashTarget };
  }, [hashTarget, executiveLegislators, houseLegislators, senateLegislators]);

  const hashElementId = hashMatch?.elementId ?? '';
  const hashScrolledRef = React.useRef(false);
  useEffect(() => {
    if (!hashElementId || hashScrolledRef.current) return;
    let cancelled = false;
    let attempts = 0;
    // Poll a few frames: the expanded section commits on a later render than this effect.
    const tryScroll = () => {
      if (cancelled) return;
      const target = document.getElementById(hashElementId);
      if (target) {
        hashScrolledRef.current = true;
        target.scrollIntoView({ behavior: 'smooth', block: 'start' });
        return;
      }
      if (++attempts < 90) requestAnimationFrame(tryScroll);
    };
    requestAnimationFrame(tryScroll);
    return () => {
      cancelled = true;
    };
  }, [hashElementId]);

  return (
    <Box sx={{ minHeight: '100vh', bgcolor: 'background.default' }}>
      <Container maxWidth="lg" sx={{ py: 4 }}>
        <Box sx={{ textAlign: 'center', mb: 4 }}>
          <Typography variant="h4" component="h1" fontWeight={700} gutterBottom>
            Members
          </Typography>
          <Typography variant="body1" color="text.secondary">
            Browse all current members of the Kentucky General Assembly.{' '}
            <MuiLink component={Link} href="/members/map" fontWeight={600}>
              Use the district map
            </MuiLink>{' '}
            to find your representatives by address.
          </Typography>
        </Box>

        <Box
          sx={{
            display: 'flex',
            flexDirection: { xs: 'column', sm: 'row' },
            alignItems: { xs: 'flex-start', sm: 'center' },
            gap: 2,
            mb: 2,
            flexWrap: 'wrap',
          }}
        >
          <ToggleButtonGroup
            value={chamberFilter}
            exclusive
            size="small"
            onChange={(_, v) => {
              if (v !== null) setChamberFilter(v);
            }}
            aria-label="Filter by chamber"
          >
            <ToggleButton value="all">All</ToggleButton>
            <ToggleButton value="house">House</ToggleButton>
            <ToggleButton value="senate">Senate</ToggleButton>
          </ToggleButtonGroup>
          <TextField
            placeholder="Search by name or district…"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            InputProps={{
              startAdornment: (
                <InputAdornment position="start">
                  <Search sx={{ fontSize: 18 }} />
                </InputAdornment>
              ),
            }}
            size="small"
            sx={{ width: { xs: '100%', sm: 260 } }}
          />
        </Box>

        {(chamberFilter !== 'all' || searchQuery) && (
          <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.75, mb: 2, alignItems: 'center' }}>
            <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 600, mr: 0.5 }}>
              Active filters:
            </Typography>
            {chamberFilter !== 'all' && (
              <Chip
                label={chamberFilter === 'house' ? 'House' : 'Senate'}
                size="small"
                onDelete={() => setChamberFilter('all')}
                deleteIcon={<Cancel />}
                color="primary"
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
                setSearchQuery('');
              }}
              variant="outlined"
              sx={{ ml: 0.5 }}
            />
          </Box>
        )}

        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 2 }}>
          <Groups sx={{ fontSize: '1.2rem', color: 'primary.main' }} />
          <Typography variant="body2" fontWeight={600}>
            {filtered.length} {filtered.length === 1 ? 'member' : 'members'}
          </Typography>
        </Box>

        {legislatorRoster.length === 0 ? (
          <Alert severity="error" sx={{ mb: 2 }}>
            Member data is currently unavailable. Try again shortly.
          </Alert>
        ) : filtered.length === 0 ? (
          <Box
            sx={{
              p: 6,
              textAlign: 'center',
              borderRadius: 2,
              border: '1px solid',
              borderColor: 'divider',
              bgcolor: 'background.paper',
            }}
          >
            <Groups sx={{ fontSize: 48, color: 'text.disabled', mb: 2 }} />
            <Typography variant="h6" color="text.secondary" gutterBottom>
              No legislators found
            </Typography>
            <Typography variant="body2" color="text.secondary">
              Try adjusting your filters.
            </Typography>
          </Box>
        ) : chamberFilter === 'all' ? (
          <Box>
            {executiveLegislators.length > 0 && (
              <ChamberSection
                title="Governor's office"
                caption="Governor, Lieutenant Governor, and other statewide executive officials"
                icon={<AccountBalance sx={{ fontSize: 28 }} />}
                legislators={executiveLegislators}
                expandToItem={hashMatch && hashMatch.executive >= 0 ? hashMatch.executive : undefined}
              />
            )}
            <ChamberSection
              title="House of Representatives"
              icon={<House sx={{ fontSize: 28 }} />}
              legislators={houseLegislators}
              expandToItem={hashMatch && hashMatch.house >= 0 ? hashMatch.house : undefined}
            />
            <ChamberSection
              title="Senate"
              icon={<Groups sx={{ fontSize: 28 }} />}
              legislators={senateLegislators}
              expandToItem={hashMatch && hashMatch.senate >= 0 ? hashMatch.senate : undefined}
            />
          </Box>
        ) : (
          <PaginatedSection
            items={filtered}
            pageSize={MEMBERS_PAGE_SIZE}
            resetKey={`${chamberFilter}|${deferredQuery}`}
            variant="loadmore"
          >
            {(visible) => (
              <CardGrid>
                {visible.map((leg) => (
                  <CardGridItem key={leg.id} sx={CARD_ITEM_CONTENT_VISIBILITY_SX}>
                    <MemberCard leg={leg} profileHref={memberProfilePath(leg)} />
                  </CardGridItem>
                ))}
              </CardGrid>
            )}
          </PaginatedSection>
        )}

        <DataFreshnessNote variant="page" source="legislators" />
      </Container>
    </Box>
  );
}
