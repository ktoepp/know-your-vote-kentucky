/**
 * LegiScan API Client — Kentucky Legislature Bills & Votes
 * REST client for https://api.legiscan.com/
 * Free tier: 10,000 queries/month and ~2 req/s sustained (from 2026-10-01)
 * Required env: LEGISCAN_API_KEY
 *
 * Quota accounting (WS4-02): the monthly counter counts every HTTP *attempt*,
 * recorded before the request is sent, so timeouts and retries that LegiScan
 * may still bill are included in the month total. Failed attempts (transport
 * error, timeout or non-2xx) are also counted on their own in
 * `legiscan_failed_attempt_counter`. A `status: "ERROR"` reply is a rejection
 * and is never retried, and a client with an empty key sends nothing.
 */
import axios, { AxiosInstance } from 'axios';
import { supabaseAdmin } from '../app/lib/supabaseAdminCore';
import {
  LEGISCAN_FAILED_ATTEMPT_COUNTER_KEY,
  LegiscanQuotaHoldError,
  checkLegiscanQuotaForSync,
  normalizeLegiscanOp,
} from './legiscan-quota';
import { currentLegiscanCaller } from './legiscan-caller';

export interface LegiScanSession { session_id: number; state_id: number; year_start: number; year_end: number; session_name: string; special: number; }
export interface LegiScanBillSummary { bill_id: number; number: string; title: string; description: string; state: string; session_id: number; status: number; status_desc: string; last_action: string; last_action_date: string; url: string; }
export interface LegiScanSponsor { people_id: number; name: string; party: string; role: string; }
export interface LegiScanHistoryEntry { date: string; action: string; chamber: string; }
export interface LegiScanVoteSummary { roll_call_id: number; date: string; desc: string; yea: number; nay: number; }
export interface LegiScanBillDetail extends LegiScanBillSummary { sponsors: LegiScanSponsor[]; history: LegiScanHistoryEntry[]; votes: LegiScanVoteSummary[]; texts: { doc_id: number; date: string; type: string; url: string }[]; committee: { committee_id: number; name: string } | null; introduced?: string; subjects?: { subject_id: number; subject_name: string }[]; }
export interface LegiScanVote {
  roll_call_id: number;
  bill_id: number;
  date: string;
  desc: string;
  yea: number;
  nay: number;
  nv: number;
  absent: number;
  passed: number;
  votes: { people_id: number; vote_text: string; name: string; vote_id?: number }[];
}
export interface LegiScanSearchResult { relevance: number; bill_id: number; number: string; title: string; state: string; }
export interface LegiScanMasterListRawBill { bill_id: number; number: string; change_hash: string; url: string; status_date: string; status: number; last_action_date: string; last_action: string; title: string; description: string; }
export interface LegiScanDatasetListEntry { state_id: number; session_id: number; session_name: string; session_title?: string; year_start: number; year_end: number; special: number; prior?: number; dataset_hash: string; dataset_date: string; dataset_size: number; access_key: string; }
export interface LegiScanDataset { state: string; session_id: number; session_name?: string; dataset_hash: string; dataset_date: string; dataset_size: number; mime: string; zip: string; }

export interface LegiScanPersonSocial {
  ballotpedia?: string;
  image?: string;
  email?: string;
  capitol_phone?: string;
  biography?: string;
}
export interface LegiScanPerson {
  people_id: number;
  name: string;
  first_name: string;
  last_name: string;
  party: string;
  role: string;
  district: string;
  /** LegiScan sometimes returns `[]` when extended bio is unavailable — see {@link legiscanPersonBioSocial}. */
  bio?: { social?: LegiScanPersonSocial } | unknown;
  ballotpedia?: string;
}

/**
 * `getPerson` may return `bio: []` instead of an object; only read `social` when `bio` is a plain object.
 */
export function legiscanPersonBioSocial(person: LegiScanPerson | null | undefined): LegiScanPersonSocial | undefined {
  const raw = person?.bio as unknown;
  if (raw == null || typeof raw !== 'object' || Array.isArray(raw)) return undefined;
  const social = (raw as { social?: LegiScanPersonSocial }).social;
  if (social == null || typeof social !== 'object') return undefined;
  return social;
}

