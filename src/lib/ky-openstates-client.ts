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

export interface OpenStatesContactDetail {
  type?: string;
  value?: string;
  note?: string | null;
}

/** v3 /people?include=offices — capitol / district / primary contact (OSEP #6). */
export interface OpenStatesOffice {
  classification?: string;
  name?: string;
  address?: string | null;
  voice?: string | null;
  fax?: string | null;
  email?: string | null;
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
  phone?: string;
  /** Popolo-style list (some endpoints); prefer `include=offices` on v3 /people. */
  contact_details?: OpenStatesContactDetail[] | null;
  contactDetails?: OpenStatesContactDetail[] | null;
  /** v3: request `include=offices` for capitol / district phone and sometimes email. */
  offices?: OpenStatesOffice[] | null;
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

/**
 * Open States v3 /people: top-level `email` is often empty; use `include=offices` (or legacy `contact_details` when present).
 * Prefer `email` / `phone`, then `offices` (capitol first), then `contact_details` entries.
 */
export function extractOpenStatesContactDetails(leg: OpenStatesLegislator): {
  email: string | null;
  phone: string | null;
} {
  const details = leg.contact_details ?? leg.contactDetails;
  let email: string | null = (leg.email || '').trim() || null;
  let phone: string | null = (leg.phone || '').trim() || null;

  const offices = leg.offices;
  if (Array.isArray(offices) && offices.length > 0) {
    const cap = offices.find((o) => String(o?.classification || '').toLowerCase() === 'capitol');
    const primary = offices.find((o) => String(o?.classification || '').toLowerCase() === 'primary');
    const ordered = [cap, primary, ...offices].filter(Boolean) as OpenStatesOffice[];
    for (const o of ordered) {
      const em = typeof o?.email === 'string' ? o.email.trim() : '';
      if (!email && em && em.includes('@')) email = em;
      const vo = typeof o?.voice === 'string' ? o.voice.trim() : '';
      if (!phone && vo) phone = vo;
      if (email && phone) break;
    }
  }

  if (Array.isArray(details) && details.length > 0) {
    for (const c of details) {
      const t = String(c?.type || '')
        .trim()
        .toLowerCase();
      const v = typeof c?.value === 'string' ? c.value.trim() : '';
      if (!v) continue;
      if (!email) {
        if (t === 'email' || t === 'e-mail' || t.includes('email')) {
          if (v.includes('@')) email = v;
        }
      }
      if (!phone) {
        if (t === 'voice' || t === 'tel' || t === 'phone' || t.includes('phone')) {
          phone = v;
        }
      }
    }
  }
  return { email, phone };
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

function formatOpenStatesErrorBody(data: unknown): string {
  if (data == null) return '';
  if (typeof data === 'string') return data;
  try {
    return JSON.stringify(data);
  } catch {
    return String(data);
  }
}

/** Merge a second paged /people result (e.g. include=offices) into the links pass by `id`. */
function mergeLegislatorListById(
  primary: OpenStatesLegislator[],
  secondary: OpenStatesLegislator[],
): OpenStatesLegislator[] {
  const byId = new Map(secondary.map((p) => [p.id, p]));
  return primary.map((p) => {
    const s = byId.get(p.id);
    if (!s) return p;
    return {
      ...p,
      offices: s.offices ?? p.offices,
      email: p.email || s.email,
      phone: p.phone || s.phone,
      contact_details: s.contact_details ?? s.contactDetails ?? p.contact_details,
    };
  });
}

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
      /** Plural can be slow; 504s are common on cold / heavy /people. */
      timeout: 90_000,
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
        const status: number | undefined = err.response?.status;
        const raw = err.response?.data;
        const body = formatOpenStatesErrorBody(
          raw && typeof raw === 'object' && (Array.isArray((raw as { detail?: unknown }).detail) || 'detail' in (raw as object))
            ? raw
            : (raw as { detail?: unknown })?.detail ?? (raw as { message?: unknown })?.message ?? raw,
        );
        const msg = body || err.message;
        console.error(`[KyOpenStates] Attempt ${i}/${MAX_RETRIES}: ${err.message} (${status ?? '?'}) ${msg}`);

        if (status && status >= 400 && status < 500 && status !== 429) {
          throw new Error(
            `OpenStates API ${status}: ${msg || err.message}. If 422: check query (e.g. include). If 401: bad OPENSTATES_API_KEY. Docs: open.pluralpolicy.com`,
          );
        }
        if (i === MAX_RETRIES) {
          throw new Error(
            `OpenStates API ${status || 'error'}: ${msg || err.message}. Check OPENSTATES_API_KEY and network. Docs: open.pluralpolicy.com`,
          );
        }
        const isGateway = status === 502 || status === 503 || status === 504;
        const isTimeout = err.code === 'ECONNABORTED' || /timeout/i.test(String(err.message));
        const delay = isGateway || isTimeout ? 2000 * i : 1000 * i;
        await new Promise((r) => setTimeout(r, delay));
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

  /**
   * Paged /people. `include` must use v3-allowed values: other_names, other_identifiers, links, sources, offices
   * (not `contact_details` — that is not a valid /people list include on Plural v3).
   */
  private async fetchLegislatorPages(include: string[]): Promise<OpenStatesLegislator[]> {
    const all: OpenStatesLegislator[] = [];
    let page = 1;
    let hasMore = true;
    const jurisdiction = 'ocd-jurisdiction/country:us/state:ky/government';
    while (hasMore) {
      const data = await this.get<{ results: any[]; pagination: { max_page: number } }>('/people', {
        jurisdiction,
        per_page: '50',
        page: String(page),
        include,
      });
      const results = data?.results || [];
      all.push(...results);
      const maxPage = data?.pagination?.max_page ?? 1;
      hasMore = results.length === 50 && page < maxPage;
      page += 1;
    }
    return all;
  }

  async fetchLegislators(): Promise<OpenStatesLegislator[]> {
    console.log('[KyOpenStates] Fetching KY legislators (include=links,offices)');
    try {
      return await this.fetchLegislatorPages(['links', 'offices']);
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      if (!/422/.test(msg)) throw e;
      console.warn('[KyOpenStates] links+offices in one request returned 422; using two paged passes');
      const withLinks = await this.fetchLegislatorPages(['links']);
      try {
        const withOffices = await this.fetchLegislatorPages(['offices']);
        return mergeLegislatorListById(withLinks, withOffices);
      } catch (e2) {
        console.warn(
          '[KyOpenStates] offices pass failed; continuing with links only:',
          e2 instanceof Error ? e2.message : e2,
        );
        return withLinks;
      }
    }
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

