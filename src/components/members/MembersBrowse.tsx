'use client';

import React, { useState, useEffect, useMemo, useDeferredValue } from 'react';
import Link from 'next/link';
import {
  Container,
  Typography,
  Box,
  Chip,
  Alert,
  TextField,
  InputAdornment,
  MenuItem,
  Link as MuiLink,
  ToggleButton,
  ToggleButtonGroup,
} from '@mui/material';
import { ArrowForward, Cancel, Groups, Search } from '@mui/icons-material';
import type { KYLegislator } from '@/types/kentucky';
import { formatPartyLabel, formatPartyLetterAbbrev } from '@/lib/bill-display';
import { isKentuckyGovernor, memberCanonicalSlug, memberProfilePath, memberSlug } from '@/lib/ky-member-utils';
import { MemberCard } from '@/components/members/MemberCard';
import { CardGrid, CardGridItem } from '@/components/ui/CardGrid';
import DataFreshnessNote from '@/components/civic/DataFreshnessNote';
import { CHAMBER_TOGGLE_GROUP_SX } from '@/components/civic/GaChamberFilterBar';
import { PaginatedSection } from '@/components/ui/PaginatedSection';

function sortLegislatorsByName(a: KYLegislator, b: KYLegislator) {
  const al = (a.last_name || '').trim().toLowerCase() || a.name.trim().toLowerCase();
  const bl = (b.last_name || '').trim().toLowerCase() || b.name.trim().toLowerCase();
  return al.localeCompare(bl);
}

const MEMBERS_PAGE_SIZE = 24;

/** Stable ids so the chamber jump tiles can anchor-scroll to each list. */
const HOUSE_SECTION_ID = 'members-house';
const SENATE_SECTION_ID = 'members-senate';

/**
 * Skip layout/paint for offscreen cards (long sections). The intrinsic-size estimate keeps
 * scrollbar geometry stable until a card first renders; `auto` then remembers its real size.
 */
const CARD_ITEM_CONTENT_VISIBILITY_SX = {
  contentVisibility: 'auto',
  containIntrinsicSize: 'auto 460px',
} as const;

/**
 * Jump-nav tile for a chamber — fills the space the Governor's-office section used to occupy.
 * Renders as an in-page anchor link (native `#id` scroll, keyboard-focusable, works without JS)
 * down to that chamber's list below. When the current filters leave a chamber with no matches,
 * the tile is a dimmed, non-interactive card instead of a dead link.
 */
function ChamberJumpTile({ chamber, count }: { chamber: 'house' | 'senate'; count: number }) {
  const isHouse = chamber === 'house';
  const label = isHouse ? 'House of Representatives' : 'Senate';
  const noun = isHouse ? 'representatives' : 'senators';
  const targetId = isHouse ? HOUSE_SECTION_ID : SENATE_SECTION_ID;
  const disabled = count === 0;
  const countLabel = disabled
    ? 'No matching members'
    : `${count} ${count === 1 ? noun.slice(0, -1) : noun}`;

  const inner = (
    <>
      <Box>
        <Typography variant="subtitle1" fontWeight={700} sx={{ lineHeight: 1.2 }}>
          {label}
        </Typography>
        <Typography variant="body2" color="text.secondary">
          {countLabel}
        </Typography>
      </Box>
      {!disabled && (
        <Box
          sx={{
            display: 'flex',
            alignItems: 'center',
            gap: 0.5,
            color: 'primary.main',
            fontWeight: 600,
            fontSize: '0.875rem',
            flexShrink: 0,
          }}
        >
          View list
          <ArrowForward sx={{ fontSize: 18 }} aria-hidden />
        </Box>
      )}
    </>
  );

  const baseSx = {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 2,
    p: { xs: 2, sm: 2.5 },
    borderRadius: 2,
    border: '1px solid',
    borderColor: 'divider',
    bgcolor: 'background.paper',
    height: '100%',
  } as const;

  if (disabled) {
    return <Box sx={{ ...baseSx, opacity: 0.6 }}>{inner}</Box>;
  }

  return (
    <Box
      component="a"
      href={`#${targetId}`}
      aria-label={`Jump to the ${label} list, ${countLabel}`}
      sx={{
        ...baseSx,
        color: 'inherit',
        textDecoration: 'none',
        transition: 'border-color 0.2s ease, box-shadow 0.2s ease',
        '&:hover': {
          borderColor: 'primary.light',
          boxShadow: '0 4px 20px rgba(37, 99, 235, 0.08)',
        },
      }}
    >
      {inner}
    </Box>
  );
}

