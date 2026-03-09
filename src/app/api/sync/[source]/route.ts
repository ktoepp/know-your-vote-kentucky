/**
 * /api/sync/[source] — Per-source sync endpoint
 *
 * POST /api/sync/bills — Sync bills only
 * POST /api/sync/legislators — Sync legislators only
 * POST /api/sync/ordinances — Sync ordinances only
 * etc.
 *
 * Query params: ?dryRun=true
 * Protected by SYNC_API_KEY bearer token.
 */
import { NextRequest, NextResponse } from 'next/server';
import { syncAll, SYNC_SOURCES } from '../../../../lib/ky-sync-pipeline';

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

  try {
    const results = await syncAll({ source, dryRun });
    const result = results[0];
    return NextResponse.json(
      { result, dryRun },
      { status: result?.status === 'error' ? 500 : 200 },
    );
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

