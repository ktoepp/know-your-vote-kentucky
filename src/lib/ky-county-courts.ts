/**
 * Kentucky local-government meetings (Jefferson / Fayette) via **Legistar** public calendars.
 * Louisville and Lexington no longer expose stable fiscal-court HTML at the old civic URLs; Legistar
 * hosts official meeting grids that we can parse consistently.
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

/** Public Legistar calendar list (same vendor; HTML shape matches for parsing). */
const LEGISTAR_CALENDAR_URL: Record<CountyName, string> = {
  jefferson: 'https://louisville.legistar.com/Calendar.aspx',
  fayette: 'https://lexington.legistar.com/Calendar.aspx',
};

const BROWSER_UA =
  'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/123.0.0.0 Safari/537.36';

const CACHE_TTL = 24 * 60 * 60 * 1000;
const MAX_RETRIES = 3;
const FETCH_TIMEOUT_MS = 25_000;

function normalizeUsDate(raw: string): string {
  const t = raw.trim();
  if (!t) return '';
  const m = t.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);
  if (m) {
    const [, mo, d, y] = m;
    return `${y}-${mo.padStart(2, '0')}-${d.padStart(2, '0')}`;
  }
  const parsed = new Date(t);
  return Number.isNaN(parsed.getTime()) ? t : parsed.toISOString().slice(0, 10);
}

