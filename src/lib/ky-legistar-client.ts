/**
 * Legistar API Client — Louisville & Lexington local government
 * REST client for https://webapi.legistar.com/v1/{client}/
 * Adapter pattern for future PrimeGov migration (Louisville transitioning)
 * No API key required for Legistar Web API
 */
import axios, { AxiosInstance } from 'axios';

export type LegistarJurisdiction = 'louisville' | 'lexington';

/** Matter row from Legistar OData `matters` (fields optional when API omits them). */
export interface LegistarOrdinance {
  MatterId: number;
  MatterFile: string;
  MatterName: string | null;
  MatterTitle: string | null;
  MatterText1?: string | null;
  MatterRequester?: string | null;
  MatterTypeName?: string;
  MatterStatusName?: string;
  MatterIntroDate: string;
  MatterAgendaDate: string;
  MatterPassedDate: string | null;
  MatterBodyName: string;
}
export interface LegistarMeeting { EventId: number; EventBodyName: string; EventDate: string; EventTime: string; EventLocation: string; EventAgendaFile: string | null; EventMinutesFile: string | null; EventItems: LegistarEventItem[]; }
export interface LegistarEventItem { EventItemId: number; EventItemTitle: string; EventItemMatterId: number | null; EventItemActionName: string | null; EventItemPassedFlag: number | null; }

// --- Adapter interface for future PrimeGov swap ---
export interface LocalGovDataSource {
  fetchOrdinances(jurisdiction: LegistarJurisdiction): Promise<LegistarOrdinance[]>;
  fetchMeetings(jurisdiction: LegistarJurisdiction): Promise<LegistarMeeting[]>;
  fetchOrdinanceDetail(id: number, jurisdiction: LegistarJurisdiction): Promise<LegistarOrdinance | null>;
  fetchLatest(): Promise<LegistarOrdinance[]>;
  fetchById(id: string): Promise<LegistarOrdinance | null>;
  search(query: string): Promise<LegistarOrdinance[]>;
}

const CACHE_TTL = 24 * 60 * 60 * 1000;
const MAX_RETRIES = 3;
const JURISDICTION_MAP: Record<LegistarJurisdiction, string> = { louisville: 'louisville', lexington: 'lexington' };

export class KyLegistarClient implements LocalGovDataSource {
  private clients: Record<LegistarJurisdiction, AxiosInstance>;
  private cache = new Map<string, { data: unknown; ts: number }>();

  constructor() {
    this.clients = {
      louisville: axios.create({ baseURL: `https://webapi.legistar.com/v1/${JURISDICTION_MAP.louisville}/` }),
      lexington: axios.create({ baseURL: `https://webapi.legistar.com/v1/${JURISDICTION_MAP.lexington}/` }),
    };
  }

  private getCached<T>(key: string): T | null {
    const e = this.cache.get(key);
    if (e && Date.now() - e.ts < CACHE_TTL) return e.data as T;
    if (e) this.cache.delete(key);
    return null;
  }

  private async req<T>(jurisdiction: LegistarJurisdiction, path: string, params: Record<string, string> = {}): Promise<T> {
    const ck = `${jurisdiction}:${path}:${JSON.stringify(params)}`;
    const cached = this.getCached<T>(ck);
    if (cached) return cached;
    for (let i = 1; i <= MAX_RETRIES; i++) {
      try {
        const r = await this.clients[jurisdiction].get(path, {
          params,
          headers: { Accept: 'application/json' },
        });
        this.cache.set(ck, { data: r.data, ts: Date.now() });
        return r.data as T;
      } catch (err: any) {
        console.error(`[KyLegistar] ${jurisdiction} attempt ${i}/${MAX_RETRIES}: ${err.message}`);
        if (i === MAX_RETRIES) throw err;
        await new Promise(r => setTimeout(r, 1000 * i));
      }
    }
    throw new Error('Unreachable');
  }

  async fetchOrdinances(jurisdiction: LegistarJurisdiction): Promise<LegistarOrdinance[]> {
    console.log(`[KyLegistar] Fetching ordinances for ${jurisdiction}`);
    return this.req<LegistarOrdinance[]>(jurisdiction, 'matters', {
      $orderby: 'MatterIntroDate desc',
      $top: '100',
      $filter: "MatterIntroDate ge datetime'2000-01-01T00:00:00' and MatterIntroDate lt datetime'2035-01-01T00:00:00'",
    });
  }

  async fetchMeetings(jurisdiction: LegistarJurisdiction): Promise<LegistarMeeting[]> {
    console.log(`[KyLegistar] Fetching meetings for ${jurisdiction}`);
    return this.req<LegistarMeeting[]>(jurisdiction, 'events', { '$orderby': 'EventDate desc', '$top': '20' });
  }

  async fetchOrdinanceDetail(id: number, jurisdiction: LegistarJurisdiction): Promise<LegistarOrdinance | null> {
    console.log(`[KyLegistar] Fetching ordinance ${id} from ${jurisdiction}`);
    try { return await this.req<LegistarOrdinance>(jurisdiction, `matters/${id}`); }
    catch { return null; }
  }

  async fetchLatest(): Promise<LegistarOrdinance[]> {
    const [lou, lex] = await Promise.all([this.fetchOrdinances('louisville'), this.fetchOrdinances('lexington')]);
    return [...lou, ...lex].sort((a, b) => new Date(b.MatterIntroDate).getTime() - new Date(a.MatterIntroDate).getTime());
  }

  async fetchById(id: string): Promise<LegistarOrdinance | null> {
    const numId = Number(id);
    const lou = await this.fetchOrdinanceDetail(numId, 'louisville');
    if (lou) return lou;
    return this.fetchOrdinanceDetail(numId, 'lexington');
  }

  async search(query: string): Promise<LegistarOrdinance[]> {
    console.log(`[KyLegistar] Search: "${query}"`);
    const [lou, lex] = await Promise.all([
      this.req<LegistarOrdinance[]>('louisville', 'matters', { '$filter': `substringof('${query}', MatterTitle)`, '$top': '20' }),
      this.req<LegistarOrdinance[]>('lexington', 'matters', { '$filter': `substringof('${query}', MatterTitle)`, '$top': '20' }),
    ]);
    return [...lou, ...lex];
  }
}

let _inst: KyLegistarClient | null = null;
export function getKyLegistarClient(): KyLegistarClient {
  if (!_inst) _inst = new KyLegistarClient();
  return _inst;
}

