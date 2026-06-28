'use client';

import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import Link from 'next/link';
import {
  Alert,
  Box,
  Button,
  Chip,
  CircularProgress,
  Container,
  FormControl,
  IconButton,
  InputAdornment,
  Link as MuiLink,
  TextField,
  ToggleButton,
  ToggleButtonGroup,
  Typography,
} from '@mui/material';
import {
  Bookmark,
  BookmarkBorder,
  CalendarMonth,
  Cancel,
  Clear,
  Search,
  ViewModule,
  ViewList,
} from '@mui/icons-material';
import { useFollowedCommittees } from '@/lib/use-followed-committees';
import { supabase } from '@/app/lib/supabaseClient';
import DataFreshnessNote from '@/components/civic/DataFreshnessNote';
import { GaChamberFilterBar } from '@/components/civic/GaChamberFilterBar';
import { EmptyState } from '@/components/civic/EmptyState';
import { AgendaSearchResults } from '@/components/committees/AgendaSearchResults';
import { CommitteeMeetingCard } from '@/components/committees/CommitteeMeetingCard';
import { MeetingsCalendar } from '@/components/committees/MeetingsCalendar';
import { CardGrid, CardGridItem } from '@/components/ui/CardGrid';
import { PaginatedSection } from '@/components/ui/PaginatedSection';
import { withTimeout } from '@/lib/async-utils';
import { searchKyCommitteeAgendaItems } from '@/lib/ky-committee-search';
import { KY_MEETING_BROWSE_SELECT } from '@/lib/ky-ga-browse-select';
import { KY_SESSIONS } from '@/lib/ky-sessions';
import {
  gaChamberFilterLabel,
  kyTodayIso,
  LRC_LEGISLATIVE_CALENDAR_URL,
  type GaChamberFilter,
} from '@/lib/ky-committee-display';
import { useGaMeetingsBrowseUrlState } from '@/lib/ky-ga-browse-url';
import type {
  KYCommitteeAgendaItemWithMeeting,
  KYCommitteeMeetingBrowse,
} from '@/types/kentucky';

const MEETINGS_PAGE_SIZE = 24;

export interface MeetingsBrowseProps {
  /** Preloaded meeting window (server); omitted when URL has agenda search `q`. */
  initialMeetings?: KYCommitteeMeetingBrowse[];
}

