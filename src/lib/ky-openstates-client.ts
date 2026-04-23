/**
 * Open States API v3 Client — Kentucky Legislature (fallback)
 * REST client for https://v3.openstates.org/
 * Required env: OPENSTATES_API_KEY
 */
import axios, { AxiosInstance } from 'axios';

export interface OpenStatesBill { id: string; identifier: string; title: string; classification: string[]; subject: string[]; updatedAt: string; createdAt: string; session: string; jurisdiction: { name: string }; abstracts: { abstract: string }[]; actions: { description: string; date: string; classification: string[] }[]; sponsors: { name: string; classification: string }[]; }

/** Open States v3 returns snake_case `current_role` (not camelCase). */
export interface OpenStatesCurrentRole {
  title: string;
  district?: string | number | null;
  org_classification: string;
}

export interface OpenStatesLink {
  url: string;
  note?: string;
}

export interface OpenStatesLegislator {
  id: string;
  name: string;
  /** v3 API — use for DB `first_name` / `last_name` (avatars, sorting). */
  given_name?: string | null;
  family_name?: string | null;
  party: string;
  current_role?: OpenStatesCurrentRole | null;
  /** Some clients use camelCase; v3 JSON uses snake_case. */
  currentRole?: OpenStatesCurrentRole | null;
  /** Profile URLs (often includes legislature.ky.gov). */
  links?: OpenStatesLink[] | null;
  image?: string;
  email?: string;
}

/**
 * Split legislature.ky.gov profile vs other sites (campaign, etc.) from Open States `links`.
 */
export function extractOpenStatesLegislatorWebLinks(leg: OpenStatesLegislator): {
  lrcProfileUrl: string | null;
  otherWebsiteUrl: string | null;
} {
  const raw = leg.links;
  if (!Array.isArray(raw)) return { lrcProfileUrl: null, otherWebsiteUrl: null };
  let lrcProfileUrl: string | null = null;
  let otherWebsiteUrl: string | null = null;
  for (const item of raw) {
    const url = typeof item?.url === 'string' ? item.url.trim() : '';
    if (!url || !/^https?:\/\//i.test(url)) continue;
    const host = url.toLowerCase();
    if (host.includes('legislature.ky.gov')) {
      if (!lrcProfileUrl) lrcProfileUrl = url;
    } else if (!otherWebsiteUrl) {
      otherWebsiteUrl = url;
    }
  }
  return { lrcProfileUrl, otherWebsiteUrl };
}

/** Prefer API v3 snake_case role object. */
export function openStatesCurrentRole(leg: OpenStatesLegislator): OpenStatesCurrentRole | null | undefined {
  return leg.current_role ?? leg.currentRole ?? undefined;
}

/**
 * Map Open States `given_name` / `family_name` (or split `name`) for Supabase `first_name` / `last_name`.
 */
export function openStatesLegislatorNames(leg: OpenStatesLegislator): {
  first_name: string | null;
  last_name: string | null;
} {
  const g = leg.given_name?.trim() || null;
  const f = leg.family_name?.trim() || null;
  if (g || f) return { first_name: g, last_name: f };
  const parts = (leg.name || '').trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return { first_name: null, last_name: null };
  if (parts.length === 1) return { first_name: parts[0], last_name: null };
  return { first_name: parts[0], last_name: parts[parts.length - 1] };
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
      /** Open States uses repeated `include=` for array query params, not `include[]=`. */
      paramsSerializer: { indexes: null },
    });
  }

  private getCached<T>(key: string): T | null {
    const e = this.cache.get(key);
    if (e && Date.now() - e.ts < CACHE_TTL) return e.data as T;
    if (e) this.cache.delete(key);
    return null;
  }

  private async get<T>(path: string, params: Record<string, string | number | string[]> = {}): Promise<T> {
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
        /** PersonInclude enum: links (legislature.ky.gov profile URLs, etc.). */
        include: ['links'],
      });
      const results = data?.results || [];
      all.push(...results);
      const maxPage = data?.pagination?.max_page ?? 1;
      hasMore = results.length === 50 && page < maxPage;
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