/** Record from `getSessionPeople` (same core fields as getPerson for matching). */
export interface LegiScanSessionPerson {
  people_id: number;
  name: string;
  first_name: string;
  last_name: string;
  party: string;
  role: string;
  district: string;
}

const LEGISCAN_QUERY_COUNTER_KEY = 'legiscan_query_counter';
/** Persisted in `ky_sync_state` so cron/CLI runs can fall back when `getSessionList` is slow. */
const LEGISCAN_KY_SESSIONS_KEY = 'legiscan_ky_sessions';
/** Per-session `ky_sync_state` keys (`<prefix><session_id>`) backing the `getMasterListRaw` fallback. */
const LEGISCAN_KY_MASTERLIST_RAW_KEY_PREFIX = 'legiscan_ky_masterlist_raw_';

const CACHE_TTL = 24 * 60 * 60 * 1000;
const SESSIONS_PERSIST_TTL_MS = 7 * 24 * 60 * 60 * 1000;
/**
 * How fresh the persisted session list must be to skip `getSessionList`
 * entirely. The list changes a few times a year (a new session is created);
 * a day of lag is harmless, and it saves ~4 of the ~5 calls/day the syncs made.
 */
const SESSIONS_FRESH_MS = 24 * 60 * 60 * 1000;
const MASTERLIST_RAW_PERSIST_TTL_MS = 7 * 24 * 60 * 60 * 1000;
/**
 * Minimum gap between request starts, per process. LegiScan enforces a
 * sliding-window ~2 req/s sustained limit from 2026-10-01; 650 ms (~1.5 req/s)
 * leaves headroom for network jitter compressing gaps on the wire.
 */
const RATE_DELAY = 650;
const MAX_RETRIES = 5;
const REQUEST_TIMEOUT_MS = 60_000;
/** How long the client trusts its last quota-guard result before re-checking. */
const QUOTA_GUARD_TTL_MS = 60_000;

type PersistedKySessionsPayload = {
  sessions: LegiScanSession[];
  fetched_at: string;
};

type PersistedKyMasterListRawPayload = {
  bills: LegiScanMasterListRawBill[];
  fetched_at: string;
};

/**
 * LegiScan answered with `status: "ERROR"` (bad key, bad parameter, quota).
 * That is a completed, billable attempt and a refusal, so the client never
 * retries it.
 */
export class LegiscanRejectedError extends Error {
  readonly op: string | undefined;
  constructor(op: string | undefined, message: string) {
    super(message);
    this.name = 'LegiscanRejectedError';
    this.op = op;
  }
}

/**
 * The client has no API key. Thrown by `request()` before the quota check, the
 * throttle, the attempt counter or any HTTP call, so nothing is recorded or sent.
 */
export class LegiscanMissingKeyError extends Error {
  readonly op: string | undefined;
  constructor(op: string | undefined) {
    super('LegiScan API key is empty: refusing to send (see docs/data-budget.md)');
    this.name = 'LegiscanMissingKeyError';
    this.op = op;
  }
}

/**
 * Seams for tests. Every field is optional, and the defaults are the
 * production behaviour (axios, the Supabase counters, the quota guard and a
 * real timer).
 */
export type KyLegiScanClientDeps = {
  http?: Pick<AxiosInstance, 'get'>;
  /** Called once per HTTP attempt, before it is sent. */
  recordAttempt?: (op: string | undefined) => Promise<void>;
  /** Called once per failed attempt (transport error, timeout or non-2xx). */
  recordFailure?: (op: string | undefined) => Promise<void>;
  checkQuota?: typeof checkLegiscanQuotaForSync;
  /** Waits between retries. The request throttle is separate and unchanged. */
  sleep?: (ms: number) => Promise<void>;
};

function httpStatusOf(err: unknown): number | undefined {
  const status = (err as { response?: { status?: unknown } } | null)?.response?.status;
  return typeof status === 'number' ? status : undefined;
}

