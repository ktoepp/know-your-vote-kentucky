// Carries *why* a `/search` execution ran across a navigation boundary (a chip
// click on /bills, a suggestion chip on /search itself) so `search_performed`
// can be tagged with a `source`. sessionStorage survives the navigation; the
// value is consumed (read + cleared) by the first search execution after it's
// set, so unrelated re-executions (filter changes, back/forward) see nothing.

export type PendingSearchSource = 'typed' | 'suggestion_chip' | 'topic_chip';

const STORAGE_KEY = 'kyvky_pending_search_source';

export function setPendingSearchSource(source: PendingSearchSource): void {
  if (typeof window === 'undefined') return;
  try {
    window.sessionStorage.setItem(STORAGE_KEY, source);
  } catch {
    // Private mode / storage disabled — source tracking is best-effort.
  }
}

export function consumePendingSearchSource(): PendingSearchSource | null {
  if (typeof window === 'undefined') return null;
  try {
    const value = window.sessionStorage.getItem(STORAGE_KEY);
    if (!value) return null;
    window.sessionStorage.removeItem(STORAGE_KEY);
    if (value === 'typed' || value === 'suggestion_chip' || value === 'topic_chip') return value;
    return null;
  } catch {
    return null;
  }
}