function parseSortTime(dateStr: string): number {
  const n = Date.parse(dateStr);
  return Number.isNaN(n) ? 0 : n;
}

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
        const r = await axios.get<string>(url, {
          headers: { 'User-Agent': BROWSER_UA, Accept: 'text/html,*/*' },
          timeout: FETCH_TIMEOUT_MS,
        });
        return cheerio.load(r.data);
      } catch (err: unknown) {
        const msg = err instanceof Error ? err.message : String(err);
        console.error(`[KyCountyCourts] Fetch attempt ${i}/${MAX_RETRIES} for ${url}: ${msg}`);
        if (i === MAX_RETRIES) throw err instanceof Error ? err : new Error(msg);
        await new Promise((r) => setTimeout(r, 2000 * i));
      }
    }
    throw new Error('Unreachable');
  }

  /**
   * Parse Telerik grid rows on Legistar Calendar.aspx (Name, Meeting Date, …, Meeting Details link).
   */
  private parseLegistarCalendar($: cheerio.CheerioAPI, calendarPageUrl: string, county: CountyName): CountyAction[] {
    const actions: CountyAction[] = [];
    const seen = new Set<string>();

    $('table.rgMasterTable tr.rgRow, table.rgMasterTable tr.rgAltRow').each((_, tr) => {
      const $tr = $(tr);
      const name = $tr.find('a[id$="hypBody"]').first().text().replace(/\s+/g, ' ').trim();
      const dateRaw = $tr.find('td.rgSorted').first().text().trim();
      const detailA = $tr.find('a[href*="MeetingDetail.aspx"]').first();
      const href = detailA.attr('href');
      if (!name || !href) return;

      const idMatch = href.match(/[?&]ID=(\d+)/i);
      const meetId = idMatch?.[1] ?? String(actions.length);
      const dedupKey = `${county}-${meetId}`;
      if (seen.has(dedupKey)) return;
      seen.add(dedupKey);

      const fullUrl = new URL(href, calendarPageUrl).href;
      const dateIso = normalizeUsDate(dateRaw);
      const title = dateRaw ? `${name} (${dateRaw})` : name;

      actions.push({
        id: dedupKey,
        county,
        title: title.substring(0, 240),
        date: dateIso || dateRaw,
        type: 'legistar-meeting',
        url: fullUrl,
        summary: $tr.find('td').eq(4).text().replace(/\s+/g, ' ').trim().substring(0, 300),
      });
    });

    return actions;
  }

  async fetchCountyActions(county: CountyName): Promise<CountyAction[]> {
    const ck = `county-${county}`;
    const cached = this.getCached<CountyAction[]>(ck);
    if (cached) return cached;

    const calendarPageUrl = LEGISTAR_CALENDAR_URL[county];
    console.log(`[KyCountyCourts] Fetching Legistar calendar for ${county}: ${calendarPageUrl}`);
    const $ = await this.fetchPage(calendarPageUrl);
    const actions = this.parseLegistarCalendar($, calendarPageUrl, county);

    this.cache.set(ck, { data: actions, ts: Date.now() });
    console.log(`[KyCountyCourts] Parsed ${actions.length} meeting row(s) for ${county}`);
    return actions;
  }

  async fetchCountyActionDetail(id: string, county: CountyName): Promise<CountyActionDetail | null> {
    const ck = `county-detail-${county}-${id}`;
    const cached = this.getCached<CountyActionDetail>(ck);
    if (cached) return cached;

    console.log(`[KyCountyCourts] Fetching detail ${id} from ${county}`);
    const items = await this.fetchCountyActions(county);
    const item = items.find((i) => i.id === id);
    if (!item) return null;

    try {
      const $ = await this.fetchPage(item.url);
      const origin = new URL(item.url).origin;
      const content = $('main, .content, #content, .legistop, body').text().trim();
      const attachments: { name: string; url: string }[] = [];
      $('a[href$=".pdf"], a[href$=".doc"], a[href$=".docx"]').each((_, el) => {
        const $a = $(el);
        const href = $a.attr('href') || '';
        if (!href) return;
        const abs = href.startsWith('http') ? href : new URL(href, origin).href;
        attachments.push({ name: $a.text().trim() || 'Document', url: abs });
      });
      const detail: CountyActionDetail = {
        ...item,
        fullText: content.substring(0, 10000),
        attachments,
      };
      this.cache.set(ck, { data: detail, ts: Date.now() });
      return detail;
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      console.error(`[KyCountyCourts] Failed detail for ${county}/${id}: ${msg}`);
      return { ...item, fullText: '', attachments: [] };
    }
  }

  async fetchLatest(): Promise<CountyAction[]> {
    const [rj, rf] = await Promise.allSettled([
      this.fetchCountyActions('jefferson'),
      this.fetchCountyActions('fayette'),
    ]);

    const jeff = rj.status === 'fulfilled' ? rj.value : [];
    const fay = rf.status === 'fulfilled' ? rf.value : [];

    if (rj.status === 'rejected') {
      console.error('[KyCountyCourts] Jefferson failed:', rj.reason instanceof Error ? rj.reason.message : rj.reason);
    }
    if (rf.status === 'rejected') {
      console.error('[KyCountyCourts] Fayette failed:', rf.reason instanceof Error ? rf.reason.message : rf.reason);
    }

    if (rj.status === 'rejected' && rf.status === 'rejected') {
      const a = rj.reason instanceof Error ? rj.reason.message : String(rj.reason);
      const b = rf.reason instanceof Error ? rf.reason.message : String(rf.reason);
      throw new Error(`Both Legistar calendars failed. Jefferson: ${a}; Fayette: ${b}`);
    }

    return [...jeff, ...fay].sort((a, b) => parseSortTime(b.date) - parseSortTime(a.date));
  }

  async fetchById(id: string): Promise<CountyActionDetail | null> {
    const jeff = await this.fetchCountyActionDetail(id, 'jefferson');
    if (jeff) return jeff;
    return this.fetchCountyActionDetail(id, 'fayette');
  }

  async search(query: string): Promise<CountyAction[]> {
    const all = await this.fetchLatest();
    const q = query.toLowerCase();
    return all.filter(
      (a) =>
        a.title.toLowerCase().includes(q) ||
        a.summary.toLowerCase().includes(q) ||
        a.date.toLowerCase().includes(q),
    );
  }
}

let _inst: KyCountyCourtsClient | null = null;
export function getKyCountyCourtsClient(): KyCountyCourtsClient {
  if (!_inst) _inst = new KyCountyCourtsClient();
  return _inst;
}