export class KyLegiScanClient {
  private client: Pick<AxiosInstance, 'get'>;
  private apiKey: string;
  private readonly recordAttempt: (op: string | undefined) => Promise<void>;
  private readonly recordFailure: (op: string | undefined) => Promise<void>;
  private readonly checkQuota: typeof checkLegiscanQuotaForSync;
  private readonly sleep: (ms: number) => Promise<void>;
  private cache = new Map<string, { data: unknown; ts: number }>();
  private lastReq = 0;
  /** Serializes throttle waits so concurrent callers can't read the same `lastReq` and fire together. */
  private throttleChain: Promise<void> = Promise.resolve();
  private quotaCheckedAt = 0;
  private quotaHoldReason: string | null = null;
  private quotaHoldSummary: Awaited<ReturnType<typeof checkLegiscanQuotaForSync>>['summary'] = null;

  /**
   * Never throws, even without a key: `getKyLegiScanClient()` is built eagerly
   * by callers that may only need other sources. A missing key is refused in
   * `request()` instead.
   */
  constructor(apiKey?: string, deps: KyLegiScanClientDeps = {}) {
    this.apiKey = (apiKey || process.env.LEGISCAN_API_KEY || '').trim();
    if (!this.apiKey) console.warn('[KyLegiScan] LEGISCAN_API_KEY not set');
    this.client =
      deps.http ??
      axios.create({
        baseURL: 'https://api.legiscan.com/',
        timeout: REQUEST_TIMEOUT_MS,
      });
    this.recordAttempt = deps.recordAttempt ?? ((op) => this.incrementQueryCounter(op));
    this.recordFailure = deps.recordFailure ?? (() => this.incrementFailedAttemptCounter());
    this.checkQuota = deps.checkQuota ?? checkLegiscanQuotaForSync;
    this.sleep = deps.sleep ?? ((ms) => new Promise((r) => setTimeout(r, ms)));
  }

  private throttle(): Promise<void> {
    const next = this.throttleChain.then(async () => {
      const wait = RATE_DELAY - (Date.now() - this.lastReq);
      if (wait > 0) await new Promise(r => setTimeout(r, wait));
      this.lastReq = Date.now();
    });
    this.throttleChain = next.catch(() => {});
    return next;
  }

  private getCached<T>(key: string): T | null {
    const e = this.cache.get(key);
    if (e && Date.now() - e.ts < CACHE_TTL) return e.data as T;
    if (e) this.cache.delete(key);
    return null;
  }

  private async ensureQuotaAllows(): Promise<void> {
    const now = Date.now();
    if (now - this.quotaCheckedAt > QUOTA_GUARD_TTL_MS) {
      this.quotaCheckedAt = now;
      const result = await this.checkQuota();
      this.quotaHoldReason = result.blocked ? result.reason ?? 'LegiScan quota hold' : null;
      this.quotaHoldSummary = result.summary;
    }
    if (this.quotaHoldReason) {
      throw new LegiscanQuotaHoldError(this.quotaHoldReason, this.quotaHoldSummary);
    }
  }

  /** Counting must never block a sync: a recorder that throws is logged and ignored. */
  private async safeRecord(
    kind: 'attempt' | 'failed attempt',
    record: (op: string | undefined) => Promise<void>,
    op: string | undefined,
  ): Promise<void> {
    try {
      await record(op);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      console.warn(`[KyLegiScan] Failed to record ${kind}: ${msg}`);
    }
  }

