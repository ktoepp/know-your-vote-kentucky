'use client';

import { useCallback } from 'react';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import type { GaChamberFilter } from '@/lib/ky-committee-display';
import {
  formatMonthParam,
  isSameMonth,
  parseMonthParam,
  currentMonth,
  type CalendarMonth,
} from '@/lib/calendar-grid';

export function parseGaChamberParam(value: string | null): GaChamberFilter {
  if (value === 'house' || value === 'senate' || value === 'joint') return value;
  // Legacy URLs used `chamber=all` before Joint replaced All in the UI.
  if (value === 'all') return '';
  return '';
}

export type GaMeetingsRangeParam = 'upcoming' | 'recent';

export function parseGaMeetingsRangeParam(value: string | null): GaMeetingsRangeParam {
  // `all` was the legacy URL value for the combined recent+upcoming view.
  if (value === 'recent' || value === 'all') return 'recent';
  return 'upcoming';
}

export type GaMeetingsViewParam = 'list' | 'calendar';

export function parseGaMeetingsViewParam(value: string | null): GaMeetingsViewParam {
  return value === 'calendar' ? 'calendar' : 'list';
}

/** Sync GA chamber filter with `?chamber=house|senate|joint` (omit = show all). */
export function useGaChamberUrlState(): [GaChamberFilter, (next: GaChamberFilter) => void] {
  const searchParams = useSearchParams();
  const router = useRouter();
  const pathname = usePathname();
  const chamber = parseGaChamberParam(searchParams.get('chamber'));

  const setChamber = useCallback(
    (next: GaChamberFilter) => {
      const p = new URLSearchParams(searchParams.toString());
      if (next) p.set('chamber', next);
      else p.delete('chamber');
      const qs = p.toString();
      router.replace(qs ? `${pathname}?${qs}` : pathname, { scroll: false });
    },
    [pathname, router, searchParams],
  );

  return [chamber, setChamber];
}

export function useGaMeetingsBrowseUrlState(): {
  chamber: GaChamberFilter;
  setChamber: (next: GaChamberFilter) => void;
  range: GaMeetingsRangeParam;
  setRange: (next: GaMeetingsRangeParam) => void;
  agendaQuery: string;
  setAgendaQuery: (next: string) => void;
  followsMe: boolean;
  setFollowsMe: (next: boolean) => void;
  view: GaMeetingsViewParam;
  setView: (next: GaMeetingsViewParam) => void;
  month: CalendarMonth;
  setMonth: (next: CalendarMonth) => void;
} {
  const searchParams = useSearchParams();
  const router = useRouter();
  const pathname = usePathname();

  const chamber = parseGaChamberParam(searchParams.get('chamber'));
  const range = parseGaMeetingsRangeParam(searchParams.get('when'));
  const agendaQuery = searchParams.get('q')?.trim() ?? '';
  const followsMe = searchParams.get('follows') === 'me';
  const view = parseGaMeetingsViewParam(searchParams.get('view'));
  const month = parseMonthParam(searchParams.get('month'));

  const patchParams = useCallback(
    (mutate: (p: URLSearchParams) => void) => {
      const p = new URLSearchParams(searchParams.toString());
      mutate(p);
      const qs = p.toString();
      router.replace(qs ? `${pathname}?${qs}` : pathname, { scroll: false });
    },
    [pathname, router, searchParams],
  );

  const setChamber = useCallback(
    (next: GaChamberFilter) => {
      patchParams((p) => {
        if (next) p.set('chamber', next);
        else p.delete('chamber');
      });
    },
    [patchParams],
  );

  const setRange = useCallback(
    (next: GaMeetingsRangeParam) => {
      patchParams((p) => {
        if (next === 'upcoming') p.delete('when');
        else p.set('when', next);
      });
    },
    [patchParams],
  );

  const setAgendaQuery = useCallback(
    (next: string) => {
      patchParams((p) => {
        const trimmed = next.trim();
        if (trimmed) p.set('q', trimmed);
        else p.delete('q');
      });
    },
    [patchParams],
  );

  const setFollowsMe = useCallback(
    (next: boolean) => {
      patchParams((p) => {
        if (next) p.set('follows', 'me');
        else p.delete('follows');
      });
    },
    [patchParams],
  );

  const setView = useCallback(
    (next: GaMeetingsViewParam) => {
      patchParams((p) => {
        if (next === 'calendar') {
          p.set('view', 'calendar');
          // Agenda text search is a list-only mode; clear it so the calendar
          // loads the full meeting window instead of agenda hits.
          p.delete('q');
        } else {
          p.delete('view');
          // `month` is only meaningful for the calendar view.
          p.delete('month');
        }
      });
    },
    [patchParams],
  );

  const setMonth = useCallback(
    (next: CalendarMonth) => {
      patchParams((p) => {
        if (isSameMonth(next, currentMonth())) p.delete('month');
        else p.set('month', formatMonthParam(next));
      });
    },
    [patchParams],
  );

  return {
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
  };
}
