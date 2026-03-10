/**
 * POST /api/seed — Seed test data (protected by SYNC_API_KEY)
 * Runs on Vercel's servers which can reach Supabase.
 */
import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { runSeed } from '../../../lib/seed-test-data';

function authenticate(req: NextRequest): boolean {
  const apiKey = process.env.SYNC_API_KEY;
  if (!apiKey) return false;
  const auth = req.headers.get('authorization');
  if (!auth) return false;
  const token = auth.replace(/^Bearer\s+/i, '');
  return token === apiKey;
}

export async function POST(req: NextRequest) {
  if (!authenticate(req)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseUrl || !serviceKey) {
    return NextResponse.json({ error: 'Supabase not configured. Add NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY in Vercel env vars, then redeploy.' }, { status: 500 });
  }

  try {
    const supabase = createClient(supabaseUrl, serviceKey);
    // Quick connectivity check
    const { error: probe } = await supabase.from('ky_bills').select('id').limit(1);
    if (probe && probe.code === '42P01') {
      return NextResponse.json({
        error: 'Tables not found. Run migrations in Supabase SQL Editor: 001_kentucky_schema.sql and 002_indexes_and_rls.sql',
        hint: probe.message,
      }, { status: 500 });
    }
    if (probe) {
      return NextResponse.json({
        error: 'Supabase connection failed',
        code: probe.code,
        message: probe.message,
        hint: probe.code === 'PGRST301' ? 'Invalid API key or URL' : undefined,
      }, { status: 500 });
    }
    const result = await runSeed(supabase);
    return NextResponse.json(result);
  } catch (err: any) {
    const cause = err.cause?.message || err.cause?.code;
    return NextResponse.json({
      error: err.message,
      cause: cause || undefined,
      hint: cause === 'ENOTFOUND' ? 'Supabase URL may be wrong or project paused' : undefined,
    }, { status: 500 });
  }
}