  private async request<T>(params: Record<string, string>): Promise<T> {
    const ck = JSON.stringify(params);
    const cached = this.getCached<T>(ck);
    if (cached) return cached;
    const op = params.op;
    // Before the quota check, the throttle, the counter and any HTTP call:
    // without a key nothing is recorded or sent.
    if (!this.apiKey) throw new LegiscanMissingKeyError(op);
    await this.ensureQuotaAllows();
    for (let i = 1; i <= MAX_RETRIES; i++) {
      // Retries are requests too — every attempt waits its turn.
      await this.throttle();
      // Counted before sending, so a timeout LegiScan may still bill is in the total.
      await this.safeRecord('attempt', this.recordAttempt, op);
      let data: any;
      try {
        const r = await this.client.get('/', { params: { key: this.apiKey, ...params } });
        if (typeof r?.status === 'number' && (r.status < 200 || r.status >= 300)) {
          // axios rejects non-2xx itself; this covers an http stub that does not.
          throw Object.assign(new Error(`LegiScan HTTP ${r.status}`), { response: { status: r.status } });
        }
        data = r?.data;
      } catch (err: unknown) {
        await this.safeRecord('failed attempt', this.recordFailure, op);
        const message = err instanceof Error ? err.message : String(err);
        console.error(`[KyLegiScan] Attempt ${i}/${MAX_RETRIES} failed: ${message}`);
        const retryable = isTransientLegiscanNetworkError(err) || httpStatusOf(err) === 429;
        if (!retryable || i === MAX_RETRIES) throw err;
        const isTimeout =
          (err as { code?: string }).code === 'ECONNABORTED' || /timeout/i.test(message);
        const delayMs = isTimeout ? 2000 * 2 ** (i - 1) : 1000 * i;
        await this.sleep(delayMs);
        continue;
      }
      // A rejection is a completed attempt, not a failure: never retried, never cached.
      if (data?.status === 'ERROR') {
        throw new LegiscanRejectedError(
          op,
          `LegiScan: ${data.alert?.message || 'unknown error'}`,
        );
      }
      this.cache.set(ck, { data, ts: Date.now() });
      return data as T;
    }
    throw new Error('Unreachable');
  }

  private static monthKey(d: Date = new Date()): string {
    return d.toISOString().slice(0, 7);
  }

  /**
   * Records one LegiScan attempt (counted before it is sent, whatever the
   * outcome) in three buckets of the same payload:
   * `YYYY-MM` (the month total, which is what the quota guard and the admin
   * page read), `YYYY-MM:op`, and `YYYY-MM:op@caller`.
   *
   * The month total is deliberately still its own bucket rather than a sum over
   * the breakdown, so the guard keeps working on rows written before this and
   * can't drift if an op ever slips through untagged.
   */
  private async incrementQueryCounter(op?: string): Promise<void> {
    try {
      if (!supabaseAdmin) return;
      const month = KyLegiScanClient.monthKey();
      const buckets = [month];
      const opKey = normalizeLegiscanOp(op);
      if (opKey) {
        buckets.push(`${month}:${opKey}`, `${month}:${opKey}@${currentLegiscanCaller()}`);
      }
      const { error } = await supabaseAdmin.rpc('ky_increment_counter_multi', {
        counter_key: LEGISCAN_QUERY_COUNTER_KEY,
        bucket_keys: buckets,
      });
      if (error) throw error;
    } catch (err: any) {
      console.warn(`[KyLegiScan] Failed to increment query counter: ${err?.message || err}`);
    }
  }

  /**
   * Records one failed attempt (transport error, timeout or non-2xx) in the
   * single `YYYY-MM` bucket of {@link LEGISCAN_FAILED_ATTEMPT_COUNTER_KEY}. The
   * same attempt is already in the main month total via `incrementQueryCounter`.
   */
  private async incrementFailedAttemptCounter(): Promise<void> {
    try {
      if (!supabaseAdmin) return;
      const { error } = await supabaseAdmin.rpc('ky_increment_counter_multi', {
        counter_key: LEGISCAN_FAILED_ATTEMPT_COUNTER_KEY,
        bucket_keys: [KyLegiScanClient.monthKey()],
      });
      if (error) throw error;
    } catch (err: any) {
      console.warn(`[KyLegiScan] Failed to increment failed-attempt counter: ${err?.message || err}`);
    }
  }

  async getMonthlyQueryCount(month?: string): Promise<number> {
    if (!supabaseAdmin) return 0;
    const m = month || KyLegiScanClient.monthKey();
    const { data, error } = await supabaseAdmin
      .from('ky_sync_state')
      .select('payload')
      .eq('key', LEGISCAN_QUERY_COUNTER_KEY)
      .maybeSingle();
    if (error) {
      console.warn(`[KyLegiScan] Failed to read query counter: ${error.message}`);
      return 0;
    }
    const payload = (data?.payload as Record<string, number> | null) ?? {};
    return payload[m] || 0;
  }

