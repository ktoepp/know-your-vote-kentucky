/**
 * Kentucky School Board Scraper — JCPS & Fayette County
 * Scrapes jefferson.kyschools.us and fcps.net for board meeting agendas/decisions
 * No API key required
 */
import axios from 'axios';
import * as cheerio from 'cheerio';

export type SchoolDistrict = 'jcps' | 'fcps';

export interface SchoolBoardItem {
  id: string;
  district: SchoolDistrict;
  title: string;
  date: string;
  category: string;
  url: string;
  summary: string;
  voteResult: string;
}

export interface SchoolBoardItemDetail extends SchoolBoardItem {
  fullText: string;
  attachments: { name: string; url: string }[];
}

const DISTRICT_URLS: Record<SchoolDistrict, string> = {
  jcps: 'https://www.jefferson.kyschools.us',
  fcps: 'https://www.fcps.net',
};
const BOARD_PATHS: Record<SchoolDistrict, string> = {
  jcps: '/board/meetings',
  fcps: '/board-of-education/board-meetings',
};
const CACHE_TTL = 24 * 60 * 60 * 1000;
const MAX_RETRIES = 3;

export class KySchoolBoardsClient {
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
        console.error(`[KySchoolBoards] Fetch attempt ${i}/${MAX_RETRIES} for ${url}: ${err.message}`);
        if (i === MAX_RETRIES) throw err;
        await new Promise(r => setTimeout(r, 2000 * i));
      }
    }
    throw new Error('Unreachable');
  }

  async fetchBoardItems(district: SchoolDistrict): Promise<SchoolBoardItem[]> {
    const ck = `board-${district}`;
    const cached = this.getCached<SchoolBoardItem[]>(ck);
    if (cached) return cached;

    const base = DISTRICT_URLS[district];
    const path = BOARD_PATHS[district];
    console.log(`[KySchoolBoards] Fetching ${district} board items`);
    const $ = await this.fetchPage(`${base}${path}`);
    const items: SchoolBoardItem[] = [];

    $('article, .view-content .views-row, .list-item, .meeting-item, li a[href*="meeting"], .board-meeting').each((_, el) => {
      const $el = $(el);
      const link = $el.find('a').first();
      const href = link.attr('href') || $el.attr('href') || '';
      const title = link.text().trim() || $el.find('h3, h4, .title').text().trim() || $el.text().trim();
      if (!title || title.length < 3) return;

      const fullUrl = href.startsWith('http') ? href : `${base}${href}`;
      const dateMatch = title.match(/(\w+ \d{1,2},?\s*\d{4}|\d{1,2}\/\d{1,2}\/\d{4})/);

      items.push({
        id: href.split('/').pop() || `${district}-${items.length}`,
        district,
        title: title.replace(/\s+/g, ' ').substring(0, 200),
        date: dateMatch?.[1] || '',
        category: 'board-meeting',
        url: fullUrl,
        summary: $el.find('.summary, .description, p').first().text().trim().substring(0, 300),
        voteResult: '',
      });
    });

    this.cache.set(ck, { data: items, ts: Date.now() });
    return items;
  }

  async fetchBoardItemDetail(id: string, district: SchoolDistrict): Promise<SchoolBoardItemDetail | null> {
    const ck = `board-detail-${district}-${id}`;
    const cached = this.getCached<SchoolBoardItemDetail>(ck);
    if (cached) return cached;

    console.log(`[KySchoolBoards] Fetching detail ${id} from ${district}`);
    const items = await this.fetchBoardItems(district);
    const item = items.find(i => i.id === id);
    if (!item) return null;

    try {
      const $ = await this.fetchPage(item.url);
      const content = $('article .field--name-body, .node__content, main .content, .page-content').text().trim();
      const attachments: { name: string; url: string }[] = [];
      $('a[href$=".pdf"], a[href$=".doc"], a[href$=".docx"]').each((_, el) => {
        const $a = $(el);
        const href = $a.attr('href') || '';
        attachments.push({ name: $a.text().trim(), url: href.startsWith('http') ? href : `${DISTRICT_URLS[district]}${href}` });
      });
      const detail: SchoolBoardItemDetail = { ...item, fullText: content.substring(0, 10000), attachments };
      this.cache.set(ck, { data: detail, ts: Date.now() });
      return detail;
    } catch (err: any) {
      console.error(`[KySchoolBoards] Failed detail for ${district}/${id}: ${err.message}`);
      return { ...item, fullText: '', attachments: [] };
    }
  }

  async fetchLatest(): Promise<SchoolBoardItem[]> {
    const [j, f] = await Promise.all([this.fetchBoardItems('jcps'), this.fetchBoardItems('fcps')]);
    return [...j, ...f].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
  }

  async fetchById(id: string): Promise<SchoolBoardItemDetail | null> {
    const jcps = await this.fetchBoardItemDetail(id, 'jcps');
    if (jcps) return jcps;
    return this.fetchBoardItemDetail(id, 'fcps');
  }

  async search(query: string): Promise<SchoolBoardItem[]> {
    const all = await this.fetchLatest();
    const q = query.toLowerCase();
    return all.filter(i => i.title.toLowerCase().includes(q) || i.summary.toLowerCase().includes(q));
  }
}

let _inst: KySchoolBoardsClient | null = null;
export function getKySchoolBoardsClient(): KySchoolBoardsClient {
  if (!_inst) _inst = new KySchoolBoardsClient();
  return _inst;
}

