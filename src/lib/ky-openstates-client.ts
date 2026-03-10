/**
 * Open States API v3 Client — Kentucky Legislature (fallback)
 * REST client for https://v3.openstates.org/
 * Required env: OPENSTATES_API_KEY
 */
import axios, { AxiosInstance } from 'axios';

export interface OpenStatesBill { id: string; identifier: string; title: string; classification: string[]; subject: string[]; updatedAt: string; createdAt: string; session: string; jurisdiction: { name: string }; abstracts: { abstract: string }[]; actions: { description: string; date: string; classification: string[] }[]; sponsors: { name: string; classification: string }[]; }
export interface OpenStatesLegislator {
  id: string;
  name: string;
  party: string;
  currentRole?: { title: string; district: string; org_classification: string } | null;
  image?: string;
  email?: string;
}

const CACHE_TTL = 24 * 60 * 60 * 1000;
const MAX_RETRIES = 3;

export class KyOpenStatesClient {
  private client: AxiosInstance;
  private apiKey: string;
  private cache = new Map<string, { data: unknown; ts: number }>();

  constructor(apiKey?: string) {
    this.apiKey = apiKey || process.env.OPENSTATES_API_KEY || '';
    if (!this.apiKey) console.warn('[KyOpenStates] OPENSTATES_API_KEY not set');
    this.client = axios.create({
      baseURL: 'https://v3.openstates.org',
      headers: { 'X-API-KEY': this.apiKey },
    });
  }

  private getCached<T>(key: string): T | null {
    const e = this.cache.get(key);
    if (e && Date.now() - e.ts < CACHE_TTL) return e.data as T;
    if (e) this.cache.delete(key);
    return null;
  }

  private async get<T>(path: string, params: Record<string, string | number> = {}): Promise<T> {
    const ck = path + JSON.stringify(params);
    const cached = this.getCached<T>(ck);
    if (cached) return cached;
    for (let i = 1; i <= MAX_RETRIES; i++) {
      try {
        const r = await this.client.get(path, { params });
        this.cache.set(ck, { data: r.data, ts: Date.now() });
        return r.data as T;
      } catch (err: any) {
        const status = err.response?.status;
        const body = err.response?.data?.detail || err.response?.data?.message || JSON.stringify(err.response?.data);
        console.error(`[KyOpenStates] Attempt ${i}/${MAX_RETRIES}: ${err.message} (${status}) ${body}`);
        if (i === MAX_RETRIES) {
          throw new Error(`OpenStates API ${status || 'error'}: ${body || err.message}. Check OPENSTATES_API_KEY at open.pluralpolicy.com/accounts/profile`);
        }
        await new Promise(r => setTimeout(r, 1000 * i));
      }
    }
    throw new Error('Unreachable');
  }

  async fetchBills(params: { session?: string; query?: string; first?: number } = {}): Promise<OpenStatesBill[]> {
    console.log('[KyOpenStates] Fetching KY bills');
    const jurisdiction = 'ocd-jurisdiction/country:us/state:ky/government';
    const data = await this.get<{ results: any[] }>('/bills', {
      jurisdiction,
      ...(params.session && { session: params.session }),
      ...(params.query && { q: params.query }),
      per_page: String(params.first || 50),
    });
    return data?.results || [];
  }

  async fetchLegislators(): Promise<OpenStatesLegislator[]> {
    console.log('[KyOpenStates] Fetching KY legislators');
    const all: OpenStatesLegislator[] = [];
    let page = 1;
    let hasMore = true;
    const jurisdiction = 'ocd-jurisdiction/country:us/state:ky/government';
    while (hasMore) {
      const data = await this.get<{ results: any[]; pagination: { max_page: number } }>('/people', {
        jurisdiction,
        per_page: '50',
        page: String(page),
      });
      const results = data?.results || [];
      all.push(...results);
      const maxPage = data?.pagination?.max_page ?? 1;
      hasMore = results.length === 50 && page < maxPage && page < 5;
      page++;
    }
    return all;
  }

  async fetchBillDetail(id: string): Promise<OpenStatesBill | null> {
    console.log(`[KyOpenStates] Fetching bill ${id}`);
    try {
      const data = await this.get<any>(`/bills/ocd-bill/${id}`);
      return data;
    } catch {
      return null;
    }
  }

  async fetchLatest(): Promise<OpenStatesBill[]> { return this.fetchBills({ first: 50 }); }
  async fetchById(id: string): Promise<OpenStatesBill | null> { return this.fetchBillDetail(id); }
  async search(query: string): Promise<OpenStatesBill[]> { return this.fetchBills({ query }); }
}

let _inst: KyOpenStatesClient | null = null;
export function getKyOpenStatesClient(): KyOpenStatesClient {
  if (!_inst) _inst = new KyOpenStatesClient();
  return _inst;
}

