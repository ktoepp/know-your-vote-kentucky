import type { KyBillSortKey } from '@/lib/bill-display';
import { isKnownKyBillSession } from '@/lib/ky-sessions';

export const KY_BILL_SORT_KEYS: KyBillSortKey[] = [
  'last_action_date',
  'introduced_date',
  'bill_number',
  'title',
  'session',
  'status',
  'chamber',
];

export const KY_BILL_SORT_OPTIONS: { value: KyBillSortKey; label: string }[] = [
  { value: 'last_action_date', label: 'Last action' },
  { value: 'introduced_date', label: 'Introduced' },
  { value: 'bill_number', label: 'Bill number' },
  { value: 'title', label: 'Title' },
  { value: 'session', label: 'Session' },
  { value: 'status', label: 'Status' },
  { value: 'chamber', label: 'Chamber' },
];

export function parseKyBillSortParam(value: string | null): KyBillSortKey {
  if (value && KY_BILL_SORT_KEYS.includes(value as KyBillSortKey)) {
    return value as KyBillSortKey;
  }
  return 'last_action_date';
}

export function parseKyBillSortDirParam(value: string | null): 'asc' | 'desc' {
  return value === 'asc' ? 'asc' : 'desc';
}

export function defaultDirForKyBillSort(sortBy: KyBillSortKey): 'asc' | 'desc' {
  return sortBy === 'last_action_date' || sortBy === 'introduced_date' ? 'desc' : 'asc';
}

export function isDefaultKyBillSort(sortBy: KyBillSortKey, sortDir: 'asc' | 'desc'): boolean {
  return sortBy === 'last_action_date' && sortDir === 'desc';
}

/** Empty string = "All sessions" (no filter applied). */
export function parseKyBillSessionParam(value: string | null): string {
  if (!value) return '';
  const trimmed = value.trim();
  return isKnownKyBillSession(trimmed) ? trimmed : '';
}

/** Chip / aria label for the active sort control. */
export function kyBillSortLabel(sortBy: KyBillSortKey, sortDir: 'asc' | 'desc'): string {
  const base = KY_BILL_SORT_OPTIONS.find((o) => o.value === sortBy)?.label ?? sortBy;
  if (sortBy === 'last_action_date' || sortBy === 'introduced_date') {
    return sortDir === 'desc' ? `${base} (newest)` : `${base} (oldest)`;
  }
  return sortDir === 'asc' ? `${base} (A→Z)` : `${base} (Z→A)`;
}