export function MeetingsBrowse({ initialMeetings }: MeetingsBrowseProps) {
  const {
    chamber,
    setChamber,
    range,
    setRange,
    agendaQuery,
    setAgendaQuery,
    followsMe,
    setFollowsMe,
    view,
    setView,
    month,
    setMonth,
  } = useGaMeetingsBrowseUrlState();
  const isCalendar = view === 'calendar';
  const [agendaInput, setAgendaInput] = useState(agendaQuery);
  const {
    followedCommitteeIds,
    authed,
    ready: followsReady,
    toggleFollow,
  } = useFollowedCommittees();
  const effectiveFollowsMe = authed && followsMe;
  const followsAwaiting = effectiveFollowsMe && !followsReady;

  const [meetings, setMeetings] = useState<KYCommitteeMeetingBrowse[]>(initialMeetings ?? []);
  const [agendaHits, setAgendaHits] = useState<KYCommitteeAgendaItemWithMeeting[]>([]);
  const [loading, setLoading] = useState(!initialMeetings);
  const [error, setError] = useState<string | null>(null);
  const skipInitialMeetingsLoadRef = useRef(Boolean(initialMeetings?.length));

  useEffect(() => {
    setAgendaInput(agendaQuery);
  }, [agendaQuery]);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      if (!supabase) {
        setMeetings([]);
        setAgendaHits([]);
        return;
      }

      if (agendaQuery.trim()) {
        const hits = await withTimeout(
          searchKyCommitteeAgendaItems(supabase, agendaQuery, { limit: 100 }),
          30_000,
          'Agenda search timed out.',
        );
        setAgendaHits(hits);
        setMeetings([]);
        return;
      }

      const today = kyTodayIso();
      const from = new Date(`${today}T12:00:00`);
      from.setDate(from.getDate() - 30);
      // Reach back to the active/most-recent session start so the "Recent"
      // filter can surface the full session, not just the last 30 days.
      const sessionStart = new Date(`${KY_SESSIONS[0]!.start}T12:00:00`);
      if (sessionStart < from) from.setTime(sessionStart.getTime());
      const to = new Date(`${today}T12:00:00`);
      to.setDate(to.getDate() + 120);

      const { data, error: fetchError } = await withTimeout(
        supabase
          .from('ky_committee_meetings')
          .select(KY_MEETING_BROWSE_SELECT)
          .gte('meeting_date', from.toISOString().slice(0, 10))
          .lte('meeting_date', to.toISOString().slice(0, 10))
          .order('meeting_date', { ascending: true })
          .limit(500),
        30_000,
        'Loading meetings timed out.',
      );
      if (fetchError) throw fetchError;
      setMeetings((data as unknown as KYCommitteeMeetingBrowse[]) ?? []);
      setAgendaHits([]);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to load meetings');
    } finally {
      setLoading(false);
    }
  }, [agendaQuery]);

  useEffect(() => {
    if (skipInitialMeetingsLoadRef.current && !agendaQuery.trim()) {
      skipInitialMeetingsLoadRef.current = false;
      setLoading(false);
      return;
    }
    load();
  }, [load, agendaQuery]);

  const filteredMeetings = useMemo(() => {
    const today = kyTodayIso();
    return meetings.filter((m) => {
      if (range === 'upcoming' && m.meeting_date < today) return false;
      if (range === 'recent' && m.meeting_date >= today) return false;
      if (chamber && m.ky_committees?.chamber !== chamber) return false;
      if (
        effectiveFollowsMe &&
        !followedCommitteeIds.has(String(m.ky_committees?.id ?? ''))
      )
        return false;
      return true;
    });
  }, [meetings, chamber, range, effectiveFollowsMe, followedCommitteeIds]);

  // Calendar view: apply chamber + follows but NOT the upcoming/recent cutoff,
  // so navigating to past or future months both populate.
  const calendarMeetings = useMemo(() => {
    return meetings.filter((m) => {
      if (chamber && m.ky_committees?.chamber !== chamber) return false;
      if (
        effectiveFollowsMe &&
        !followedCommitteeIds.has(String(m.ky_committees?.id ?? ''))
      )
        return false;
      return true;
    });
  }, [meetings, chamber, effectiveFollowsMe, followedCommitteeIds]);

  const filteredAgenda = useMemo(() => {
    const today = kyTodayIso();
    return agendaHits.filter((item) => {
      const meeting = item.ky_committee_meetings;
      if (range === 'upcoming' && meeting?.meeting_date && meeting.meeting_date < today) return false;
      if (range === 'recent' && meeting?.meeting_date && meeting.meeting_date >= today) return false;
      if (chamber && meeting?.ky_committees?.chamber !== chamber) return false;
      if (
        effectiveFollowsMe &&
        !followedCommitteeIds.has(String(meeting?.ky_committees?.id ?? ''))
      )
        return false;
      return true;
    });
  }, [agendaHits, chamber, range, effectiveFollowsMe, followedCommitteeIds]);

  const hasActiveFilters = isCalendar
    ? Boolean(chamber) || followsMe
    : Boolean(chamber) || range !== 'upcoming' || Boolean(agendaQuery) || followsMe;
  const isAgendaMode = Boolean(agendaQuery.trim());
  const resultCount = isAgendaMode ? filteredAgenda.length : filteredMeetings.length;
  const summary =
    resultCount === 1
      ? isAgendaMode
        ? '1 agenda line'
        : '1 meeting'
      : isAgendaMode
        ? `${resultCount.toLocaleString()} agenda lines`
        : `${resultCount.toLocaleString()} meetings`;

  const submitAgendaSearch = (e: React.FormEvent) => {
    e.preventDefault();
    setAgendaQuery(agendaInput);
  };

  return (
    <Box sx={{ minHeight: '100vh', bgcolor: 'background.default' }}>
      <Container maxWidth="lg" sx={{ py: 4 }}>
        <Box sx={{ textAlign: 'center', mb: 4 }}>
          <Typography variant="h4" component="h1" fontWeight={700} gutterBottom>
            Committee meetings
          </Typography>
          <Typography variant="body1" color="text.secondary">
            Scheduled General Assembly committee meetings from the Legislative Research Commission (LRC) legislative calendar.{' '}
            <MuiLink component={Link} href="/committees" fontWeight={600}>
              Committee directory
            </MuiLink>
            .
          </Typography>
        </Box>

        {!supabase && (
          <Alert severity="warning" sx={{ mb: 2 }}>
            Set <strong>NEXT_PUBLIC_SUPABASE_URL</strong> and <strong>NEXT_PUBLIC_SUPABASE_ANON_KEY</strong> in{' '}
            <code>.env.local</code> to load meetings.
          </Alert>
        )}

        {!isCalendar && (
        <Box
          component="form"
          onSubmit={submitAgendaSearch}
          sx={{ mb: 2, maxWidth: 560, mx: 'auto' }}
        >
          <TextField
            fullWidth
            size="small"
            placeholder="Search agenda text…"
            value={agendaInput}
            onChange={(e) => setAgendaInput(e.target.value)}
            inputProps={{ 'aria-label': 'Search agenda text' }}
            sx={{ '& .MuiInputBase-root': { minHeight: { xs: 44, sm: 'auto' } } }}
            InputProps={{
              startAdornment: (
                <InputAdornment position="start">
                  <Search sx={{ fontSize: 18 }} />
                </InputAdornment>
              ),
              endAdornment: agendaInput ? (
                <InputAdornment position="end">
                  <IconButton
                    size="small"
                    aria-label="Clear agenda search"
                    onClick={() => {
                      setAgendaInput('');
                      setAgendaQuery('');
                    }}
                  >
                    <Clear fontSize="small" />
                  </IconButton>
                </InputAdornment>
              ) : undefined,
            }}
          />
        </Box>
        )}

        <Box
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
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, flexWrap: 'wrap' }}>
            <ToggleButtonGroup
              value={view}
              exclusive
              size="small"
              onChange={(_, v) => {
                if (v !== null) setView(v);
              }}
              aria-label="Switch between list and calendar view"
              sx={{ '& .MuiToggleButtonGroup-grouped': { minHeight: { xs: 44, sm: 'auto' } } }}
            >
              <ToggleButton value="list" aria-label="List view">
                <ViewList fontSize="small" aria-hidden sx={{ mr: 0.5 }} />
                List
              </ToggleButton>
              <ToggleButton value="calendar" aria-label="Calendar view">
                <ViewModule fontSize="small" aria-hidden sx={{ mr: 0.5 }} />
                Calendar
              </ToggleButton>
            </ToggleButtonGroup>

            {!isCalendar && (
            <ToggleButtonGroup
              value={range}
              exclusive
              size="small"
              onChange={(_, v) => {
                if (v !== null) setRange(v);
              }}
              aria-label="Filter by date range"
              sx={{ '& .MuiToggleButtonGroup-grouped': { minHeight: { xs: 44, sm: 'auto' } } }}
            >
              <ToggleButton value="upcoming">Upcoming</ToggleButton>
              <ToggleButton value="recent">Recent</ToggleButton>
            </ToggleButtonGroup>
            )}

            {authed && (
              <Button
                size="small"
                variant={followsMe ? 'contained' : 'outlined'}
                startIcon={
                  followsMe ? (
                    <Bookmark fontSize="small" aria-hidden />
                  ) : (
                    <BookmarkBorder fontSize="small" aria-hidden />
                  )
                }
                onClick={() => setFollowsMe(!followsMe)}
                sx={{ borderRadius: 999, textTransform: 'none', px: 1.5 }}
                aria-pressed={followsMe}
              >
                {followsMe ? 'Following committees' : 'Your committees'}
              </Button>
            )}
          </Box>

          <GaChamberFilterBar value={chamber} onChange={setChamber} />
        </Box>

        {hasActiveFilters && (
          <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.75, mb: 2, alignItems: 'center' }}>
            <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 600, mr: 0.5 }}>
              Active filters:
            </Typography>
            {followsMe && (
              <Chip
                label="Following committees"
                size="small"
                onDelete={() => setFollowsMe(false)}
                deleteIcon={<Cancel />}
                color="primary"
                variant="outlined"
              />
            )}
            {!isCalendar && agendaQuery && (
              <Chip
                label={`Agenda: "${agendaQuery}"`}
                size="small"
                onDelete={() => {
                  setAgendaInput('');
                  setAgendaQuery('');
                }}
                deleteIcon={<Cancel />}
                color="primary"
                variant="outlined"
              />
            )}
            {!isCalendar && range !== 'upcoming' && (
              <Chip
                label="Recent"
                size="small"
                onDelete={() => setRange('upcoming')}
                deleteIcon={<Cancel />}
                color="primary"
                variant="outlined"
              />
            )}
            {chamber && (
              <Chip
                label={gaChamberFilterLabel(chamber)}
                size="small"
                onDelete={() => setChamber('' as GaChamberFilter)}
                deleteIcon={<Cancel />}
                color="primary"
                variant="outlined"
              />
            )}
            <Chip
              label="Clear all"
              size="small"
              onClick={() => {
                setRange('upcoming');
                setChamber('');
                setAgendaInput('');
                setAgendaQuery('');
                setFollowsMe(false);
              }}
              variant="outlined"
              sx={{ ml: 0.5 }}
            />
          </Box>
        )}

        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 2 }}>
          <CalendarMonth sx={{ fontSize: '1.2rem', color: 'primary.main' }} aria-hidden />
          <Typography variant="body2" fontWeight={600}>
            {loading
              ? 'Loading…'
              : isCalendar
                ? 'Select a day to see meetings, bills, and votes'
                : summary}
          </Typography>
        </Box>

        {error && (
          <Alert severity="error" sx={{ mb: 3 }}>
            {error}
          </Alert>
        )}

        {followsMe && !authed && (
          <Alert severity="info" sx={{ mb: 2 }}>
            Log in to filter meetings by committees you follow.{' '}
            <Button component={Link} href="/auth/login?next=/meetings%3Ffollows%3Dme" size="small" sx={{ ml: 1 }}>
              Log in
            </Button>
          </Alert>
        )}

        {followsAwaiting ? (
          <Box sx={{ display: 'flex', justifyContent: 'center', py: 8 }} aria-busy="true" aria-label="Loading followed committees">
            <CircularProgress />
          </Box>
        ) : effectiveFollowsMe && followedCommitteeIds.size === 0 ? (
          <EmptyState
            message={
              <>
                You haven&rsquo;t followed any committees yet. Browse{' '}
                <MuiLink component={Link} href="/committees" fontWeight={600}>
                  committees
                </MuiLink>{' '}
                and select Follow on ones you want to track.
              </>
            }
          />
        ) : loading ? (
          <Box sx={{ display: 'flex', justifyContent: 'center', py: 8 }}>
            <CircularProgress />
          </Box>
        ) : isCalendar ? (
          <MeetingsCalendar
            meetings={calendarMeetings}
            month={month}
            onMonthChange={setMonth}
            followedCommitteeIds={authed ? followedCommitteeIds : new Set<string>()}
            onToggleFollow={authed ? toggleFollow : undefined}
          />
        ) : isAgendaMode ? (
          filteredAgenda.length === 0 ? (
            <EmptyState message="No agenda lines match your search. Try a bill number or keyword from the LRC calendar." />
          ) : (
            <AgendaSearchResults
              items={filteredAgenda}
              followedCommitteeIds={authed ? followedCommitteeIds : undefined}
              onToggleFollow={authed ? toggleFollow : undefined}
            />
          )
        ) : filteredMeetings.length === 0 ? (
          <EmptyState message="No committee meetings match your filters." />
        ) : (
          <PaginatedSection items={filteredMeetings} pageSize={MEETINGS_PAGE_SIZE} variant="loadmore">
            {(visible) => (
              <CardGrid>
                {visible.map((meeting) => (
                  <CardGridItem key={meeting.id}>
                    <CommitteeMeetingCard
                      meeting={meeting}
                      following={followedCommitteeIds.has(String(meeting.ky_committees?.id ?? ''))}
                      onToggleFollow={authed ? toggleFollow : undefined}
                    />
                  </CardGridItem>
                ))}
              </CardGrid>
            )}
          </PaginatedSection>
        )}

        <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mt: 4, textAlign: 'center' }}>
          Official source:{' '}
          <a href={LRC_LEGISLATIVE_CALENDAR_URL} target="_blank" rel="noopener noreferrer">
            LRC Legislative Calendar
          </a>
          {isAgendaMode && (
            <>
              {' · '}
              <MuiLink component={Link} href="/meetings">
                Meeting list
              </MuiLink>
            </>
          )}
        </Typography>

        <DataFreshnessNote variant="page" source="lrc-calendar" />
      </Container>
    </Box>
  );
}
