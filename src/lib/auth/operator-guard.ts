import { NextResponse } from 'next/server';
import { isOperatorRequestAuthorized } from './shared-secret';

/**
 * Shared access check for operator routes (cron and sync). Accepts
 * `Authorization: Bearer <SYNC_API_KEY | CRON_SECRET>`.
 *
 * Start every exported handler with exactly:
 *
 * ```ts
 * const denied = await rejectUnlessOperator(req);
 * if (denied) return denied;
 * ```
 *
 * Returns null when the request is authorized, otherwise the 401 response to
 * send. With this shape a dropped `await` leaves `denied` as a Promise, which
 * is truthy, so the handler still returns early.
 */
export async function rejectUnlessOperator(req: Request): Promise<NextResponse | null> {
  if (await isOperatorRequestAuthorized(req.headers)) return null;
  return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
}
