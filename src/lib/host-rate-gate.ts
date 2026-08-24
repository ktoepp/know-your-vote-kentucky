/**
 * Per-host politeness gate for outbound probe bursts.
 *
 * The legislator-link verifier runs a global pool of 6 concurrent probes. When
 * most of a batch lives on one host, all 6 land on that host at once, and
 * `legislature.ky.gov` throttles: run #18 (2026-07-20) returned 79
 * `lrc_profile_url` probes as HTTP 503 / status-0. Those are classified as
 * transient skips rather than failures, which is correct, but it means a
 * throttled run silently verifies nothing for that host — coverage traded for
 * speed without anyone choosing the trade.
 *
 * This caps a named host independently of the global pool: at most N in flight,
 * and a floor on the gap between request starts. Hosts with no entry are
 * untouched and still run at the global limit.
 */

export type HostLimit = {
  /** Max probes in flight against this host at once. */
  concurrency: number;
  /** Minimum gap between successive request starts, in ms. */
  minSpacingMs: number;
};

export type HostGate = <T>(fn: () => Promise<T>) => Promise<T>;

const defaultSleep = (ms: number) => new Promise<void>((r) => setTimeout(r, ms));

/**
 * One gate for one host. Retries belong *inside* the gated function so a
 * backing-off URL keeps its slot rather than releasing it to a fresh burst.
 */
export function makeHostGate(
  limit: HostLimit,
  deps: { now?: () => number; sleep?: (ms: number) => Promise<void> } = {},
): HostGate {
  const now = deps.now ?? Date.now;
  const sleep = deps.sleep ?? defaultSleep;

  let inFlight = 0;
  let nextStart = 0;
  const waiting: (() => void)[] = [];

  return async function gate<T>(fn: () => Promise<T>): Promise<T> {
    if (inFlight >= limit.concurrency) {
      await new Promise<void>((resolve) => waiting.push(resolve));
    }
    inFlight++;
    try {
      const t = now();
      const startAt = Math.max(t, nextStart);
      nextStart = startAt + limit.minSpacingMs;
      if (startAt > t) await sleep(startAt - t);
      return await fn();
    } finally {
      inFlight--;
      // Hand the slot to the next waiter, if any.
      waiting.shift()?.();
    }
  };
}

/**
 * Routes URLs to a per-host gate, creating each gate on first use. Returns null
 * for hosts with no configured limit (and for unparseable URLs), which the
 * caller should treat as "run ungated".
 */
export function makeHostGateRouter(limits: Record<string, HostLimit>) {
  const gates = new Map<string, HostGate>();
  return function gateForUrl(url: string): HostGate | null {
    let host: string;
    try {
      host = new URL(url).hostname.toLowerCase();
    } catch {
      return null;
    }
    const limit = limits[host];
    if (!limit) return null;
    let gate = gates.get(host);
    if (!gate) {
      gate = makeHostGate(limit);
      gates.set(host, gate);
    }
    return gate;
  };
}