function ChamberSection({
  title,
  caption,
  legislators,
  sectionId,
  expandToItem,
}: {
  title: string;
  caption?: string;
  legislators: KYLegislator[];
  /** DOM id used as the anchor target for the chamber jump tiles. */
  sectionId?: string;
  /** Index (within `legislators`) that must be mounted — used for #hash deep links. */
  expandToItem?: number;
}) {
  if (legislators.length === 0) return null;
  return (
    <Box component="section" id={sectionId} sx={{ mb: 4, scrollMarginTop: 96 }}>
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, mb: 2, flexWrap: 'wrap' }}>
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

/** Party abbrevs kept in a familiar order (majority-first for KY), unknowns trailing alpha. */
const PARTY_DISPLAY_ORDER = ['R', 'D', 'I', 'L', 'G'];

export function MembersBrowse({ initialRoster }: MembersBrowseProps) {
  const legislatorRoster = initialRoster;
  // /members browses the General Assembly only — executive officials (Governor's office)
  // ride along in the shared roster but are not listed here.
  const legislators = useMemo(
    () =>
      legislatorRoster.filter(
        (l) => l.active && !isKentuckyGovernor(l) && (l.chamber === 'house' || l.chamber === 'senate'),
      ),
    [legislatorRoster],
  );
  const [searchQuery, setSearchQuery] = useState('');
  const [chamberFilter, setChamberFilter] = useState<'all' | 'house' | 'senate'>('all');
  const [partyFilter, setPartyFilter] = useState('');
  // Deferred: the TextField updates immediately; re-filtering the card grid happens
  // in an interruptible background render, so typing stays responsive.
  const deferredQuery = useDeferredValue(searchQuery);

  // Distinct parties actually present, in a familiar order — the party filter only appears
  // when there is more than one party to choose between.
  const partyOptions = useMemo(() => {
    const present = new Set<string>();
    for (const l of legislators) {
      const abbrev = formatPartyLetterAbbrev(l.party);
      if (abbrev) present.add(abbrev);
    }
    return Array.from(present).sort((a, b) => {
      const ia = PARTY_DISPLAY_ORDER.indexOf(a);
      const ib = PARTY_DISPLAY_ORDER.indexOf(b);
      return (ia === -1 ? 99 : ia) - (ib === -1 ? 99 : ib) || a.localeCompare(b);
    });
  }, [legislators]);

  const legislatorsScoped = useMemo(() => {
    let list = legislators;
    if (chamberFilter === 'house') list = list.filter((l) => l.chamber === 'house');
    else if (chamberFilter === 'senate') list = list.filter((l) => l.chamber === 'senate');
    if (partyFilter) list = list.filter((l) => formatPartyLetterAbbrev(l.party) === partyFilter);
    return list;
  }, [legislators, chamberFilter, partyFilter]);

  const filtered = useMemo(() => {
    const q = deferredQuery.toLowerCase();
    const matched = q
      ? legislatorsScoped.filter(
          (leg) => leg.name?.toLowerCase().includes(q) || leg.district?.toLowerCase().includes(q),
        )
      : [...legislatorsScoped];
    return matched.sort(sortLegislatorsByName);
  }, [legislatorsScoped, deferredQuery]);

  const { houseLegislators, senateLegislators } = useMemo(
    () => ({
      houseLegislators: filtered.filter((l) => l.chamber === 'house'),
      senateLegislators: filtered.filter((l) => l.chamber === 'senate'),
    }),
    [filtered],
  );

  const hasActiveFilters = chamberFilter !== 'all' || Boolean(partyFilter) || Boolean(searchQuery);

  // Deep links (/members#slug): read the hash once after mount (client-only, so SSR markup
  // stays hydration-safe), expand whichever section holds the target so the card actually
  // mounts (it may sit past the first load-more page), then scroll to it once.
  const [hashTarget, setHashTarget] = useState('');
  useEffect(() => {
    const hash = window.location.hash.replace(/^#/, '');
    // The chamber jump tiles use these ids; they scroll natively and need no JS assist.
    if (hash && hash !== HOUSE_SECTION_ID && hash !== SENATE_SECTION_ID) setHashTarget(hash);
  }, []);

  const hashMatch = useMemo(() => {
    if (!hashTarget) return null;
    // Match stored slug or the legacy name slug, so pre-042 links keep working.
    const matches = (l: KYLegislator) =>
      memberCanonicalSlug(l) === hashTarget || memberSlug(l.name || l.id) === hashTarget;
    const house = houseLegislators.findIndex(matches);
    const senate = senateLegislators.findIndex(matches);
    const found =
      (house >= 0 && houseLegislators[house]) ||
      (senate >= 0 && senateLegislators[senate]) ||
      null;
    // Card DOM ids use the canonical slug; a legacy-alias hash must scroll to that id.
    return { house, senate, elementId: found ? memberCanonicalSlug(found) : hashTarget };
  }, [hashTarget, houseLegislators, senateLegislators]);

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

        {/* Chamber jump tiles — only in the default two-section view, where both anchors exist. */}
        {legislatorRoster.length > 0 && chamberFilter === 'all' && filtered.length > 0 && (
          <Box
            sx={{
              display: 'grid',
              gridTemplateColumns: { xs: '1fr', sm: '1fr 1fr' },
              gap: 2,
              mb: 4,
            }}
          >
            <ChamberJumpTile chamber="house" count={houseLegislators.length} />
            <ChamberJumpTile chamber="senate" count={senateLegislators.length} />
          </Box>
        )}

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
            sx={CHAMBER_TOGGLE_GROUP_SX}
          >
            <ToggleButton value="all">All</ToggleButton>
            <ToggleButton value="house">House</ToggleButton>
            <ToggleButton value="senate">Senate</ToggleButton>
          </ToggleButtonGroup>
          {partyOptions.length > 1 && (
            <TextField
              select
              label="Party"
              value={partyFilter}
              onChange={(e) => setPartyFilter(e.target.value)}
              size="small"
              sx={{ minWidth: 150 }}
            >
              <MenuItem value="">All parties</MenuItem>
              {partyOptions.map((p) => (
                <MenuItem key={p} value={p}>
                  {formatPartyLabel(p)}
                </MenuItem>
              ))}
            </TextField>
          )}
          <TextField
            placeholder="Search by name or district…"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            InputProps={{
              startAdornment: (
                <InputAdornment position="start">
                  <Search sx={{ fontSize: 18, color: 'text.secondary' }} />
                </InputAdornment>
              ),
            }}
            size="small"
            sx={{ width: { xs: '100%', sm: 260 } }}
          />
        </Box>

        {hasActiveFilters && (
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
            {partyFilter && (
              <Chip
                label={formatPartyLabel(partyFilter)}
                size="small"
                onDelete={() => setPartyFilter('')}
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
                setPartyFilter('');
                setSearchQuery('');
              }}
              variant="outlined"
              sx={{ ml: 0.5 }}
            />
          </Box>
        )}

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
            <ChamberSection
              title="House of Representatives"
              legislators={houseLegislators}
              sectionId={HOUSE_SECTION_ID}
              expandToItem={hashMatch && hashMatch.house >= 0 ? hashMatch.house : undefined}
            />
            <ChamberSection
              title="Senate"
              legislators={senateLegislators}
              sectionId={SENATE_SECTION_ID}
              expandToItem={hashMatch && hashMatch.senate >= 0 ? hashMatch.senate : undefined}
            />
          </Box>
        ) : (
          <PaginatedSection
            items={filtered}
            pageSize={MEMBERS_PAGE_SIZE}
            resetKey={`${chamberFilter}|${partyFilter}|${deferredQuery}`}
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
