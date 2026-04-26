import { useState, useEffect, useCallback } from 'react';

/** Shown in bill browse, search, and home list pagination (localStorage `kyv:pageSize:*`). */
export const PAGE_SIZE_CHOICES = [25, 50, 100] as const;
export type PageSizeChoice = (typeof PAGE_SIZE_CHOICES)[number];

const STORAGE_PREFIX = 'kyv:pageSize:';

function isPageSize(n: number): n is PageSizeChoice {
  return (PAGE_SIZE_CHOICES as readonly number[]).includes(n);
}

/** Safe when wiring MUI `Select` `onChange` to `setPageSize`. */
export function toPageSizeChoice(n: number, fallback: PageSizeChoice = 25): PageSizeChoice {
  return isPageSize(n) ? n : fallback;
}

function readSize(storageKey: string, fallback: PageSizeChoice): PageSizeChoice {
  if (typeof window === 'undefined') return fallback;
  try {
    const raw = localStorage.getItem(STORAGE_PREFIX + storageKey);
    if (!raw) return fallback;
    const n = parseInt(raw, 10);
    if (isPageSize(n)) return n;
  } catch {
    /* ignore */
  }
  return fallback;
}

/**
 * Read/write 25/50/100 in localStorage. Safe for SSR: first paint uses `fallback`, then syncs from storage.
 */
export function usePersistedPageSize(
  storageKey: string,
  fallback: PageSizeChoice = 25,
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
