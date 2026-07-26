/**
 * Parse the LRC "Short Titles and Popular Names" index-heading page
 * (apps.legislature.ky.gov/record/{session}/7765.html).
 *
 * This is the authoritative, neutral source for a bill's official short title /
 * popular name (e.g. "Ally's Law", "C.R.O.W.N. Act", "Baby Dre Gun Safety Act").
 * The filename 7765.html is stable across sessions in the current record system
 * (22RS, 25RS both live there); the legacy system used numeric ids like 6650.htm.
 *
 * Page structure (fixtures/lrc/lrc-popular-names-25rs-live.html):
 *
 *   <h3>Short Titles and Popular Names</h3>
 *     <h4>Baby Dre Gun Safety Act</h4>
 *     <ul>
 *       <li><a href="HB120.html">House Bill 120</a></li>
 *       <li><a href="HB332.html">House Bill 332</a></li>
 *     </ul>
 *     <h4>Braylon's Law</h4>
 *     <ul>
 *       <li><a href="HB164.html">House Bill 164</a></li>
 *       <li><a href="HB164.html#HFA1">House Bill 164: House Floor Amendment (1)</a></li>
 *     </ul>
 *
 * One name can list several bills; several <li> can point at the same bill via
 * amendment anchors (deduped here). The <a href> filename ("HB164") is the
 * canonical bill-number source — cleaner than parsing the link text.
 *
 * See docs/specs/bill-popular-names.md.
 */
import * as cheerio from 'cheerio';
import { kySessionToLrcRecordSlug } from './lrc-enrollment-actions-parser';
import { normalizeBillNumberForLookup } from './lrc-session-label';

export { kySessionToLrcRecordSlug };

const RECORD_BASE = 'https://apps.legislature.ky.gov/record';

/** Bill-number prefixes the LRC uses in record filenames. */
const VALID_BILL_PREFIXES = new Set(['HB', 'SB', 'HR', 'SR', 'HJR', 'SJR', 'HCR', 'SCR']);

export interface LrcPopularNameBillRef {
  /** Normalized bill token (e.g. HB164). */
  billNumber: string;
  /** Lowercase href as it appears on the page (e.g. hb164.html#hfa1). */
  href: string;
}

export interface LrcPopularNameEntry {
  /** The short title / popular name from the <h4> (e.g. "Ally's Law"). */
  popularName: string;
  /** Distinct bills this name maps to (deduped across amendment anchors). */
  bills: LrcPopularNameBillRef[];
}

export interface LrcPopularNamesParseResult {
  sessionSlug: string;
  sourceUrl: string;
  entries: LrcPopularNameEntry[];
  stats: {
    nameCount: number;
    billRefCount: number;
    uniqueBillCount: number;
  };
}

export function lrcPopularNamesUrl(sessionSlug: string): string {
  return `${RECORD_BASE}/${sessionSlug}/7765.html`;
}

/** Extract the canonical bill token from a record href ("HB164.html#HFA1" → "HB164"). */
function billNumberFromHref(href: string): string | null {
  const file = href.split('#')[0]!.split('/').pop() ?? '';
  const m = /^([A-Za-z]{2,3}\d+)\.html?$/i.exec(file.trim());
  if (!m) return null;
  const token = normalizeBillNumberForLookup(m[1]!);
  const prefix = token.replace(/\d.*$/, '');
  if (!VALID_BILL_PREFIXES.has(prefix)) return null;
  return token;
}

function billsFromList($: cheerio.CheerioAPI, $ul: cheerio.Cheerio<any>): LrcPopularNameBillRef[] {
  const seen = new Set<string>();
  const bills: LrcPopularNameBillRef[] = [];

  $ul.find('a[href]').each((_, a) => {
    const href = ($(a).attr('href') ?? '').trim();
    const billNumber = billNumberFromHref(href);
    if (!billNumber || seen.has(billNumber)) return;
    seen.add(billNumber);
    bills.push({ billNumber, href: href.toLowerCase() });
  });

  return bills;
}

/**
 * @param html Full HTML body of the 7765.html popular-names page.
 * @param sessionSlug LRC record slug (e.g. `25rs`).
 */
export function parsePopularNamesHtml(
  html: string,
  sessionSlug: string,
): LrcPopularNamesParseResult {
  const $ = cheerio.load(html);
  const sourceUrl = lrcPopularNamesUrl(sessionSlug);
  const entries: LrcPopularNameEntry[] = [];

  const header = $('h3')
    .filter((_, el) => /short titles and popular names/i.test($(el).text()))
    .first();

  if (header.length === 0) {
    return {
      sessionSlug,
      sourceUrl,
      entries: [],
      stats: { nameCount: 0, billRefCount: 0, uniqueBillCount: 0 },
    };
  }

  let currentName: string | null = null;

  header.nextAll().each((_, el) => {
    const tag = el.name?.toLowerCase() ?? '';
    const $el = $(el);

    if (tag === 'h4') {
      currentName = $el.text().replace(/\s+/g, ' ').trim() || null;
      return;
    }

    if (tag === 'ul' && currentName) {
      const bills = billsFromList($, $el);
      if (bills.length > 0) {
        entries.push({ popularName: currentName, bills });
      }
      currentName = null;
    }
  });

  const uniqueBills = new Set<string>();
  let billRefCount = 0;
  for (const entry of entries) {
    for (const bill of entry.bills) {
      uniqueBills.add(bill.billNumber);
      billRefCount += 1;
    }
  }

  return {
    sessionSlug,
    sourceUrl,
    entries,
    stats: {
      nameCount: entries.length,
      billRefCount,
      uniqueBillCount: uniqueBills.size,
    },
  };
}

/**
 * Invert parsed entries into a per-bill map of short titles, preserving first-seen
 * order and de-duplicating case-insensitively. This is what the sync writes to
 * `ky_bills.official_short_titles`.
 */
export function popularNamesByBillNumber(
  result: LrcPopularNamesParseResult,
): Map<string, string[]> {
  const byBill = new Map<string, string[]>();

  for (const entry of result.entries) {
    for (const bill of entry.bills) {
      const list = byBill.get(bill.billNumber) ?? [];
      if (!list.some((n) => n.toLowerCase() === entry.popularName.toLowerCase())) {
        list.push(entry.popularName);
      }
      byBill.set(bill.billNumber, list);
    }
  }

  return byBill;
}
