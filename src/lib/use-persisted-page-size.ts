import { useState, useEffect, useCallback } from 'react';

/**
 * Multiples of 3 so 3-column bill grids (xs=12, sm=6, md=4) fill every row on each page.
 * Shown in bill browse, search, and home (localStorage `kyv:pageSize:*`).
 */
export const PAGE_SIZE_CHOICES = [24, 48, 96] as const;
export type PageSizeChoice = (typeof PAGE_SIZE_CHOICES)[number];

const STORAGE_PREFIX = 'kyv:pageSize:';

/** Old 25/50/100 values migrate to 24/48/96. */
const LEGACY_PAGE_SIZES: Record<number, PageSizeChoice> = {
  25: 24,
  50: 48,
  100: 96,
};

function isPageSize(n: number): n is PageSizeChoice {
  return (PAGE_SIZE_CHOICES as readonly number[]).includes(n);
}

/** Safe when wiring MUI `Select` `onChange` to `setPageSize`. */
export function toPageSizeChoice(n: number, fallback: PageSizeChoice = 24): PageSizeChoice {
  if (isPageSize(n)) return n;
  if (Object.prototype.hasOwnProperty.call(LEGACY_PAGE_SIZES, n)) {
    return LEGACY_PAGE_SIZES[n]!;
  }
  return fallback;
}

function readSize(storageKey: string, fallback: PageSizeChoice): PageSizeChoice {
  if (typeof window === 'undefined') return fallback;
  try {
    const raw = localStorage.getItem(STORAGE_PREFIX + storageKey);
    if (!raw) return fallback;
    const n = parseInt(raw, 10);
    if (!Number.isFinite(n)) return fallback;
    return toPageSizeChoice(n, fallback);
  } catch {
    /* ignore */
  }
  return fallback;
}

/**
 * Read/write 24/48/96 in localStorage. Safe for SSR: first paint uses `fallback`, then syncs from storage.
 */
export function usePersistedPageSize(
  storageKey: string,
  fallback: PageSizeChoice = 24,
): { pageSize: PageSizeChoice; setPageSize: (n: PageSizeChoice) => void } {
  const [pageSize, setPageSizeState] = useState<PageSizeChoice>(fallback);

  useEffect(() => {
    setPageSizeState(readSize(storageKey, fallback));
  }, [storageKey, fallback]);

  const setPageSize = useCallback(
    (n: PageSizeChoice) => {
      setPageSizeState(n);
      try {
        localStorage.setItem(STORAGE_PREFIX + storageKey, String(n));
      } catch {
        /* ignore */
      }
    },
    [storageKey],
  );

  return { pageSize, setPageSize };
}