  private async readPersistedKySessions(maxAgeMs: number = SESSIONS_PERSIST_TTL_MS): Promise<LegiScanSession[] | null> {
    if (!supabaseAdmin) return null;
    try {
      const { data, error } = await supabaseAdmin
        .from('ky_sync_state')
        .select('payload, updated_at')
        .eq('key', LEGISCAN_KY_SESSIONS_KEY)
        .maybeSingle();
      if (error) {
        console.warn(`[KyLegiScan] Failed to read cached KY sessions: ${error.message}`);
        return null;
      }
      const payload = data?.payload as PersistedKySessionsPayload | null;
      const sessions = Array.isArray(payload?.sessions) ? payload.sessions : null;
      if (!sessions?.length) return null;
      const fetchedAt = payload?.fetched_at || data?.updated_at;
      if (fetchedAt) {
        const ageMs = Date.now() - new Date(fetchedAt).getTime();
        if (ageMs > maxAgeMs) {
          if (maxAgeMs < SESSIONS_PERSIST_TTL_MS) return null;
          console.warn(
            `[KyLegiScan] Cached KY sessions are stale (${Math.round(ageMs / 86_400_000)}d old); ignoring`,
          );
          return null;
        }
      }
      return sessions;
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      console.warn(`[KyLegiScan] Failed to read cached KY sessions: ${msg}`);
      return null;
    }
  }

  private async persistKySessions(sessions: LegiScanSession[]): Promise<void> {
    if (!supabaseAdmin || !sessions.length) return;
    try {
      const payload: PersistedKySessionsPayload = {
        sessions,
        fetched_at: new Date().toISOString(),
      };
      const { error } = await supabaseAdmin.from('ky_sync_state').upsert(
        {
          key: LEGISCAN_KY_SESSIONS_KEY,
          payload,
          updated_at: new Date().toISOString(),
        },
        { onConflict: 'key' },
      );
      if (error) throw error;
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      console.warn(`[KyLegiScan] Failed to persist KY sessions cache: ${msg}`);
    }
  }

  private async readPersistedKyMasterListRaw(
    sessionId: number,
  ): Promise<LegiScanMasterListRawBill[] | null> {
    if (!supabaseAdmin) return null;
    try {
      const { data, error } = await supabaseAdmin
        .from('ky_sync_state')
        .select('payload, updated_at')
        .eq('key', `${LEGISCAN_KY_MASTERLIST_RAW_KEY_PREFIX}${sessionId}`)
        .maybeSingle();
      if (error) {
        console.warn(`[KyLegiScan] Failed to read cached masterlistraw ${sessionId}: ${error.message}`);
        return null;
      }
      const payload = data?.payload as PersistedKyMasterListRawPayload | null;
      const bills = Array.isArray(payload?.bills) ? payload.bills : null;
      if (!bills?.length) return null;
      const fetchedAt = payload?.fetched_at || data?.updated_at;
      if (fetchedAt) {
        const ageMs = Date.now() - new Date(fetchedAt).getTime();
        if (ageMs > MASTERLIST_RAW_PERSIST_TTL_MS) {
          console.warn(
            `[KyLegiScan] Cached masterlistraw for session ${sessionId} is stale (${Math.round(ageMs / 86_400_000)}d old); ignoring`,
          );
          return null;
        }
      }
      return bills;
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      console.warn(`[KyLegiScan] Failed to read cached masterlistraw ${sessionId}: ${msg}`);
      return null;
    }
  }

  private async persistKyMasterListRaw(
    sessionId: number,
    bills: LegiScanMasterListRawBill[],
  ): Promise<void> {
    if (!supabaseAdmin || !bills.length) return;
    try {
      const payload: PersistedKyMasterListRawPayload = {
        bills,
        fetched_at: new Date().toISOString(),
      };
      const { error } = await supabaseAdmin.from('ky_sync_state').upsert(
        {
          key: `${LEGISCAN_KY_MASTERLIST_RAW_KEY_PREFIX}${sessionId}`,
          payload,
          updated_at: new Date().toISOString(),
        },
        { onConflict: 'key' },
      );
      if (error) throw error;
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      console.warn(`[KyLegiScan] Failed to persist masterlistraw cache ${sessionId}: ${msg}`);
    }
  }

