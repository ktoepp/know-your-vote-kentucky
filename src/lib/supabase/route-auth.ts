import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import { NextResponse, type NextRequest } from 'next/server';

type Authed = {
  userId: string;
  token: string;
  /** Anon-key client carrying the user's JWT; RLS applies to all queries. */
  supabase: SupabaseClient;
};

type AuthFailure = { error: NextResponse };

/**
 * Validate the request's `Authorization: Bearer <jwt>` against Supabase Auth.
 * Returns either the authenticated user + a JWT-bearing client (for RLS-scoped queries)
 * or an `error` NextResponse the caller should return as-is.
 */
export async function getAuthedUser(request: NextRequest): Promise<Authed | AuthFailure> {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !anonKey) {
    return {
      error: NextResponse.json(
        { error: 'Server authentication is not configured.' },
        { status: 503 },
      ),
    };
  }

  const header = request.headers.get('authorization');
  const token = header?.startsWith('Bearer ') ? header.slice('Bearer '.length).trim() : null;
  if (!token) {
    return { error: NextResponse.json({ error: 'Missing bearer token.' }, { status: 401 }) };
  }

  const verifier = createClient(url, anonKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
  const { data, error } = await verifier.auth.getUser(token);
  if (error || !data?.user) {
    return { error: NextResponse.json({ error: 'Invalid or expired session.' }, { status: 401 }) };
  }

  const supabase = createClient(url, anonKey, {
    auth: { persistSession: false, autoRefreshToken: false },
    global: { headers: { Authorization: `Bearer ${token}` } },
  });

  return { userId: data.user.id, token, supabase };
}
