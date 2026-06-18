/**
 * LegiScan API Client — Kentucky Legislature Bills & Votes
 * REST client for https://api.legiscan.com/
 * Free tier: 30,000 queries/month
 * Required env: LEGISCAN_API_KEY
 */
import axios, { AxiosInstance } from 'axios';
import { supabaseAdmin } from '../app/lib/supabaseAdminCore';

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

const CACHE_TTL = 24 * 60 * 60 * 1000;
const SESSIONS_PERSIST_TTL_MS = 7 * 24 * 60 * 60 * 1000;
const RATE_DELAY = 500;
const MAX_RETRIES = 5;
const REQUEST_TIMEOUT_MS = 60_000;

type PersistedKySessionsPayload = {
  sessions: LegiScanSession[];
  fetched_at: string;
};

export class KyLegiScanClient {
  private client: AxiosInstance;
  private apiKey: string;
  private cache = new Map<string, { data: unknown; ts: number }>();
  private lastReq = 0;

  constructor(apiKey?: string) {
    this.apiKey = apiKey || process.env.LEGISCAN_API_KEY || '';
    if (!this.apiKey) console.warn('[KyLegiScan] LEGISCAN_API_KEY not set');
    this.client = axios.create({
      baseURL: 'https://api.legiscan.com/',
      timeout: REQUEST_TIMEOUT_MS,
    });
  }

  private async throttle(): Promise<void> {
    const wait = RATE_DELAY - (Date.now() - this.lastReq);
    if (wait > 0) await new Promise(r => setTimeout(r, wait));
    this.lastReq = Date.now();
  }

  private getCached<T>(key: string): T | null {
    const e = this.cache.get(key);
    if (e && Date.now() - e.ts < CACHE_TTL) return e.data as T;
    if (e) this.cache.delete(key);
    return null;
  }

  private async request<T>(params: Record<string, string>): Promise<T> {
    const ck = JSON.stringify(params);
    const cached = this.getCached<T>(ck);
    if (cached) return cached;
    await this.throttle();
    for (let i = 1; i <= MAX_RETRIES; i++) {
      try {
        const r = await this.client.get('/', { params: { key: this.apiKey, ...params } });
        void this.incrementQueryCounter();
        if (r.data?.status === 'ERROR') throw new Error(`LegiScan: ${r.data.alert?.message || 'unknown error'}`);
        this.cache.set(ck, { data: r.data, ts: Date.now() });
        return r.data as T;
      } catch (err: any) {
        console.error(`[KyLegiScan] Attempt ${i}/${MAX_RETRIES} failed: ${err.message}`);
        if (i === MAX_RETRIES) throw err;
        const isTimeout =
          err.code === 'ECONNABORTED' || /timeout/i.test(String(err.message ?? ''));
        const delayMs = isTimeout ? 2000 * 2 ** (i - 1) : 1000 * i;
        await new Promise((r) => setTimeout(r, delayMs));
      }
    }
    throw new Error('Unreachable');
  }

  private static monthKey(d: Date = new Date()): string {
    return d.toISOString().slice(0, 7);
  }

  private async incrementQueryCounter(): Promise<void> {
    try {
      if (!supabaseAdmin) return;
      const month = KyLegiScanClient.monthKey();
      const { error } = await supabaseAdmin.rpc('ky_increment_counter', {
        counter_key: LEGISCAN_QUERY_COUNTER_KEY,
        bucket_key: month,
      });
      if (error) throw error;
    } catch (err: any) {
      console.warn(`[KyLegiScan] Failed to increment query counter: ${err?.message || err}`);
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

  private async readPersistedKySessions(): Promise<LegiScanSession[] | null> {
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
        if (ageMs > SESSIONS_PERSIST_TTL_MS) {
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

  async fetchSessions(): Promise<LegiScanSession[]> {
    console.log('[KyLegiScan] Fetching KY sessions');
    try {
      const d = await this.request<any>({ op: 'getSessionList', state: 'KY' });
      const sessions: LegiScanSession[] = d?.sessions || [];
      if (sessions.length > 0) {
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

  async fetchMasterListRaw(sessionId: number): Promise<LegiScanMasterListRawBill[]> {
    console.log(`[KyLegiScan] Fetching masterlistraw for session ${sessionId}`);
    const d = await this.request<any>({ op: 'getMasterListRaw', id: String(sessionId) });
    if (!d?.masterlist) return [];
    return Object.values(d.masterlist).filter((b: any) => b && b.bill_id) as LegiScanMasterListRawBill[];
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

  async fetchVotes(billId: number): Promise<LegiScanVote[]> {
    const detail = await this.fetchBillDetail(billId);
    if (!detail?.votes?.length) return [];
    const results: LegiScanVote[] = [];
    for (const v of detail.votes) {
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

