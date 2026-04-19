/**
 * /api/sync — Main sync API endpoint
 *
 * POST — Trigger sync for all sources or a specific source
 *   Query params: ?source=bills&dryRun=true
 * GET  — Without `source`: return sync status from ky_sources table.
 *        With `source` (and auth): run sync — matches Vercel Cron (GET + ?source=...).
 *
 * Auth: `Authorization: Bearer <token>` where token is SYNC_API_KEY or CRON_SECRET.
 * Vercel Cron automatically sends CRON_SECRET when the env var is set in the project.
 *
 * Bills sync tuning:
 *   `limit` — max bills to upsert (LegiScan master list is chamber-balanced before limiting).
 *   `skipBillSponsorDetails=true` — omit per-bill LegiScan getBill calls (required for serverless
 *   time limits on cron; run a manual sync without this periodically for sponsor JSON).
 */
import { NextRequest, NextResponse } from 'next/server';
import { syncAll, getSyncStatus, SYNC_SOURCES } from '../../../lib/ky-sync-pipeline';

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
  return { source, dryRun, limit, skipBillSponsorDetails };
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
      return NextResponse.json({ error: err.message }, { status: 500 });
    }
  }

  // Vercel Cron and scripted sync use GET with ?source=...
  const { dryRun, limit, skipBillSponsorDetails } = syncParamsFromUrl(req);
  try {
    const results = await syncAll({ source, dryRun, limit, skipBillSponsorDetails });
    const hasErrors = results.some((r) => r.status === 'error');
    return NextResponse.json(
      { results, dryRun },
      { status: hasErrors ? 207 : 200 },
    );
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  if (!authenticate(req)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { source, dryRun, limit, skipBillSponsorDetails } = syncParamsFromUrl(req);

  try {
    const results = await syncAll({ source, dryRun, limit, skipBillSponsorDetails });
    const hasErrors = results.some((r) => r.status === 'error');
    return NextResponse.json(
      { results, dryRun },
      { status: hasErrors ? 207 : 200 },
    );
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
