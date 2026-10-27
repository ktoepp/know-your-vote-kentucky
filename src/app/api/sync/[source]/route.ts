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
import { rejectUnlessOperator } from '@/lib/auth/operator-guard';
import { syncAll, SYNC_SOURCES } from '../../../../lib/ky-sync-pipeline';
import {
  isVercelCronRequest,
  notifySyncExceptionSlack,
  notifySyncSlack,
} from '../../../../lib/slack-webhook';

export const maxDuration = 300;

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ source: string }> },
) {
  const denied = await rejectUnlessOperator(req);
  if (denied) return denied;

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
  const force = searchParams.get('force') === 'true';

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
      force: force || undefined,
    });
    const result = results[0];
    const cron = isVercelCronRequest(req);
    await notifySyncSlack({
      results,
      source,
      dryRun,
      isVercelCron: cron,
    }).catch((e) => console.error('[Slack] sync notify failed:', e));
    return NextResponse.json(
      { result, dryRun },
      { status: result?.status === 'error' ? 500 : 200 },
    );
  } catch (err: any) {
    console.error('[Sync API] per-source syncAll failed:', err);
    await notifySyncExceptionSlack({
      error: err,
      source,
      dryRun,
      isVercelCron: isVercelCronRequest(req),
    }).catch((e) => console.error('[Slack] sync exception notify failed:', e));
    return NextResponse.json({ error: 'Sync failed' }, { status: 500 });
  }
}

