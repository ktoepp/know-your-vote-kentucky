/**
 * GET /api/cron/notify — digest builder + Resend send (Bearer CRON_SECRET or SYNC_API_KEY).
 * Set DIGEST_DRY_RUN=true to log samples without sending. Requires RESEND_API_KEY + RESEND_FROM_EMAIL to send.
 */
import { NextRequest, NextResponse } from 'next/server';
import { runBillDigestCron } from '@/lib/digest/run-bill-digest-cron';

export const maxDuration = 120;

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
  if (!syncKey && !cronSecret) return false;
  if (syncKey && token === syncKey) return true;
  if (cronSecret && token === cronSecret) return true;
  return false;
}

export async function GET(req: NextRequest) {
  if (!authenticate(req)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const dryRun =
    process.env.DIGEST_DRY_RUN === 'true' || new URL(req.url).searchParams.get('dryRun') === 'true';
  try {
    const result = await runBillDigestCron({ dryRun });
    return NextResponse.json(result, { status: 200 });
  } catch (e) {
    console.error('[cron/notify]', e);
    return NextResponse.json(
      { ok: false, error: e instanceof Error ? e.message : String(e) },
      { status: 500 },
    );
  }
}
