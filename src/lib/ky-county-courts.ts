/**
 * Kentucky County Fiscal Court Scraper (stretch goal)
 * Scrapes major county fiscal court websites for meeting minutes, budget decisions, resolutions
 * Starting with Jefferson and Fayette counties
 * No API key required
 */
import axios from 'axios';
import * as cheerio from 'cheerio';

export type CountyName = 'jefferson' | 'fayette';

export interface CountyAction {
  id: string;
  county: CountyName;
  title: string;
  date: string;
  type: string;
  url: string;
  summary: string;
}

export interface CountyActionDetail extends CountyAction {
  fullText: string;
  attachments: { name: string; url: string }[];
}

const COUNTY_URLS: Record<CountyName, { base: string; path: string }> = {
  jefferson: { base: 'https://louisvilleky.gov', path: '/government/fiscal-court' },
  fayette: { base: 'https://www.lexingtonky.gov', path: '/government/fiscal-court' },
};
const CACHE_TTL = 24 * 60 * 60 * 1000;
const MAX_RETRIES = 3;

export class KyCountyCourtsClient {
  private cache = new Map<string, { data: unknown; ts: number }>();

  private getCached<T>(key: string): T | null {
    const e = this.cache.get(key);
    if (e && Date.now() - e.ts < CACHE_TTL) return e.data as T;
    if (e) this.cache.delete(key);
    return null;
  }

  private async fetchPage(url: string): Promise<cheerio.CheerioAPI> {
    for (let i = 1; i <= MAX_RETRIES; i++) {
      try {
        const r = await axios.get(url, {
          headers: { 'User-Agent': 'Mozilla/5.0 (compatible; KnowYourVoteKYBot/1.0; +https://knowyourvotekentucky.org)' },
          timeout: 15000,
        });
        return cheerio.load(r.data);
      } catch (err: any) {
        console.error(`[KyCountyCourts] Fetch attempt ${i}/${MAX_RETRIES} for ${url}: ${err.message}`);
        if (i === MAX_RETRIES) throw err;
        await new Promise(r => setTimeout(r, 2000 * i));
      }
    }
    throw new Error('Unreachable');
  }

  async fetchCountyActions(county: CountyName): Promise<CountyAction[]> {
    const ck = `county-${county}`;
    const cached = this.getCached<CountyAction[]>(ck);
    if (cached) return cached;

    const { base, path } = COUNTY_URLS[county];
    console.log(`[KyCountyCourts] Fetching ${county} county actions`);
    const $ = await this.fetchPage(`${base}${path}`);
    const actions: CountyAction[] = [];

    $('article, .view-content .views-row, .list-item, li a[href*="fiscal"], li a[href*="meeting"], .agenda-item').each((_, el) => {
      const $el = $(el);
      const link = $el.find('a').first();
      const href = link.attr('href') || $el.attr('href') || '';
      const title = link.text().trim() || $el.find('h3, h4, .title').text().trim() || $el.text().trim();
      if (!title || title.length < 3) return;

      const fullUrl = href.startsWith('http') ? href : `${base}${href}`;
      const dateMatch = title.match(/(\w+ \d{1,2},?\s*\d{4}|\d{1,2}\/\d{1,2}\/\d{4})/);

      actions.push({
        id: href.split('/').pop() || `${county}-${actions.length}`,
        county,
        title: title.replace(/\s+/g, ' ').substring(0, 200),
        date: dateMatch?.[1] || '',
        type: 'fiscal-court',
        url: fullUrl,
        summary: $el.find('.summary, .description, p').first().text().trim().substring(0, 300),
      });
    });

    this.cache.set(ck, { data: actions, ts: Date.now() });
    return actions;
  }

  async fetchCountyActionDetail(id: string, county: CountyName): Promise<CountyActionDetail | null> {
    const ck = `county-detail-${county}-${id}`;
    const cached = this.getCached<CountyActionDetail>(ck);
    if (cached) return cached;

    console.log(`[KyCountyCourts] Fetching detail ${id} from ${county}`);
    const items = await this.fetchCountyActions(county);
    const item = items.find(i => i.id === id);
    if (!item) return null;

    try {
      const $ = await this.fetchPage(item.url);
      const content = $('article .field--name-body, .node__content, main .content, .page-content').text().trim();
      const attachments: { name: string; url: string }[] = [];
      $('a[href$=".pdf"], a[href$=".doc"], a[href$=".docx"]').each((_, el) => {
        const $a = $(el);
        const href = $a.attr('href') || '';
        attachments.push({ name: $a.text().trim(), url: href.startsWith('http') ? href : `${COUNTY_URLS[county].base}${href}` });
      });
      const detail: CountyActionDetail = { ...item, fullText: content.substring(0, 10000), attachments };
      this.cache.set(ck, { data: detail, ts: Date.now() });
      return detail;
    } catch (err: any) {
      console.error(`[KyCountyCourts] Failed detail for ${county}/${id}: ${err.message}`);
      return { ...item, fullText: '', attachments: [] };
    }
  }

  async fetchLatest(): Promise<CountyAction[]> {
    const [j, f] = await Promise.all([this.fetchCountyActions('jefferson'), this.fetchCountyActions('fayette')]);
    return [...j, ...f].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
  }

  async fetchById(id: string): Promise<CountyActionDetail | null> {
    const jeff = await this.fetchCountyActionDetail(id, 'jefferson');
    if (jeff) return jeff;
    return this.fetchCountyActionDetail(id, 'fayette');
  }

  async search(query: string): Promise<CountyAction[]> {
    const all = await this.fetchLatest();
    const q = query.toLowerCase();
    return all.filter(a => a.title.toLowerCase().includes(q) || a.summary.toLowerCase().includes(q));
  }
}

let _inst: KyCountyCourtsClient | null = null;
export function getKyCountyCourtsClient(): KyCountyCourtsClient {
  if (!_inst) _inst = new KyCountyCourtsClient();
  return _inst;
}

