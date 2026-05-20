import { NextResponse, type NextRequest } from 'next/server';
import { getAuthedUser } from '@/lib/supabase/route-auth';
import { publicSiteOrigin } from '@/lib/site-canonical';

const MAX_SAVED = 20;
const MAX_LABEL = 120;
const MAX_HREF = 2048;

function normalizeHref(href: string): string | null {
  const trimmed = href.trim();
  if (!trimmed || trimmed.length > MAX_HREF) return null;
  if (trimmed.startsWith('/')) return trimmed;
  try {
    const origin = publicSiteOrigin();
    const u = new URL(trimmed);
    if (u.origin !== origin) return null;
    return `${u.pathname}${u.search}`;
  } catch {
    return null;
  }
}

export async function GET(request: NextRequest) {
  const auth = await getAuthedUser(request);
  if ('error' in auth) return auth.error;

  const { data, error } = await auth.supabase
    .from('ky_saved_searches')
    .select('id, label, href, created_at')
    .eq('user_id', auth.userId)
    .order('created_at', { ascending: false })
    .limit(MAX_SAVED);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ searches: data ?? [] });
}

export async function POST(request: NextRequest) {
  const auth = await getAuthedUser(request);
  if ('error' in auth) return auth.error;

  let body: { label?: string; href?: string };
  try {
    body = (await request.json()) as { label?: string; href?: string };
  } catch {
    return NextResponse.json({ error: 'Invalid JSON.' }, { status: 400 });
  }

  const label = typeof body.label === 'string' ? body.label.trim().slice(0, MAX_LABEL) : '';
  const href = typeof body.href === 'string' ? normalizeHref(body.href) : null;
  if (!label) {
    return NextResponse.json({ error: 'Label is required.' }, { status: 400 });
  }
  if (!href) {
    return NextResponse.json({ error: 'Invalid search link.' }, { status: 400 });
  }

  const { count, error: countErr } = await auth.supabase
    .from('ky_saved_searches')
    .select('id', { count: 'exact', head: true })
    .eq('user_id', auth.userId);

  if (countErr) {
    return NextResponse.json({ error: countErr.message }, { status: 500 });
  }
  if ((count ?? 0) >= MAX_SAVED) {
    return NextResponse.json({ error: `You can save up to ${MAX_SAVED} searches.` }, { status: 400 });
  }

  const { data, error } = await auth.supabase
    .from('ky_saved_searches')
    .insert({ user_id: auth.userId, label, href })
    .select('id, label, href, created_at')
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ search: data }, { status: 201 });
}

export async function DELETE(request: NextRequest) {
  const auth = await getAuthedUser(request);
  if ('error' in auth) return auth.error;

  const id = new URL(request.url).searchParams.get('id')?.trim();
  if (!id) {
    return NextResponse.json({ error: 'Missing id.' }, { status: 400 });
  }

  const { error } = await auth.supabase
    .from('ky_saved_searches')
    .delete()
    .eq('user_id', auth.userId)
    .eq('id', id);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}
