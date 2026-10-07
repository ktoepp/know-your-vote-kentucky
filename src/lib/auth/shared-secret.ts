/**
 * Shared-secret checks for operator endpoints (cron and sync routes) and the
 * `/admin` pages.
 *
 * Runs on both the Edge runtime (middleware) and Node (route handlers and
 * server components), so it uses only Web Crypto (`globalThis.crypto.subtle`)
 * and never imports Node built-in modules.
 *
 * Every check here is async. Call sites must `await` the result. Route
 * handlers should use `rejectUnlessOperator` from `./operator-guard`, whose
 * calling shape denies the request even if the `await` is dropped.
 *
 * Env values are read with literal `process.env.NAME` accesses (not through a
 * `process.env` object passed around) so that the Edge bundler sees which
 * variables the middleware needs.
 */

/** Result of the `/admin` access check. Compare against `'ok'`; never test it for truthiness. */
export type AdminAccess = 'ok' | 'not-configured' | 'denied';

/** Environment overrides, mainly for tests. When omitted, `process.env` is used. */
export type SecretEnv = Partial<NodeJS.ProcessEnv>;

/** Anything with a `get` method like `Headers` (including Next's read-only request headers). */
export type HeaderReader = Pick<Headers, 'get'>;

/** Request header that carries the operator token for `/admin` pages. */
export const ADMIN_TOKEN_HEADER = 'x-admin-token';

/**
 * Returns the token from an `Authorization: Bearer <token>` header, trimmed.
 * The `Bearer` prefix is matched case-insensitively. Returns null when the
 * header is missing or the token is empty.
 */
export function extractBearerToken(headers: HeaderReader): string | null {
  const auth = headers.get('authorization');
  if (!auth) return null;
  const token = auth.replace(/^Bearer\s+/i, '').trim();
  return token || null;
}

async function sha256(value: string): Promise<Uint8Array> {
  const bytes = new TextEncoder().encode(value);
  return new Uint8Array(await globalThis.crypto.subtle.digest('SHA-256', bytes));
}

/**
 * Compares two secrets in constant time with respect to their contents.
 * Both values are SHA-256 digested first, so the comparison always runs over
 * two 32-byte values whatever the input lengths. Returns false when either
 * side is empty or missing.
 */
export async function secretsMatch(
  provided: string | null | undefined,
  expected: string | null | undefined,
): Promise<boolean> {
  if (!provided || !expected) return false;
  const [a, b] = await Promise.all([sha256(provided), sha256(expected)]);
  let diff = a.length ^ b.length;
  for (let i = 0; i < a.length; i++) {
    diff |= a[i] ^ (b[i] ?? 0);
  }
  return diff === 0;
}

function readOperatorSecrets(env?: SecretEnv): { sync?: string; cron?: string } {
  const sync = (env ? env.SYNC_API_KEY : process.env.SYNC_API_KEY)?.trim() || undefined;
  const cron = (env ? env.CRON_SECRET : process.env.CRON_SECRET)?.trim() || undefined;
  return { sync, cron };
}

function readAdminSecret(env?: SecretEnv): string | undefined {
  return (env ? env.ADMIN_TOKEN : process.env.ADMIN_TOKEN)?.trim() || undefined;
}

let warnedOperatorSecretsMissing = false;

/**
 * True only when the request carries `Authorization: Bearer <token>` and the
 * token matches `SYNC_API_KEY` or `CRON_SECRET` (both trimmed). Returns false
 * when neither secret is configured.
 */
export async function isOperatorRequestAuthorized(
  headers: HeaderReader,
  env?: SecretEnv,
): Promise<boolean> {
  const { sync, cron } = readOperatorSecrets(env);
  if (!sync && !cron) {
    if (!warnedOperatorSecretsMissing) {
      warnedOperatorSecretsMissing = true;
      console.warn('[operator-auth] Neither SYNC_API_KEY nor CRON_SECRET is configured. Rejecting operator requests.');
    }
    return false;
  }
  const token = extractBearerToken(headers);
  if (!token) return false;
  // Check both secrets every time so timing does not depend on which one matched.
  const [matchesSync, matchesCron] = await Promise.all([
    secretsMatch(token, sync),
    secretsMatch(token, cron),
  ]);
  return matchesSync || matchesCron;
}

/**
 * Access decision for the `/admin` pages, based on `ADMIN_TOKEN` (trimmed) and
 * the `x-admin-token` request header:
 *
 * - `'not-configured'`: no `ADMIN_TOKEN` is set. Callers respond 404.
 * - `'denied'`: the header is missing, empty or wrong. Callers respond 401
 *   (middleware) or 404 (layout).
 * - `'ok'`: the header matches.
 */
export async function checkAdminAccess(headers: HeaderReader, env?: SecretEnv): Promise<AdminAccess> {
  const expected = readAdminSecret(env);
  if (!expected) return 'not-configured';
  const provided = headers.get(ADMIN_TOKEN_HEADER)?.trim() || null;
  return (await secretsMatch(provided, expected)) ? 'ok' : 'denied';
}
