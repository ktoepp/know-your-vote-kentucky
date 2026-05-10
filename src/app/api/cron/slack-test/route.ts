/**
 * GET|POST /api/cron/slack-test — send one smoke-test message per Slack webhook slot.
 * Auth: Bearer CRON_SECRET or SYNC_API_KEY (same as other cron helpers).
 */
import { NextRequest, NextResponse } from 'next/server';
import { runSlackSmokeTest } from '@/lib/slack-webhook';

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
  const triggeredBy =
    req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ||
    req.headers.get('x-vercel-id') ||
    'GET /api/cron/slack-test';
  const results = await runSlackSmokeTest({ triggeredBy });
  return NextResponse.json({ ok: true, results });
}

export async function POST(req: NextRequest) {
  if (!authenticate(req)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  const triggeredBy =
    req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ||
    req.headers.get('x-vercel-id') ||
    'POST /api/cron/slack-test';
  const results = await runSlackSmokeTest({ triggeredBy });
  return NextResponse.json({ ok: true, results });
}
