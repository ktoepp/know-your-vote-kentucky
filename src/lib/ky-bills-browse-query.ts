import {
  parseKyBillSortDirParam,
  parseKyBillSortParam,
} from '@/lib/ky-bills-browse-url';
import type { KyBillsBrowseChamberMode, KyBillsBrowseQuery } from '@/lib/ky-bills-browse-server';

export function parseKyBillsBrowseQuery(
  sp: URLSearchParams,
  chamberMode: KyBillsBrowseChamberMode,
  pageSize = 25,
): KyBillsBrowseQuery {
  const chamberFilterRaw = sp.get('chamberFilter') ?? sp.get('chamber');
  const chamberFilter =
    chamberFilterRaw === 'house' || chamberFilterRaw === 'senate' || chamberFilterRaw === 'joint'
      ? chamberFilterRaw
      : '';

  return {
    chamberMode,
    chamberFilter,
    statusFilter: sp.get('status') ?? 'all',
    topicFilter: sp.get('topic') ?? '',
    followIds: [],
    sortBy: parseKyBillSortParam(sp.get('sort')),
    sortDir: parseKyBillSortDirParam(sp.get('dir')),
    page: Math.max(1, parseInt(sp.get('page') ?? '1', 10) || 1),
    pageSize: Math.min(100, Math.max(1, pageSize)),
  };
}

/** Stable key for matching server-prefetched browse data to the client query. */
export function kyBillsBrowseQueryKey(query: KyBillsBrowseQuery): string {
  return [
    query.chamberMode,
    query.chamberFilter,
    query.statusFilter,
    query.topicFilter,
    query.sortBy,
    query.sortDir,
    String(query.pageSize),
  ].join('|');
}
