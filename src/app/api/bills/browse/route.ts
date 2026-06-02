import { NextRequest, NextResponse } from 'next/server';
import { fetchKyBillsBrowsePage, type KyBillsBrowseQuery } from '@/lib/ky-bills-browse-server';
import type { KyBillSortKey } from '@/lib/bill-display';
import { parseKyBillSessionParam } from '@/lib/ky-bills-browse-url';

const SORT_KEYS: KyBillSortKey[] = [
  'last_action_date',
  'introduced_date',
  'bill_number',
  'title',
  'session',
];

export async function GET(request: NextRequest) {
  const sp = request.nextUrl.searchParams;
  const chamberMode = sp.get('chamberMode');
  const sortByRaw = sp.get('sortBy') ?? 'last_action_date';
  const sortBy = SORT_KEYS.includes(sortByRaw as KyBillSortKey)
    ? (sortByRaw as KyBillSortKey)
    : 'last_action_date';
  const sortDir = sp.get('sortDir') === 'asc' ? 'asc' : 'desc';
  const chamberFilterRaw = sp.get('chamberFilter');
  const chamberFilter =
    chamberFilterRaw === 'house' || chamberFilterRaw === 'senate' || chamberFilterRaw === 'joint'
      ? chamberFilterRaw
      : '';

  const query: KyBillsBrowseQuery = {
    chamberMode:
      chamberMode === 'house' || chamberMode === 'senate' ? chamberMode : 'all',
    chamberFilter,
    statusFilter: sp.get('status') ?? 'all',
    topicFilter: sp.get('topic') ?? '',
    sessionFilter: parseKyBillSessionParam(sp.get('session')),
    followIds: (sp.get('followIds') ?? '')
      .split(',')
      .map((s) => s.trim())
      .filter(Boolean),
    sortBy,
    sortDir,
    page: Math.max(1, parseInt(sp.get('page') ?? '1', 10) || 1),
    pageSize: Math.min(100, Math.max(1, parseInt(sp.get('pageSize') ?? '25', 10) || 25)),
  };

  try {
    const result = await fetchKyBillsBrowsePage(query);
    return NextResponse.json(result, {
      headers: {
        'Cache-Control': 'public, s-maxage=60, stale-while-revalidate=300',
      },
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Failed to load bills';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
