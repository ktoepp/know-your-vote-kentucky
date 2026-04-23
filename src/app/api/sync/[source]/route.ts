/**
 * /api/sync/[source] — Per-source sync endpoint
 *
 * POST /api/sync/bills — Sync bills only
 * POST /api/sync/legislators — Sync legislators only
 * POST /api/sync/ordinances — Sync ordinances only
 * etc.
 *
 * Query params: ?dryRun=true&limit=200&skipBillSponsorDetails=true&historicSessions=2&legiscanSessionId=1234&quotaBackfill=true
 * Protected by SYNC_API_KEY or CRON_SECRET bearer token.
 */
import { NextRequest, NextResponse } from 'next/server';
import { syncAll, SYNC_SOURCES } from '../../../../lib/ky-sync-pipeline';

export const maxDuration = 300;

function getBearerToken(req: NextRequest): string | null {
  const auth = req.headers.get('authorization');
  if (!auth) return null;
  const token = auth.replace(/^Bearer\s+/i, '').trim();
  return token || null;
}

function authenticate(req: NextRequest): boolean {
  const token = getBearerToken(req);
  if (!token) return false;
  const syncKey = process.env.SYNC_API_KEY?.trim();
  const cronSecret = process.env.CRON_SECRET?.trim();
  if (!syncKey && !cronSecret) {
    console.warn('[Sync API] Neither SYNC_API_KEY nor CRON_SECRET configured — rejecting all requests');
    return false;
  }
  if (syncKey && token === syncKey) return true;
  if (cronSecret && token === cronSecret) return true;
  return false;
}

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ source: string }> },
) {
  if (!authenticate(req)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { source } = await params;

  if (!SYNC_SOURCES[source]) {
    return NextResponse.json(
      { error: `Unknown source: ${source}`, availableSources: Object.keys(SYNC_SOURCES) },
      { status: 400 },
    );
  }

  const { searchParams } = new URL(req.url);
  const dryRun = searchParams.get('dryRun') === 'true';
  const limitParam = searchParams.get('limit');
  const limit = limitParam ? parseInt(limitParam, 10) : undefined;
  const skipBillSponsorDetails = searchParams.get('skipBillSponsorDetails') === 'true';
  const hs = searchParams.get('historicSessions');
  const historicSessions = hs ? parseInt(hs, 10) : undefined;
  const ls = searchParams.get('legiscanSessionId');
  const legiscanSessionId = ls ? parseInt(ls, 10) : undefined;
  const quotaBackfill = searchParams.get('quotaBackfill') === 'true';
  const qbs = searchParams.get('quotaBackfillSessionsPerRun');
  const quotaBackfillSessionsPerRun = qbs ? parseInt(qbs, 10) : undefined;
  const sdb = searchParams.get('sponsorDetailBudgetPerSession');
  const sponsorDetailBudgetPerSession = sdb ? parseInt(sdb, 10) : undefined;
  const quotaBackfillAdvanceCursor = searchParams.get('quotaBackfillAdvanceCursor') !== 'false';
  const useChangeHash = searchParams.get('useChangeHash') === 'true';

  try {
    const results = await syncAll({
      source,
      dryRun,
      limit,
      skipBillSponsorDetails,
      historicSessions: Number.isNaN(historicSessions as number) ? undefined : historicSessions,
      legiscanSessionId: Number.isNaN(legiscanSessionId as number) ? undefined : legiscanSessionId,
      quotaBackfill: quotaBackfill || undefined,
      quotaBackfillSessionsPerRun: Number.isNaN(quotaBackfillSessionsPerRun as number)
        ? undefined
        : quotaBackfillSessionsPerRun,
      sponsorDetailBudgetPerSession: Number.isNaN(sponsorDetailBudgetPerSession as number)
        ? undefined
        : sponsorDetailBudgetPerSession,
      quotaBackfillAdvanceCursor,
      useChangeHash: useChangeHash || undefined,
    });
    const result = results[0];
    return NextResponse.json(
      { result, dryRun },
      { status: result?.status === 'error' ? 500 : 200 },
    );
  } catch (err: any) {
    console.error('[Sync API] per-source syncAll failed:', err);
    return NextResponse.json({ error: 'Sync failed' }, { status: 500 });
  }
}

