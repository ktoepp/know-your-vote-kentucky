/**
 * /api/sync — Main sync API endpoint
 *
 * POST — Trigger sync for default GA sources or a specific source
 *   Default (no source): bills + legislators + votes — see SYNC_SOURCES_DEFAULT in ky-sync-pipeline.ts
 *   Query params: ?source=bills&dryRun=true
 * GET  — Without `source`: return sync status from ky_sources table.
 *        With `source` (and auth): run sync — matches Vercel Cron (GET + ?source=...).
 *
 * Auth: `Authorization: Bearer <token>` where token is SYNC_API_KEY or CRON_SECRET.
 * Vercel Cron automatically sends CRON_SECRET when the env var is set in the project.
 *
 * Bills sync tuning:
 *   `limit` — max bills per LegiScan session (master list is chamber-balanced before limiting).
 *   `skipBillSponsorDetails=true` — omit sponsor JSON from upserts (hash-gated path still calls
 *   `getBill` for changed/new bills to populate title/status/last_action).
 *   `historicSessions=N` — sync N most recent KY sessions that have bills (default 1). Backfills prior GAs.
 *   `legiscanSessionId=N` — sync only that session (from `npm run sync:ky:sessions`); overrides historicSessions.
 *   `quotaBackfill=true` — full master list per session + sponsor cap + `ky_sync_state` cursor (migration 005).
 *   `quotaBackfillSessionsPerRun` — sessions per invocation (default 1). `sponsorDetailBudgetPerSession` — getBill cap (default 20).
 *   `quotaBackfillAdvanceCursor=false` — do not advance cursor after success (testing).
 */
import { NextRequest, NextResponse } from 'next/server';
import { syncAll, getSyncStatus, SYNC_SOURCES } from '../../../lib/ky-sync-pipeline';
import { withVercelSyncCronMonitor } from '../../../lib/sentry-sync-cron';
import {
  isVercelCronRequest,
  notifySyncExceptionSlack,
  notifySyncSlack,
} from '../../../lib/slack-webhook';

/** Pro / Enterprise: raise if your plan allows longer functions. */
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

function syncParamsFromUrl(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const source = searchParams.get('source') || undefined;
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
  const useChangeHash = searchParams.get('useChangeHash') === 'true' || process.env.KY_SYNC_USE_CHANGE_HASH === 'true';
  return {
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
  };
}

export async function GET(req: NextRequest) {
  if (!authenticate(req)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { searchParams } = new URL(req.url);
  const source = searchParams.get('source');

  // Status listing (no source): manual / monitoring
  if (!source) {
    try {
      const status = await getSyncStatus();
      return NextResponse.json({
        sources: status,
        availableSources: Object.keys(SYNC_SOURCES),
      });
    } catch (err: any) {
      console.error('[Sync API] getSyncStatus failed:', err);
      return NextResponse.json({ error: 'Sync failed' }, { status: 500 });
    }
  }

  // Vercel Cron and scripted sync use GET with ?source=...
  const {
    dryRun,
    limit,
    skipBillSponsorDetails,
    historicSessions,
    legiscanSessionId,
    quotaBackfill,
    quotaBackfillSessionsPerRun,
    sponsorDetailBudgetPerSession,
    quotaBackfillAdvanceCursor,
    useChangeHash,
  } = syncParamsFromUrl(req);
  try {
    const results = await withVercelSyncCronMonitor(source, () =>
      syncAll({
        source,
        dryRun,
        limit,
        skipBillSponsorDetails,
        historicSessions,
        legiscanSessionId,
        quotaBackfill,
        quotaBackfillSessionsPerRun,
        sponsorDetailBudgetPerSession,
        quotaBackfillAdvanceCursor,
        useChangeHash,
      }),
    );
    const hasErrors = results.some((r) => r.status === 'error');
    const cron = isVercelCronRequest(req);
    await notifySyncSlack({
      results,
      source,
      dryRun,
      isVercelCron: cron,
    }).catch((e) => console.error('[Slack] sync notify failed:', e));
    return NextResponse.json(
      { results, dryRun },
      { status: hasErrors ? 207 : 200 },
    );
  } catch (err: any) {
    console.error('[Sync API] GET syncAll failed:', err);
    await notifySyncExceptionSlack({
      error: err,
      source,
      dryRun,
      isVercelCron: isVercelCronRequest(req),
    }).catch((e) => console.error('[Slack] sync exception notify failed:', e));
    return NextResponse.json({ error: 'Sync failed' }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  if (!authenticate(req)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const {
    source,
    dryRun,
    limit,
    skipBillSponsorDetails,
    historicSessions,
    legiscanSessionId,
    quotaBackfill,
    quotaBackfillSessionsPerRun,
    sponsorDetailBudgetPerSession,
    quotaBackfillAdvanceCursor,
    useChangeHash,
  } = syncParamsFromUrl(req);

  try {
    const results = await withVercelSyncCronMonitor(source, () =>
      syncAll({
        source,
        dryRun,
        limit,
        skipBillSponsorDetails,
        historicSessions,
        legiscanSessionId,
        quotaBackfill,
        quotaBackfillSessionsPerRun,
        sponsorDetailBudgetPerSession,
        quotaBackfillAdvanceCursor,
        useChangeHash,
      }),
    );
    const hasErrors = results.some((r) => r.status === 'error');
    const cron = isVercelCronRequest(req);
    await notifySyncSlack({
      results,
      source,
      dryRun,
      isVercelCron: cron,
    }).catch((e) => console.error('[Slack] sync notify failed:', e));
    return NextResponse.json(
      { results, dryRun },
      { status: hasErrors ? 207 : 200 },
    );
  } catch (err: any) {
    console.error('[Sync API] POST syncAll failed:', err);
    await notifySyncExceptionSlack({
      error: err,
      source,
      dryRun,
      isVercelCron: isVercelCronRequest(req),
    }).catch((e) => console.error('[Slack] sync exception notify failed:', e));
    return NextResponse.json({ error: 'Sync failed' }, { status: 500 });
  }
}
