/**
 * GET|POST /api/cron/slack-test — send one smoke-test message per Slack webhook slot.
 * Auth: Bearer CRON_SECRET or SYNC_API_KEY (same as other cron helpers).
 */
import { NextRequest, NextResponse } from 'next/server';
import { rejectUnlessOperator } from '@/lib/auth/operator-guard';
import { runSlackSmokeTest } from '@/lib/slack-webhook';

export async function GET(req: NextRequest) {
  const denied = await rejectUnlessOperator(req);
  if (denied) return denied;
  const triggeredBy =
    req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ||
    req.headers.get('x-vercel-id') ||
    'GET /api/cron/slack-test';
  const results = await runSlackSmokeTest({ triggeredBy });
  return NextResponse.json({ ok: true, results });
}

export async function POST(req: NextRequest) {
  const denied = await rejectUnlessOperator(req);
  if (denied) return denied;
  const triggeredBy =
    req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ||
    req.headers.get('x-vercel-id') ||
    'POST /api/cron/slack-test';
  const results = await runSlackSmokeTest({ triggeredBy });
  return NextResponse.json({ ok: true, results });
}
