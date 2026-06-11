/**
 * Parse LRC legislative record enrollment/executive actions HTML
 * (apps.legislature.ky.gov/record/{session}/enrollment_actions.html).
 *
 * Page structure (fixtures/lrc/legislative-record-enrollment-actions-26rs-live.html):
 *
 *   <h3>Enrollment/Executive Actions by Date</h3>
 *   <h4><strong>04/27/26</strong></h4>
 *     <h5><strong>Signed By Governor</strong></h5>
 *     <p>
 *       <span>House Bill</span><span><a href="hb869.html">869</a></span>
 *       <span>Senate Bill</span><span><a href="sb37.html">37</a>,</span>…
 *     </p>
 *
 * See docs/specs/session-record-spike-report.md § Phase 5b.
 */
import * as cheerio from 'cheerio';
import { normalizeBillNumberForLookup } from './lrc-session-label';

const RECORD_BASE = 'https://apps.legislature.ky.gov/record';

export interface LrcEnrollmentActionBillRef {
  billNumber: string;
  /** Lowercase href slug when present (e.g. hb869.html). */
  href: string | null;
}

export interface LrcEnrollmentActionEntry {
  /** ISO date YYYY-MM-DD parsed from the h4 label. */
  actionDate: string;
  /** Raw date label from the page (e.g. "04/27/26"). */
  actionDateLabel: string;
  /** Action heading text (e.g. "Signed By Governor"). */
  actionLabel: string;
  bills: LrcEnrollmentActionBillRef[];
}

export interface LrcEnrollmentActionsParseResult {
  sessionSlug: string;
  sourceUrl: string;
  entries: LrcEnrollmentActionEntry[];
  stats: {
    dateCount: number;
    actionGroupCount: number;
    billRefCount: number;
  };
}

/** Map `ky_bills.session` name → LRC record slug (`26rs`, `25ss`, …). */
export function kySessionToLrcRecordSlug(sessionName: string): string | null {
  const m = /^(\d{4})\s+(Regular|Extraordinary|Special)\s+Session$/i.exec(sessionName.trim());
  if (!m) return null;
  const yy = m[1]!.slice(2);
  const type = m[2]!.toLowerCase();
  return type === 'regular' ? `${yy}rs` : `${yy}ss`;
}

export function lrcEnrollmentActionsUrl(sessionSlug: string): string {
  return `${RECORD_BASE}/${sessionSlug}/enrollment_actions.html`;
}

function parseActionDateLabel(label: string): string | null {
  const m = label.match(/\b(\d{1,2})\/(\d{1,2})\/(\d{2,4})\b/);
  if (!m) return null;
  const month = m[1]!.padStart(2, '0');
  const day = m[2]!.padStart(2, '0');
  let year = Number(m[3]);
  if (year < 100) year += year >= 70 ? 1900 : 2000;
  return `${year}-${month}-${day}`;
}

const BILL_TYPE_PREFIX: Record<string, string> = {
  'house bill': 'HB',
  'senate bill': 'SB',
  'house joint resolution': 'HJR',
  'senate joint resolution': 'SJR',
  'house concurrent resolution': 'HCR',
  'senate concurrent resolution': 'SCR',
  'house resolution': 'HR',
  'senate resolution': 'SR',
};

function billNumberFromTypeAndNumber(typeLabel: string, num: string): string | null {
  const prefix = BILL_TYPE_PREFIX[typeLabel.trim().toLowerCase()];
  if (!prefix) return null;
  const n = num.replace(/[^\d]/g, '');
  if (!n) return null;
  return normalizeBillNumberForLookup(`${prefix}${n}`);
}

function extractBillRefsFromParagraph($: cheerio.CheerioAPI, $p: cheerio.Cheerio<any>): LrcEnrollmentActionBillRef[] {
  const refs: LrcEnrollmentActionBillRef[] = [];
  let currentType: string | null = null;

  $p.contents().each((_, node) => {
    if (node.type !== 'tag') return;
    const $el = $(node);
    const tag = node.name.toLowerCase();

    if (tag === 'span') {
      const text = $el.text().replace(/\s+/g, ' ').trim();
      if (BILL_TYPE_PREFIX[text.toLowerCase()]) {
        currentType = text;
        return;
      }
      const link = $el.find('a').first();
      if (link.length > 0 && currentType) {
        const num = link.text().trim();
        const billNumber = billNumberFromTypeAndNumber(currentType, num);
        if (billNumber) {
          refs.push({
            billNumber,
            href: link.attr('href') ?? null,
          });
        }
      }
    }

    if (tag === 'a' && currentType) {
      const billNumber = billNumberFromTypeAndNumber(currentType, $el.text());
      if (billNumber) {
        refs.push({
          billNumber,
          href: $el.attr('href') ?? null,
        });
      }
    }
  });

  return refs;
}

/**
 * @param html Full HTML body of enrollment_actions.html.
 * @param sessionSlug LRC record slug (e.g. `26rs`).
 */
export function parseEnrollmentActionsHtml(
  html: string,
  sessionSlug: string,
): LrcEnrollmentActionsParseResult {
  const $ = cheerio.load(html);
  const sourceUrl = lrcEnrollmentActionsUrl(sessionSlug);
  const entries: LrcEnrollmentActionEntry[] = [];

  const actionsHeader = $('h3')
    .filter((_, el) => /enrollment\/executive actions by date/i.test($(el).text()))
    .first();

  const startNode = actionsHeader.length > 0 ? actionsHeader : $('h4').first();
  if (startNode.length === 0) {
    return {
      sessionSlug,
      sourceUrl,
      entries: [],
      stats: { dateCount: 0, actionGroupCount: 0, billRefCount: 0 },
    };
  }

  let currentDate: string | null = null;
  let currentDateLabel = '';
  let currentAction: string | null = null;

  startNode.nextAll().each((_, el) => {
    const $el = $(el);
    const tag = el.name?.toLowerCase() ?? '';

    if (tag === 'h4') {
      const label = $el.text().replace(/\s+/g, ' ').trim();
      currentDateLabel = label;
      currentDate = parseActionDateLabel(label);
      currentAction = null;
      return;
    }

    if (tag === 'h5') {
      currentAction = $el.text().replace(/\s+/g, ' ').trim();
      return;
    }

    if (tag === 'p' && currentDate && currentAction) {
      const bills = extractBillRefsFromParagraph($, $el);
      if (bills.length === 0) return;
      entries.push({
        actionDate: currentDate,
        actionDateLabel: currentDateLabel,
        actionLabel: currentAction,
        bills,
      });
    }
  });

  const dateCount = new Set(entries.map((e) => e.actionDate)).size;
  const billRefCount = entries.reduce((n, e) => n + e.bills.length, 0);

  return {
    sessionSlug,
    sourceUrl,
    entries,
    stats: {
      dateCount,
      actionGroupCount: entries.length,
      billRefCount,
    },
  };
}