  /**
   * `live` skips the day-old persisted copy and always spends one `getSessionList`
   * (the session preview uses it to see a just-published session). `persist: false`
   * leaves `ky_sync_state` untouched, for dry runs.
   */
  async fetchSessions(
    { live = false, persist = true }: { live?: boolean; persist?: boolean } = {},
  ): Promise<LegiScanSession[]> {
    if (!live) {
      const fresh = await this.readPersistedKySessions(SESSIONS_FRESH_MS);
      if (fresh?.length) return fresh;
    }
    console.log('[KyLegiScan] Fetching KY sessions');
    try {
      const d = await this.request<any>({ op: 'getSessionList', state: 'KY' });
      const sessions: LegiScanSession[] = d?.sessions || [];
      if (persist && sessions.length > 0) {
        await this.persistKySessions(sessions);
      }
      return sessions;
    } catch (err: unknown) {
      const cached = await this.readPersistedKySessions();
      if (cached?.length) {
        const msg = err instanceof Error ? err.message : String(err);
        console.warn(
          `[KyLegiScan] getSessionList failed (${msg}); using ${cached.length} cached KY session(s)`,
        );
        return cached;
      }
      throw err;
    }
  }

  async fetchBills(sessionId: number): Promise<LegiScanBillSummary[]> {
    console.log(`[KyLegiScan] Fetching bills for session ${sessionId}`);
    const d = await this.request<any>({ op: 'getMasterList', id: String(sessionId) });
    if (!d?.masterlist) return [];
    return Object.values(d.masterlist).filter((b: any) => b.bill_id) as LegiScanBillSummary[];
  }

  async fetchMasterListRaw(
    sessionId: number,
    { persist = true }: { persist?: boolean } = {},
  ): Promise<LegiScanMasterListRawBill[]> {
    console.log(`[KyLegiScan] Fetching masterlistraw for session ${sessionId}`);
    try {
      const d = await this.request<any>({ op: 'getMasterListRaw', id: String(sessionId) });
      if (!d?.masterlist) return [];
      const bills = Object.values(d.masterlist).filter(
        (b: any) => b && b.bill_id,
      ) as LegiScanMasterListRawBill[];
      if (persist && bills.length > 0) {
        await this.persistKyMasterListRaw(sessionId, bills);
      }
      return bills;
    } catch (err: unknown) {
      const cached = await this.readPersistedKyMasterListRaw(sessionId);
      if (cached?.length) {
        const msg = err instanceof Error ? err.message : String(err);
        console.warn(
          `[KyLegiScan] getMasterListRaw failed for session ${sessionId} (${msg}); using ${cached.length} cached bill(s)`,
        );
        return cached;
      }
      throw err;
    }
  }

  async fetchDatasetList(state: string = 'KY'): Promise<LegiScanDatasetListEntry[]> {
    console.log(`[KyLegiScan] Fetching dataset list for ${state}`);
    const d = await this.request<any>({ op: 'getDatasetList', state });
    return Array.isArray(d?.datasetlist) ? (d.datasetlist as LegiScanDatasetListEntry[]) : [];
  }

  async fetchDataset(sessionId: number, accessKey: string): Promise<LegiScanDataset | null> {
    console.log(`[KyLegiScan] Fetching dataset for session ${sessionId}`);
    const d = await this.request<any>({ op: 'getDataset', id: String(sessionId), access_key: accessKey });
    return (d?.dataset as LegiScanDataset) || null;
  }

  async fetchBillDetail(billId: number): Promise<LegiScanBillDetail | null> {
    console.log(`[KyLegiScan] Fetching bill detail ${billId}`);
    const d = await this.request<any>({ op: 'getBill', id: String(billId) });
    return d?.bill || null;
  }

