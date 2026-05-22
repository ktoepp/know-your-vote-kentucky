import type { NextRequest } from 'next/server';

/** Supabase SSR auth cookies (`sb-*-auth-token`, chunked variants). */
export function requestHasSupabaseAuthCookie(request: NextRequest): boolean {
  return request.cookies.getAll().some((c) => {
    const name = c.name;
    return name.includes('auth-token') || (name.startsWith('sb-') && name.includes('auth'));
  });
}

/** Routes that must refresh the session even when no cookie is present yet (login flows). */
export function pathRequiresSessionRefresh(pathname: string): boolean {
  if (pathname.startsWith('/auth')) return true;
  if (pathname.startsWith('/profile')) return true;
  if (pathname.startsWith('/feed')) return true;
  if (pathname.startsWith('/api/me')) return true;
  if (pathname.startsWith('/api/bills/') && pathname.endsWith('/follow')) return true;
  if (pathname.startsWith('/api/committees/') && pathname.endsWith('/follow')) return true;
  return false;
}

export function shouldRefreshSupabaseSession(request: NextRequest): boolean {
  if (pathRequiresSessionRefresh(request.nextUrl.pathname)) return true;
  return requestHasSupabaseAuthCookie(request);
}
