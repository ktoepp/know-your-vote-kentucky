'use client';

import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import Link from 'next/link';
import {
  Box,
  Chip,
  CircularProgress,
  Link as MuiLink,
  Typography,
  type SxProps,
  type Theme,
} from '@mui/material';
import { Gavel, HowToVote } from '@mui/icons-material';
import { supabase } from '@/app/lib/supabaseClient';
import { CommitteeMeetingCard } from '@/components/committees/CommitteeMeetingCard';
import { CalendarMonthGrid } from '@/components/ui/CalendarMonthGrid';
import { withTimeout } from '@/lib/async-utils';
import { formatCivicDate } from '@/lib/civic-date';
import { KY_COMMITTEE_AGENDA_ITEM_SELECT } from '@/lib/ky-ga-browse-select';
import {
  formatAgendaItemKind,
  normalizeKyGaAgendaLine,
} from '@/lib/ky-committee-display';
import { KY_SESSIONS } from '@/lib/ky-sessions';
import type { CalendarDayCell, CalendarMonth } from '@/lib/calendar-grid';
import type { KYCommitteeAgendaItem, KYCommitteeMeetingBrowse } from '@/types/kentucky';

/** A floor/chamber vote joined to its bill number for calendar display. */
interface CalendarVote {
  id: string;
  date: string;
  chamber: 'house' | 'senate' | null;
  passed: boolean | null;
  billId: string;
  billNumber: string | null;
}

interface VoteRow {
  id: string;
  bill_id: string;
  date: string | null;
  chamber: 'house' | 'senate' | null;
  passed: boolean | null;
}

const CHAMBER_DOT_COLOR: Record<string, string> = {
  house: 'var(--chamber-house)',
  senate: 'var(--chamber-senate)',
  joint: 'var(--primary)',
};

function chamberDotColor(chamber: string | null | undefined): string {
  return CHAMBER_DOT_COLOR[String(chamber ?? '').toLowerCase()] ?? '#94A3B8';
}

/** Session-derived decoration for a single calendar day. */
interface SessionDayInfo {
  vetoRecess: boolean;
  convene: boolean;
  sineDie: boolean;
}

function sessionInfoFor(iso: string): SessionDayInfo {
  let vetoRecess = false;
  let convene = false;
  let sineDie = false;
  for (const s of KY_SESSIONS) {
    if (s.start === iso) convene = true;
    const m = s.milestones;
    if (m?.sineDie === iso || (!m?.sineDie && s.end === iso)) sineDie = true;
    if (m?.vetoRecessStart && m.vetoRecessEnd && iso >= m.vetoRecessStart && iso < m.vetoRecessEnd) {
      vetoRecess = true;
    }
  }
  return { vetoRecess, convene, sineDie };
}

export interface MeetingsCalendarProps {
  /** Meetings already filtered (chamber/follows) by the parent browse component. */
  meetings: KYCommitteeMeetingBrowse[];
  month: CalendarMonth;
  onMonthChange: (next: CalendarMonth) => void;
  followedCommitteeIds: ReadonlySet<string>;
  onToggleFollow?: (committeeId: string) => void;
}

