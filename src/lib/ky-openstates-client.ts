/**
 * Open States API v3 Client — Kentucky Legislature (fallback)
 * GraphQL client for https://v3.openstates.org/graphql
 * Required env: OPENSTATES_API_KEY
 */
import axios, { AxiosInstance } from 'axios';

export interface OpenStatesBill { id: string; identifier: string; title: string; classification: string[]; subject: string[]; updatedAt: string; createdAt: string; session: string; jurisdiction: { name: string }; abstracts: { abstract: string }[]; actions: { description: string; date: string; classification: string[] }[]; sponsors: { name: string; classification: string }[]; }
export interface OpenStatesLegislator { id: string; name: string; party: string; currentRole: { title: string; district: string; chamber: string } | null; image: string; email: string; }

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
      baseURL: 'https://v3.openstates.org/graphql',
      headers: { 'X-API-KEY': this.apiKey, 'Content-Type': 'application/json' },
    });
  }

  private getCached<T>(key: string): T | null {
    const e = this.cache.get(key);
    if (e && Date.now() - e.ts < CACHE_TTL) return e.data as T;
    if (e) this.cache.delete(key);
    return null;
  }

  private async gql<T>(query: string, variables: Record<string, any> = {}): Promise<T> {
    const ck = JSON.stringify({ query, variables });
    const cached = this.getCached<T>(ck);
    if (cached) return cached;
    for (let i = 1; i <= MAX_RETRIES; i++) {
      try {
        const r = await this.client.post('', { query, variables });
        if (r.data.errors?.length) throw new Error(`OpenStates GQL: ${r.data.errors[0].message}`);
        this.cache.set(ck, { data: r.data.data, ts: Date.now() });
        return r.data.data as T;
      } catch (err: any) {
        console.error(`[KyOpenStates] Attempt ${i}/${MAX_RETRIES}: ${err.message}`);
        if (i === MAX_RETRIES) throw err;
        await new Promise(r => setTimeout(r, 1000 * i));
      }
    }
    throw new Error('Unreachable');
  }

  async fetchBills(params: { session?: string; query?: string; first?: number } = {}): Promise<OpenStatesBill[]> {
    console.log('[KyOpenStates] Fetching KY bills');
    const q = `query($jurisdiction: String!, $session: String, $searchQuery: String, $first: Int) {
      bills(jurisdiction: $jurisdiction, session: $session, searchQuery: $searchQuery, first: $first) {
        edges { node { id identifier title classification subject updatedAt createdAt session
          jurisdiction { name } abstracts { abstract }
          actions { description date classification }
          sponsors { name classification }
        }}
      }
    }`;
    const d = await this.gql<any>(q, { jurisdiction: 'Kentucky', session: params.session, searchQuery: params.query, first: params.first || 50 });
    return (d?.bills?.edges || []).map((e: any) => e.node);
  }

  async fetchLegislators(): Promise<OpenStatesLegislator[]> {
    console.log('[KyOpenStates] Fetching KY legislators');
    const q = `query($jurisdiction: String!) {
      people(jurisdiction: $jurisdiction, first: 200) {
        edges { node { id name party: primaryParty
          currentRole { title district: orgClassification chamber: orgClassification }
          image email
        }}
      }
    }`;
    const d = await this.gql<any>(q, { jurisdiction: 'Kentucky' });
    return (d?.people?.edges || []).map((e: any) => e.node);
  }

  async fetchBillDetail(id: string): Promise<OpenStatesBill | null> {
    console.log(`[KyOpenStates] Fetching bill ${id}`);
    const q = `query($id: String!) {
      bill(id: $id) { id identifier title classification subject updatedAt createdAt session
        jurisdiction { name } abstracts { abstract }
        actions { description date classification }
        sponsors { name classification }
      }
    }`;
    const d = await this.gql<any>(q, { id });
    return d?.bill || null;
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

