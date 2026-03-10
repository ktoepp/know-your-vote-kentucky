/**
 * /api/sync — Main sync API endpoint
 *
 * POST — Trigger sync for all sources or a specific source
 *   Query params: ?source=bills&dryRun=true
 * GET  — Return sync status from ky_sources table
 *
 * Protected by SYNC_API_KEY bearer token.
 */
import { NextRequest, NextResponse } from 'next/server';
import { syncAll, getSyncStatus, SYNC_SOURCES } from '../../../lib/ky-sync-pipeline';

function authenticate(req: NextRequest): boolean {
  const apiKey = process.env.SYNC_API_KEY;
  if (!apiKey) {
    console.warn('[Sync API] SYNC_API_KEY not configured — rejecting all requests');
    return false;
  }
  const auth = req.headers.get('authorization');
  if (!auth) return false;
  const token = auth.replace(/^Bearer\s+/i, '');
  return token === apiKey;
}

export async function GET(req: NextRequest) {
  if (!authenticate(req)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

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

export async function POST(req: NextRequest) {
  if (!authenticate(req)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { searchParams } = new URL(req.url);
  const source = searchParams.get('source') || undefined;
  const dryRun = searchParams.get('dryRun') === 'true';
  const limitParam = searchParams.get('limit');
  const limit = limitParam ? parseInt(limitParam, 10) : undefined;

  try {
    const results = await syncAll({ source, dryRun, limit });
    const hasErrors = results.some(r => r.status === 'error');
    return NextResponse.json(
      { results, dryRun },
      { status: hasErrors ? 207 : 200 },
    );
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