export function MeetingsCalendar({
  meetings,
  month,
  onMonthChange,
  followedCommitteeIds,
  onToggleFollow,
}: MeetingsCalendarProps) {
  const [selectedIso, setSelectedIso] = useState<string | null>(null);
  const [votes, setVotes] = useState<CalendarVote[]>([]);
  const [agendaByDay, setAgendaByDay] = useState<Record<string, KYCommitteeAgendaItem[] | 'loading'>>({});
  const detailHeadingRef = useRef<HTMLHeadingElement | null>(null);

  // Index meetings by their calendar date.
  const meetingsByDay = useMemo(() => {
    const map = new Map<string, KYCommitteeMeetingBrowse[]>();
    for (const m of meetings) {
      const list = map.get(m.meeting_date) ?? [];
      list.push(m);
      map.set(m.meeting_date, list);
    }
    return map;
  }, [meetings]);

  // Date window spanned by the loaded meetings — drives the votes fetch range.
  const voteWindow = useMemo(() => {
    if (meetings.length === 0) return null;
    let min = meetings[0]!.meeting_date;
    let max = meetings[0]!.meeting_date;
    for (const m of meetings) {
      if (m.meeting_date < min) min = m.meeting_date;
      if (m.meeting_date > max) max = m.meeting_date;
    }
    return { from: min, to: max };
  }, [meetings]);

  // Lazily fetch floor votes for the loaded window (calendar view only).
  useEffect(() => {
    if (!supabase || !voteWindow) {
      setVotes([]);
      return;
    }
    let cancelled = false;
    (async () => {
      try {
        const { data, error } = await withTimeout(
          supabase
            .from('ky_votes')
            .select('id, bill_id, date, chamber, passed')
            .not('date', 'is', null)
            .gte('date', voteWindow.from)
            .lte('date', voteWindow.to)
            .order('date', { ascending: true })
            .limit(2000),
          30_000,
          'Loading votes timed out.',
        );
        if (cancelled || error || !data) return;
        const rows = (data as VoteRow[]).filter(
          (r): r is VoteRow & { date: string } => Boolean(r.date),
        );

        // Resolve bill numbers for the distinct bills in one batched query —
        // ky_votes has no detectable FK embed to ky_bills, so join in app code.
        const billIds = Array.from(new Set(rows.map((r) => r.bill_id).filter(Boolean)));
        const billNumbers = new Map<string, string | null>();
        if (billIds.length > 0) {
          const { data: bills } = await withTimeout(
            supabase.from('ky_bills').select('id, bill_number').in('id', billIds),
            30_000,
            'Loading bill numbers timed out.',
          );
          for (const b of (bills as Array<{ id: string; bill_number: string | null }> | null) ?? []) {
            billNumbers.set(b.id, b.bill_number);
          }
        }
        if (cancelled) return;
        setVotes(
          rows.map((r) => ({
            id: r.id,
            date: r.date,
            chamber: r.chamber,
            passed: r.passed,
            billId: r.bill_id,
            billNumber: billNumbers.get(r.bill_id) ?? null,
          })),
        );
      } catch {
        if (!cancelled) setVotes([]);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [voteWindow]);

  const votesByDay = useMemo(() => {
    const map = new Map<string, CalendarVote[]>();
    for (const v of votes) {
      const list = map.get(v.date) ?? [];
      list.push(v);
      map.set(v.date, list);
    }
    return map;
  }, [votes]);

  // Lazily load agenda (bill) items for the selected day's meetings.
  useEffect(() => {
    if (!selectedIso || !supabase) return;
    if (agendaByDay[selectedIso] !== undefined) return; // cached or in-flight
    const dayMeetings = meetingsByDay.get(selectedIso) ?? [];
    const meetingIds = dayMeetings.map((m) => m.id);
    if (meetingIds.length === 0) {
      setAgendaByDay((prev) => ({ ...prev, [selectedIso]: [] }));
      return;
    }
    setAgendaByDay((prev) => ({ ...prev, [selectedIso]: 'loading' }));
    let cancelled = false;
    (async () => {
      try {
        const { data, error } = await withTimeout(
          supabase
            .from('ky_committee_agenda_items')
            .select(KY_COMMITTEE_AGENDA_ITEM_SELECT)
            .in('meeting_id', meetingIds)
            .order('sort_order', { ascending: true }),
          30_000,
          'Loading agenda timed out.',
        );
        if (cancelled) return;
        const items = (error || !data ? [] : (data as KYCommitteeAgendaItem[])).filter(
          (it) => it.item_kind === 'bill' || it.item_kind === 'resolution' || Boolean(it.bill_number),
        );
        setAgendaByDay((prev) => ({ ...prev, [selectedIso]: items }));
      } catch {
        if (!cancelled) setAgendaByDay((prev) => ({ ...prev, [selectedIso]: [] }));
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [selectedIso, meetingsByDay, agendaByDay]);

  // Move focus into the detail panel when a day is opened.
  useEffect(() => {
    if (selectedIso) detailHeadingRef.current?.focus();
  }, [selectedIso]);

  const handleSelectDay = useCallback(
    (iso: string) => {
      // Spillover days belong to an adjacent month — follow the view to them.
      const cellMonth = { year: Number(iso.slice(0, 4)), month: Number(iso.slice(5, 7)) - 1 };
      if (cellMonth.year !== month.year || cellMonth.month !== month.month) {
        onMonthChange(cellMonth);
      }
      setSelectedIso((prev) => (prev === iso ? null : iso));
    },
    [month, onMonthChange],
  );

  const dayAriaLabel = useCallback(
    (cell: CalendarDayCell): string => {
      const dateLabel = formatCivicDate(cell.iso) ?? cell.iso;
      const dayMeetings = meetingsByDay.get(cell.iso) ?? [];
      const dayVotes = votesByDay.get(cell.iso) ?? [];
      const session = sessionInfoFor(cell.iso);
      const parts: string[] = [dateLabel];
      if (dayMeetings.length) {
        parts.push(`${dayMeetings.length} committee meeting${dayMeetings.length === 1 ? '' : 's'}`);
      }
      if (dayVotes.length) {
        parts.push(`${dayVotes.length} floor vote${dayVotes.length === 1 ? '' : 's'}`);
      }
      if (session.convene) parts.push('session convenes');
      if (session.sineDie) parts.push('final adjournment (sine die)');
      else if (session.vetoRecess) parts.push('veto recess');
      if (dayMeetings.length === 0 && dayVotes.length === 0) parts.push('no scheduled activity');
      return parts.join(', ');
    },
    [meetingsByDay, votesByDay],
  );

  const dayCellSx = useCallback(
    (cell: CalendarDayCell): SxProps<Theme> => {
      const session = sessionInfoFor(cell.iso);
      if (session.vetoRecess && cell.inMonth) {
        return { bgcolor: 'rgba(217, 119, 6, 0.10)' }; // --warning tint
      }
      return {};
    },
    [],
  );

  const renderDay = useCallback(
    (cell: CalendarDayCell): React.ReactNode => {
      const dayMeetings = meetingsByDay.get(cell.iso) ?? [];
      const dayVotes = votesByDay.get(cell.iso) ?? [];
      const session = sessionInfoFor(cell.iso);
      const shown = dayMeetings.slice(0, 3);
      const overflow = dayMeetings.length - shown.length;
      return (
        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 0.25, mt: 'auto', minWidth: 0 }}>
          {(session.convene || session.sineDie) && (
            <Typography
              component="span"
              sx={{
                fontSize: '0.6rem',
                fontWeight: 700,
                color: 'var(--primary)',
                textTransform: 'uppercase',
                letterSpacing: '0.02em',
                lineHeight: 1.1,
              }}
            >
              {session.sineDie ? 'Sine die' : 'Convenes'}
            </Typography>
          )}
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.4, flexWrap: 'wrap' }}>
            {shown.map((m) => (
              <Box
                key={m.id}
                component="span"
                aria-hidden
                sx={{
                  width: 7,
                  height: 7,
                  borderRadius: '50%',
                  flexShrink: 0,
                  bgcolor:
                    m.status === 'cancelled' ? 'transparent' : chamberDotColor(m.ky_committees?.chamber),
                  border: m.status === 'cancelled' ? '1px solid #94A3B8' : 'none',
                }}
              />
            ))}
            {overflow > 0 && (
              <Typography component="span" sx={{ fontSize: '0.6rem', fontWeight: 700, color: 'text.secondary' }}>
                +{overflow}
              </Typography>
            )}
            {dayVotes.length > 0 && (
              <HowToVote
                aria-hidden
                sx={{ fontSize: '0.8rem', color: 'var(--warning)', ml: shown.length ? 0.15 : 0 }}
              />
            )}
          </Box>
        </Box>
      );
    },
    [meetingsByDay, votesByDay],
  );

  const selectedMeetings = selectedIso ? meetingsByDay.get(selectedIso) ?? [] : [];
  const selectedVotes = selectedIso ? votesByDay.get(selectedIso) ?? [] : [];
  const selectedAgenda = selectedIso ? agendaByDay[selectedIso] : undefined;

  return (
    <Box>
      <CalendarMonthGrid
        month={month}
        selectedIso={selectedIso}
        onSelectDay={handleSelectDay}
        onMonthChange={onMonthChange}
        renderDay={renderDay}
        dayAriaLabel={dayAriaLabel}
        dayCellSx={dayCellSx}
        gridAriaLabel="Committee meeting calendar"
      />

      <CalendarLegend />

      {selectedIso && (
        <Box
          component="section"
          aria-label="Selected day detail"
          sx={{ mt: 3, pt: 2, borderTop: '1px solid', borderColor: 'divider' }}
        >
          <Typography
            ref={detailHeadingRef}
            tabIndex={-1}
            component="h3"
            sx={{ fontWeight: 700, fontSize: '1.05rem', mb: 1.5, outline: 'none' }}
          >
            {formatCivicDate(selectedIso, { weekday: 'long' }) ?? selectedIso}
          </Typography>

          {selectedMeetings.length === 0 && selectedVotes.length === 0 ? (
            <Typography variant="body2" color="text.secondary">
              No scheduled committee meetings or recorded floor votes on this day.
            </Typography>
          ) : (
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
              {selectedMeetings.map((meeting) => (
                <Box key={meeting.id}>
                  <CommitteeMeetingCard
                    meeting={meeting}
                    following={followedCommitteeIds.has(String(meeting.ky_committees?.id ?? ''))}
                    onToggleFollow={onToggleFollow}
                  />
                </Box>
              ))}

              {selectedMeetings.length > 0 && (
                <Box>
                  <Typography
                    variant="caption"
                    sx={{
                      display: 'block',
                      textTransform: 'uppercase',
                      letterSpacing: '0.05em',
                      fontWeight: 700,
                      fontSize: '0.7rem',
                      color: 'text.secondary',
                      mb: 0.75,
                    }}
                  >
                    Bills on the agenda
                  </Typography>
                  {selectedAgenda === 'loading' || selectedAgenda === undefined ? (
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                      <CircularProgress size={16} />
                      <Typography variant="body2" color="text.secondary">
                        Loading agenda…
                      </Typography>
                    </Box>
                  ) : selectedAgenda.length === 0 ? (
                    <Typography variant="body2" color="text.secondary">
                      No bills listed on these agendas.
                    </Typography>
                  ) : (
                    <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.75 }}>
                      {selectedAgenda.map((item) => {
                        const label =
                          item.bill_number ||
                          formatAgendaItemKind(item.item_kind) ||
                          normalizeKyGaAgendaLine(item.raw_text).slice(0, 40);
                        if (item.ky_bill_id) {
                          return (
                            <Chip
                              key={item.id}
                              label={label}
                              size="small"
                              clickable
                              component={Link}
                              href={`/bills/${encodeURIComponent(item.ky_bill_id)}`}
                              icon={<Gavel sx={{ fontSize: '0.85rem' }} />}
                              sx={{ fontWeight: 600 }}
                            />
                          );
                        }
                        return <Chip key={item.id} label={label} size="small" variant="outlined" />;
                      })}
                    </Box>
                  )}
                </Box>
              )}

              {selectedVotes.length > 0 && (
                <Box>
                  <Typography
                    variant="caption"
                    sx={{
                      display: 'block',
                      textTransform: 'uppercase',
                      letterSpacing: '0.05em',
                      fontWeight: 700,
                      fontSize: '0.7rem',
                      color: 'text.secondary',
                      mb: 0.75,
                    }}
                  >
                    Floor votes
                  </Typography>
                  <Box sx={{ display: 'flex', flexDirection: 'column', gap: 0.5 }}>
                    {selectedVotes.map((v) => (
                      <Box key={v.id} sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                        <HowToVote aria-hidden sx={{ fontSize: '1rem', color: 'var(--warning)' }} />
                        <Typography variant="body2">
                          {v.billId ? (
                            <MuiLink component={Link} href={`/bills/${encodeURIComponent(v.billId)}`} fontWeight={600}>
                              {v.billNumber ?? 'Bill'}
                            </MuiLink>
                          ) : (
                            <strong>{v.billNumber ?? 'Bill'}</strong>
                          )}{' '}
                          {v.chamber ? `· ${v.chamber === 'house' ? 'House' : 'Senate'} floor` : '· Floor'}
                          {v.passed != null ? ` · ${v.passed ? 'Passed' : 'Failed'}` : ''}
                        </Typography>
                      </Box>
                    ))}
                  </Box>
                </Box>
              )}
            </Box>
          )}
        </Box>
      )}
    </Box>
  );
}

function LegendDot({ color, label, hollow = false }: { color: string; label: string; hollow?: boolean }) {
  return (
    <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
      <Box
        component="span"
        aria-hidden
        sx={{
          width: 9,
          height: 9,
          borderRadius: '50%',
          bgcolor: hollow ? 'transparent' : color,
          border: hollow ? `1px solid ${color}` : 'none',
        }}
      />
      <Typography variant="caption" color="text.secondary">
        {label}
      </Typography>
    </Box>
  );
}

function CalendarLegend() {
  return (
    <Box
      sx={{
        display: 'flex',
        flexWrap: 'wrap',
        gap: { xs: 1, sm: 1.5 },
        mt: 1.5,
        alignItems: 'center',
        justifyContent: 'center',
      }}
    >
      <LegendDot color="var(--chamber-house)" label="House" />
      <LegendDot color="var(--chamber-senate)" label="Senate" />
      <LegendDot color="var(--primary)" label="Joint" />
      <LegendDot color="#94A3B8" label="Cancelled" hollow />
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
        <HowToVote aria-hidden sx={{ fontSize: '0.9rem', color: 'var(--warning)' }} />
        <Typography variant="caption" color="text.secondary">
          Floor vote
        </Typography>
      </Box>
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
        <Box
          component="span"
          aria-hidden
          sx={{ width: 14, height: 9, borderRadius: 0.5, bgcolor: 'rgba(217, 119, 6, 0.18)' }}
        />
        <Typography variant="caption" color="text.secondary">
          Veto recess
        </Typography>
      </Box>
    </Box>
  );
}
