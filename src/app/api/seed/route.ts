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
    // Direct fetch probe to get detailed error (Supabase client masks fetch errors)
    const probeUrl = `${supabaseUrl.replace(/\/$/, '')}/rest/v1/ky_bills?select=id&limit=1`;
    let probeRes: Response;
    try {
      probeRes = await fetch(probeUrl, {
        headers: {
          apikey: serviceKey,
          Authorization: `Bearer ${serviceKey}`,
          'Content-Type': 'application/json',
        },
      });
    } catch (fetchErr: any) {
      const cause = fetchErr.cause?.code || fetchErr.cause?.message || fetchErr.cause;
      const host = supabaseUrl ? new URL(supabaseUrl).host : 'not set';
      return NextResponse.json({
        error: 'Cannot reach Supabase',
        message: fetchErr.message,
        cause: cause || undefined,
        host,
        hint: cause === 'ENOTFOUND' ? 'Verify this host matches Supabase Dashboard > Settings > API. Redeploy after changing Vercel env vars.' : 
              cause === 'ECONNREFUSED' ? 'Connection refused - project may be paused' : undefined,
      }, { status: 500 });
    }
    if (probeRes.status === 404) {
      return NextResponse.json({
        error: 'Tables not found',
        hint: 'Run supabase/migrations/001_kentucky_schema.sql and 002_indexes_and_rls.sql in Supabase SQL Editor',
      }, { status: 500 });
    }
    if (probeRes.status === 401 || probeRes.status === 403) {
      const body = await probeRes.text();
      return NextResponse.json({
        error: 'Invalid Supabase credentials',
        status: probeRes.status,
        hint: 'Ensure SUPABASE_SERVICE_ROLE_KEY matches the project for ' + supabaseUrl.split('.')[0].replace('https://', ''),
      }, { status: 500 });
    }
    if (!probeRes.ok) {
      return NextResponse.json({
        error: 'Supabase returned ' + probeRes.status,
        body: await probeRes.text(),
      }, { status: 500 });
    }

    const supabase = createClient(supabaseUrl, serviceKey);
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