  /** Full roll call (accurate yea/nay/nv/absent + per-member votes). Bill-embedded vote rows are sometimes incomplete. */
  async fetchRollCall(rollCallId: number): Promise<LegiScanVote | null> {
    const vd = await this.request<any>({ op: 'getRollCall', id: String(rollCallId) });
    return vd?.roll_call ? (vd.roll_call as LegiScanVote) : null;
  }

  /**
   * Roll calls for a bill. `skipRollCallIds` are ones the caller already has:
   * a roll call never changes once recorded, so re-fetching it only spends quota.
   */
  async fetchVotes(billId: number, skipRollCallIds?: ReadonlySet<number>): Promise<LegiScanVote[]> {
    const detail = await this.fetchBillDetail(billId);
    if (!detail?.votes?.length) return [];
    const results: LegiScanVote[] = [];
    for (const v of detail.votes) {
      if (skipRollCallIds?.has(v.roll_call_id)) continue;
      const rc = await this.fetchRollCall(v.roll_call_id);
      if (rc) results.push(rc);
    }
    return results;
  }

  async searchBills(query: string, state = 'KY'): Promise<LegiScanSearchResult[]> {
    console.log(`[KyLegiScan] Search: "${query}"`);
    const d = await this.request<any>({ op: 'getSearch', state, query });
    if (!d?.searchresult) return [];
    return Object.values(d.searchresult).filter((r: any) => r.bill_id).map((r: any) => ({
      relevance: r.relevance, bill_id: r.bill_id, number: r.number, title: r.title, state: r.state,
    }));
  }

  /** Fetch bills from the most recent session */
  async fetchLatest(): Promise<LegiScanBillSummary[]> {
    const sessions = await this.fetchSessions();
    if (!sessions.length) return [];
    return this.fetchBills(sessions[sessions.length - 1].session_id);
  }

  async fetchById(id: string): Promise<LegiScanBillDetail | null> {
    return this.fetchBillDetail(Number(id));
  }

  async search(query: string): Promise<LegiScanSearchResult[]> {
    return this.searchBills(query);
  }

  async getSessionPeople(sessionId: number): Promise<LegiScanSessionPerson[]> {
    const d = await this.request<any>({ op: 'getSessionPeople', id: String(sessionId) });
    const people = d?.sessionpeople?.people;
    if (!Array.isArray(people)) return [];
    return people.filter((p: any) => p && typeof p.people_id === 'number');
  }

  async getPerson(peopleId: number): Promise<LegiScanPerson | null> {
    const d = await this.request<any>({ op: 'getPerson', id: String(peopleId) });
    return d?.person || null;
  }
}

let _inst: KyLegiScanClient | null = null;
export function getKyLegiScanClient(): KyLegiScanClient {
  if (!_inst) _inst = new KyLegiScanClient();
  return _inst;
}

/**
 * True when `err` means "couldn't reach LegiScan" (transport-level timeout or
 * network failure, or a 502/503/504 gateway), as opposed to LegiScan rejecting
 * us (a `status: 'ERROR'` payload — bad key, quota, etc. — arrives as HTTP 200
 * and must NOT be treated as transient). LegiScan's public API is intermittently
 * slow: roughly one in three of the every-6h scheduled syncs sees every request
 * hit the client's 60s timeout across all {@link MAX_RETRIES} attempts.
 *
 * Lives here rather than in a consumer because it classifies errors this client
 * throws — `ky-sync-pipeline` and `scripts/sync-ky-dataset` both need the same
 * verdict, and two copies would drift.
 */
export function isTransientLegiscanNetworkError(err: unknown): boolean {
  if (!(err instanceof Error)) return false;
  const code = (err as { code?: string }).code ?? '';
  if (
    ['ECONNABORTED', 'ECONNRESET', 'ECONNREFUSED', 'ENOTFOUND', 'EAI_AGAIN', 'ETIMEDOUT'].includes(
      code,
    )
  ) {
    return true;
  }
  const status = (err as { response?: { status?: number } }).response?.status;
  if (typeof status === 'number' && status >= 502 && status <= 504) return true;
  return /timeout/i.test(err.message);
}
