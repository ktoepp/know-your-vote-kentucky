/**
 * LegiScan API Client — Kentucky Legislature Bills & Votes
 * REST client for https://api.legiscan.com/
 * Free tier: 30,000 queries/month
 * Required env: LEGISCAN_API_KEY
 */
import axios, { AxiosInstance } from 'axios';

export interface LegiScanSession { session_id: number; state_id: number; year_start: number; year_end: number; session_name: string; special: number; }
export interface LegiScanBillSummary { bill_id: number; number: string; title: string; description: string; state: string; session_id: number; status: number; status_desc: string; last_action: string; last_action_date: string; url: string; }
export interface LegiScanSponsor { people_id: number; name: string; party: string; role: string; }
export interface LegiScanHistoryEntry { date: string; action: string; chamber: string; }
export interface LegiScanVoteSummary { roll_call_id: number; date: string; desc: string; yea: number; nay: number; }
export interface LegiScanBillDetail extends LegiScanBillSummary { sponsors: LegiScanSponsor[]; history: LegiScanHistoryEntry[]; votes: LegiScanVoteSummary[]; texts: { doc_id: number; date: string; type: string; url: string }[]; committee: { committee_id: number; name: string } | null; }
export interface LegiScanVote { roll_call_id: number; bill_id: number; date: string; desc: string; yea: number; nay: number; nv: number; absent: number; passed: number; votes: { people_id: number; vote_text: string; name: string }[]; }
export interface LegiScanSearchResult { relevance: number; bill_id: number; number: string; title: string; state: string; }

const CACHE_TTL = 24 * 60 * 60 * 1000;
const RATE_DELAY = 500;
const MAX_RETRIES = 3;

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
      timeout: 25_000,
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
        if (r.data?.status === 'ERROR') throw new Error(`LegiScan: ${r.data.alert?.message || 'unknown error'}`);
        this.cache.set(ck, { data: r.data, ts: Date.now() });
        return r.data as T;
      } catch (err: any) {
        console.error(`[KyLegiScan] Attempt ${i}/${MAX_RETRIES} failed: ${err.message}`);
        if (i === MAX_RETRIES) throw err;
        await new Promise(r => setTimeout(r, 1000 * i));
      }
    }
    throw new Error('Unreachable');
  }

  async fetchSessions(): Promise<LegiScanSession[]> {
    console.log('[KyLegiScan] Fetching KY sessions');
    const d = await this.request<any>({ op: 'getSessionList', state: 'KY' });
    return d?.sessions || [];
  }

  async fetchBills(sessionId: number): Promise<LegiScanBillSummary[]> {
    console.log(`[KyLegiScan] Fetching bills for session ${sessionId}`);
    const d = await this.request<any>({ op: 'getMasterList', id: String(sessionId) });
    if (!d?.masterlist) return [];
    return Object.values(d.masterlist).filter((b: any) => b.bill_id) as LegiScanBillSummary[];
  }

  async fetchBillDetail(billId: number): Promise<LegiScanBillDetail | null> {
    console.log(`[KyLegiScan] Fetching bill detail ${billId}`);
    const d = await this.request<any>({ op: 'getBill', id: String(billId) });
    return d?.bill || null;
  }

  async fetchVotes(billId: number): Promise<LegiScanVote[]> {
    const detail = await this.fetchBillDetail(billId);
    if (!detail?.votes?.length) return [];
    const results: LegiScanVote[] = [];
    for (const v of detail.votes) {
      const vd = await this.request<any>({ op: 'getRollCall', id: String(v.roll_call_id) });
      if (vd?.roll_call) results.push(vd.roll_call);
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
}

let _inst: KyLegiScanClient | null = null;
export function getKyLegiScanClient(): KyLegiScanClient {
  if (!_inst) _inst = new KyLegiScanClient();
  return _inst;
}

