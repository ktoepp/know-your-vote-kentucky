import { NextRequest, NextResponse } from 'next/server';
import { kyLrcBillDetailsUrl } from '@/lib/external-legislative-links';

export const dynamic = 'force-dynamic';

const TIMEOUT_MS = 12_000;
const UA = 'KnowYourVoteKentucky/1.0 (+https://kyvky.com)';

function sanitizeLegislation(raw: string | null): string | null {
  const t = (raw ?? '').trim();
  if (!t || t.length > 56) return null;
  if (/[<>'"&]|javascript:/i.test(t)) return null;
  return t;
}

function sanitizeSession(raw: string | null): string {
  const t = (raw ?? '').trim();
  if (!t || t.length > 80) return '';
  if (/[<>'"&]/.test(t)) return '';
  return t;
}

function fetchOpts(method: 'HEAD' | 'GET', headers?: Record<string, string>): RequestInit {
  return {
    method,
    redirect: 'follow',
    signal: AbortSignal.timeout(TIMEOUT_MS),
    headers: { 'User-Agent': UA, Accept: '*/*', ...headers },
  };
}

/** True when the HTTP status is definitively 404 (omit UI link). Unknown errors → false (keep link). */
async function urlReturns404(url: string): Promise<boolean> {
  try {
    let res = await fetch(url, fetchOpts('HEAD'));
    if (res.status === 405 || res.status === 501) {
      res = await fetch(url, fetchOpts('GET', { Range: 'bytes=0-0' }));
    }
    return res.status === 404;
  } catch {
    try {
      const res = await fetch(url, fetchOpts('GET', { Range: 'bytes=0-0' }));
      return res.status === 404;
    } catch {
      try {
        const res = await fetch(url, fetchOpts('GET'));
        return res.status === 404;
      } catch {
        return false;
      }
    }
  }
}

export async function GET(req: NextRequest) {
  const legislation = sanitizeLegislation(req.nextUrl.searchParams.get('legislation'));
  const sessionRaw = sanitizeSession(req.nextUrl.searchParams.get('session'));
  if (!legislation) {
    return NextResponse.json({ error: 'Invalid legislation' }, { status: 400 });
  }

  const url = kyLrcBillDetailsUrl(legislation, sessionRaw || null);
  let parsed: URL;
  try {
    parsed = new URL(url);
  } catch {
    return NextResponse.json({ error: 'Bad URL' }, { status: 400 });
  }
  if (parsed.hostname !== 'legislature.ky.gov') {
    return NextResponse.json({ error: 'Host mismatch' }, { status: 400 });
  }

  const notFound = await urlReturns404(url);
  return NextResponse.json({ notFound });
}
