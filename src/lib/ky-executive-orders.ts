/**
 * Kentucky Governor Executive Orders Scraper
 * Scrapes governor.ky.gov for executive orders
 * No API key required
 */
import axios from 'axios';
import * as cheerio from 'cheerio';

export interface ExecutiveOrder {
  id: string;
  number: string;
  title: string;
  date: string;
  url: string;
  summary: string;
  governor: string;
}

export interface ExecutiveOrderDetail extends ExecutiveOrder {
  fullText: string;
}

const BASE_URL = 'https://governor.ky.gov';
/** Legacy listing (often 404); we scan multiple pages for PDF links. */
const EO_PATH = '/executive-orders';
/** Pages that may include direct links to /attachments/...Executive-Order....pdf (server-rendered portions). */
const DISCOVERY_PATHS = [EO_PATH, '/news', '/'];
const CACHE_TTL = 24 * 60 * 60 * 1000;
const MAX_RETRIES = 3;

export class KyExecutiveOrdersClient {
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
        console.error(`[KyEO] Fetch attempt ${i}/${MAX_RETRIES} for ${url}: ${err.message}`);
        if (i === MAX_RETRIES) throw err;
        await new Promise(r => setTimeout(r, 2000 * i));
      }
    }
    throw new Error('Unreachable');
  }

  async fetchExecutiveOrders(): Promise<ExecutiveOrder[]> {
    const ck = 'eo-list';
    const cached = this.getCached<ExecutiveOrder[]>(ck);
    if (cached) return cached;

    const orders: ExecutiveOrder[] = [];
    const seenUrl = new Set<string>();
    const toAbs = (href: string) =>
      href.startsWith('http') ? href : `${BASE_URL}${href.startsWith('/') ? href : `/${href}`}`;

    const addFromPdfHref = (href: string, titleText: string) => {
      if (!href) return;
      if (!/\/attachments\//i.test(href)) return;
      if (!/Executive-Order|executive-order/i.test(href)) return;
      const fullUrl = toAbs(href);
      if (seenUrl.has(fullUrl)) return;
      seenUrl.add(fullUrl);
      const fileSlug = href.split('/').pop() || '';
      const numberMatch =
        fileSlug.match(/(?:Executive-Order_|Executive-Order-)(\d{4}-\d{1,4})/i) ||
        fileSlug.match(/(\d{4}-\d{1,4})/);
      const dateMatch = fileSlug.match(/(\d{8})/);
      const isoHint =
        dateMatch?.[1] && dateMatch[1].length === 8
          ? `${dateMatch[1].slice(4, 6)}/${dateMatch[1].slice(6, 8)}/${dateMatch[1].slice(0, 4)}`
          : '';
      const title =
        titleText.replace(/\s+/g, ' ').trim().substring(0, 200) ||
        fileSlug.replace(/\.pdf$/i, '').replace(/[-_]/g, ' ');

      orders.push({
        id: numberMatch?.[1] || fileSlug,
        number: numberMatch?.[1] || '',
        title,
        date: isoHint,
        url: fullUrl,
        summary: '',
        governor: '',
      });
    };

    for (const path of DISCOVERY_PATHS) {
      try {
        console.log(`[KyEO] Discovering PDF links from ${BASE_URL}${path}`);
        const $ = await this.fetchPage(`${BASE_URL}${path}`);

        $('a[href*=".pdf"]').each((_, el) => {
          const href = $(el).attr('href') || '';
          const text = $(el).text().trim();
          addFromPdfHref(href, text);
        });

        $('article, .view-content .views-row, .field-content, li a[href*="executive-order"]').each((_, el) => {
          const $el = $(el);
          const link = $el.find('a').first();
          const href = link.attr('href') || $el.attr('href') || '';
          const title = link.text().trim() || $el.text().trim();
          if (!href) return;
          if (href.toLowerCase().includes('.pdf')) {
            addFromPdfHref(href, title);
            return;
          }
          if (!title || !href) return;
          const fullUrl = toAbs(href);
          const numberMatch = title.match(/(\d{4}-\d{3,4}|\d+-\d+)/);
          const dateMatch = title.match(/(\d{1,2}\/\d{1,2}\/\d{4})/);
          if (seenUrl.has(fullUrl)) return;
          seenUrl.add(fullUrl);
          orders.push({
            id: numberMatch?.[1] || href.split('/').pop() || '',
            number: numberMatch?.[1] || '',
            title: title.replace(/\s+/g, ' ').substring(0, 200),
            date: dateMatch?.[1] || '',
            url: fullUrl,
            summary: '',
            governor: '',
          });
        });
      } catch (err: any) {
        console.error(`[KyEO] Discovery failed for ${path}: ${err.message}`);
      }
    }

    if (orders.length === 0) {
      console.warn(
        '[KyEO] No executive orders found in static HTML. The governor site may render listings only in the browser; consider a headless fetch or an official index URL when available.',
      );
    } else {
      console.log(`[KyEO] Discovered ${orders.length} executive order link(s)`);
    }

    this.cache.set(ck, { data: orders, ts: Date.now() });
    return orders;
  }

  async fetchEODetail(id: string): Promise<ExecutiveOrderDetail | null> {
    const ck = `eo-${id}`;
    const cached = this.getCached<ExecutiveOrderDetail>(ck);
    if (cached) return cached;

    console.log(`[KyEO] Fetching EO detail: ${id}`);
    const orders = await this.fetchExecutiveOrders();
    const order = orders.find(o => o.id === id || o.number === id);
    if (!order) return null;

    try {
      const $ = await this.fetchPage(order.url);
      const content = $('article .field--name-body, .node__content, main .content').text().trim();
      const detail: ExecutiveOrderDetail = { ...order, fullText: content.substring(0, 10000) };
      this.cache.set(ck, { data: detail, ts: Date.now() });
      return detail;
    } catch (err: any) {
      console.error(`[KyEO] Failed to fetch detail for ${id}: ${err.message}`);
      return { ...order, fullText: '' };
    }
  }

  async fetchLatest(): Promise<ExecutiveOrder[]> { return this.fetchExecutiveOrders(); }
  async fetchById(id: string): Promise<ExecutiveOrderDetail | null> { return this.fetchEODetail(id); }
  async search(query: string): Promise<ExecutiveOrder[]> {
    const all = await this.fetchExecutiveOrders();
    const q = query.toLowerCase();
    return all.filter(o => o.title.toLowerCase().includes(q) || o.number.includes(q));
  }
}

let _inst: KyExecutiveOrdersClient | null = null;
export function getKyExecutiveOrdersClient(): KyExecutiveOrdersClient {
  if (!_inst) _inst = new KyExecutiveOrdersClient();
  return _inst;
}

