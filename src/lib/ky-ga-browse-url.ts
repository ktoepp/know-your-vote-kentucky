'use client';

import { useCallback } from 'react';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import type { GaChamberFilter } from '@/lib/ky-committee-display';

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
} {
  const searchParams = useSearchParams();
  const router = useRouter();
  const pathname = usePathname();

  const chamber = parseGaChamberParam(searchParams.get('chamber'));
  const range = parseGaMeetingsRangeParam(searchParams.get('when'));
  const agendaQuery = searchParams.get('q')?.trim() ?? '';

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

  return { chamber, setChamber, range, setRange, agendaQuery, setAgendaQuery };
}
