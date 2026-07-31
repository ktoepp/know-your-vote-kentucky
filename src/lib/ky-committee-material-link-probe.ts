/**
 * Shared reachability probe for LRC committee material links.
 *
 * Used by both the accuracy-audit materials checker (rotating sample) and
 * scripts/probe-committee-material-links.ts (full-coverage backfill / cron).
 * Results persist to `ky_committee_materials.link_status` (migration 031) so the
 * committee detail page can flag a known-dead link instead of linking to a 404.
 */
import axios from 'axios';
import type { SupabaseClient } from '@supabase/supabase-js';

export const MATERIAL_PROBE_HEADERS = {
  'User-Agent': 'KnowYourVoteKentucky/1.0 (+https://kyvky.com; link-probe)',
  // Accept: */* — LRC's IIS returns 406 Not Acceptable when Accept is text/html
  // and the file is a PDF/DOCX (which is nearly every material). That mislabeled
  // every valid link as ambiguous, so link_status stayed NULL and nothing ever
  // recorded as "ok".
  Accept: '*/*',
};

export const PROBE_TIMEOUT_MS = 15_000;

/** Persisted reachability of a material link. NULL = unknown/never probed. */
export type LinkStatus = 'ok' | 'dead';

/**
 * Probe a URL for reachability. Tries HEAD first, falls back to a Range GET when
 * the server rejects HEAD (405/501/403). Retries once on a transient failure.
 */
export async function probeUrl(url: string): Promise<{ ok: boolean; status: number }> {
  const attempt = async (method: 'head' | 'get') => {
    const res = await axios.request({
      url,
      method,
      timeout: PROBE_TIMEOUT_MS,
      maxRedirects: 5,
      validateStatus: () => true,
      headers: method === 'get' ? { ...MATERIAL_PROBE_HEADERS, Range: 'bytes=0-0' } : MATERIAL_PROBE_HEADERS,
    });
    return res.status;
  };
  const once = async () => {
    let status = await attempt('head');
    if (status === 405 || status === 501 || status === 403) {
      status = await attempt('get');
    }
    return status;
  };
  try {
    let status = await once();
    // One retry for transient timeouts/connection resets (status 0).
    if (status === 0) {
      await new Promise((r) => setTimeout(r, 500 + Math.random() * 500));
      status = await once();
    }
    return { ok: status >= 200 && status < 400, status };
  } catch {
    return { ok: false, status: 0 };
  }
}

/**
 * Map an HTTP probe status to a persisted link_status, or `null` to leave the
 * stored value untouched. Only definitive outcomes are recorded: 404 → dead,
 * 2xx/3xx → ok. Ambiguous results (timeouts, 403/5xx, status 0) return null so a
 * transient blip never flips a good link to dead.
 */
export function classifyLinkStatus(status: number): LinkStatus | null {
  if (status === 404) return 'dead';
  if (status >= 200 && status < 400) return 'ok';
  return null;
}

/** Persist a probe result for one material row. No-op when status is null. */
export async function persistMaterialLinkStatus(
  db: SupabaseClient,
  materialId: string,
  status: LinkStatus | null,
): Promise<void> {
  if (!status) return;
  await db
    .from('ky_committee_materials')
    .update({ link_status: status, link_checked_at: new Date().toISOString() })
    .eq('id', materialId);
}

/**
 * Run async tasks with a small concurrency cap + jitter to avoid burst timeouts.
 * Results are returned in input order.
 */
export async function mapWithConcurrency<T, R = void>(
  items: T[],
  limit: number,
  fn: (item: T) => Promise<R>,
): Promise<R[]> {
  let cursor = 0;
  const out = new Array<R>(items.length);
  const workers = Array.from({ length: Math.min(limit, items.length) }, async () => {
    while (cursor < items.length) {
      const index = cursor++;
      const item = items[index]!;
      await new Promise((r) => setTimeout(r, Math.random() * 250));
      out[index] = await fn(item);
    }
  });
  await Promise.all(workers);
  return out;
}
