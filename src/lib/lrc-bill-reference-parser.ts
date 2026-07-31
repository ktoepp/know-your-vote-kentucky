/**
 * Extract Kentucky bill/resolution references from LRC agenda prose.
 * Phase 0 — committee-calendar spec.
 */

export type LrcBillReferenceKind =
  | 'HB'
  | 'SB'
  | 'HJR'
  | 'SJR'
  | 'HCR'
  | 'SCR'
  | 'HR'
  | 'SR'
  | 'BR';

export interface LrcBillReference {
  kind: LrcBillReferenceKind;
  number: number;
  /** e.g. "2024 Regular Session" when present in parentheses */
  sessionLabel: string | null;
  /** Matched substring for debugging */
  raw: string;
}

const SESSION_IN_PARENS =
  /\(\s*((?:\d{4}\s+)?(?:Regular|Extraordinary|Special)\s+Session[^)]*)\)/i;

const SESSION_AFTER_HYPHEN =
  /-\s*((?:\d{4}\s+)?(?:Regular|Extraordinary|Special)\s+Session)\b/i;

/**
 * Session markers that apply to the whole agenda line, in the shapes LRC prose
 * actually uses — "25RS SB 15", "2024 RS HB 833", "26 RS HB 257", "RS 26 SB 8",
 * and the long form "2022 Regular Session SB 9". Scanned line-wide rather than
 * only after the bill token because LRC writes the session on either side of it.
 *
 * These matter more than they look: without them a line naming an *older*
 * session falls through to the meeting-date inference in the calendar sync,
 * which silently resolves to that bill number in the *current* session — a real
 * bill, just the wrong one. Ordered most-specific first; earliest match in the
 * line wins ties.
 */
const LINE_SESSION_PATTERNS: RegExp[] = [
  /\b(\d{4})\s+(Regular|Special|Extraordinary)\s+Session\b/i,
  /\b(\d{4})\s*(RS|SS|EX)\b/i,
  /\b(\d{2})\s*(RS|SS|EX)\b/i,
  /\b(RS|SS|EX)\s+(\d{2})\b/i,
];

const SESSION_KIND_LABELS: Record<string, string> = {
  RS: 'Regular Session',
  SS: 'Special Session',
  EX: 'Extraordinary Session',
  REGULAR: 'Regular Session',
  SPECIAL: 'Special Session',
  EXTRAORDINARY: 'Extraordinary Session',
};

/** Two-digit LRC years are 19xx only for the pre-Y2K archive. */
function expandSessionYear(token: string): number | null {
  const n = parseInt(token, 10);
  if (!Number.isFinite(n)) return null;
  if (token.length === 4) return n;
  return n >= 70 ? 1900 + n : 2000 + n;
}

function sessionLabelFromMatch(m: RegExpExecArray): string | null {
  // The reversed pattern ("RS 26") puts the kind first; every other one leads
  // with the year.
  const [, first = '', second = ''] = m;
  const yearToken = /^\d+$/.test(first) ? first : second;
  const kindToken = /^\d+$/.test(first) ? second : first;
  const year = expandSessionYear(yearToken);
  const kind = SESSION_KIND_LABELS[kindToken.toUpperCase()];
  if (year === null || !kind) return null;
  return `${year} ${kind}`;
}

function lineWideSessionLabel(text: string): string | null {
  let best: { index: number; label: string } | null = null;
  for (const re of LINE_SESSION_PATTERNS) {
    const m = re.exec(text);
    if (!m) continue;
    const label = sessionLabelFromMatch(m);
    if (label && (!best || m.index < best.index)) best = { index: m.index, label };
  }
  return best?.label ?? null;
}

const PATTERNS: { kind: LrcBillReferenceKind; re: RegExp }[] = [
  { kind: 'HB', re: /\bHouse\s+Bill\s+(\d+)\b/gi },
  { kind: 'SB', re: /\bSenate\s+Bill\s+(\d+)\b/gi },
  { kind: 'HJR', re: /\bHouse\s+Joint\s+Resolution\s+(\d+)\b/gi },
  { kind: 'SJR', re: /\bSenate\s+Joint\s+Resolution\s+(\d+)\b/gi },
  { kind: 'HCR', re: /\bHouse\s+Concurrent\s+Resolution\s+(\d+)\b/gi },
  { kind: 'SCR', re: /\bSenate\s+Concurrent\s+Resolution\s+(\d+)\b/gi },
  { kind: 'HR', re: /\bHouse\s+Resolution\s+(\d+)\b/gi },
  { kind: 'SR', re: /\bSenate\s+Resolution\s+(\d+)\b/gi },
  { kind: 'HB', re: /\bHB\s+(\d+)\b/g },
  { kind: 'SB', re: /\bSB\s+(\d+)\b/g },
  { kind: 'HJR', re: /\bHJR\s+(\d+)\b/g },
  { kind: 'SJR', re: /\bSJR\s+(\d+)\b/g },
  { kind: 'HCR', re: /\bHCR\s+(\d+)\b/g },
  { kind: 'SCR', re: /\bSCR\s+(\d+)\b/g },
  { kind: 'BR', re: /\bBR\s+(\d+)\b/g },
];

function sessionAfterIndex(text: string, endIndex: number): string | null {
  const tail = text.slice(endIndex, endIndex + 120);
  const paren = tail.match(SESSION_IN_PARENS);
  if (paren?.[1]) return paren[1].trim();
  const hyphen = tail.match(SESSION_AFTER_HYPHEN);
  if (hyphen?.[1]) return hyphen[1].trim();
  return null;
}

/** Dedupe key for references */
function refKey(r: LrcBillReference): string {
  return `${r.kind}-${r.number}-${r.sessionLabel ?? ''}`;
}

/**
 * Find bill/resolution references in agenda or calendar text.
 * Does not resolve to `ky_bills` rows — use session + number in sync layer.
 */
export function extractLrcBillReferences(text: string): LrcBillReference[] {
  if (!text?.trim()) return [];
  const found: LrcBillReference[] = [];
  const seen = new Set<string>();
  const shorthandSession = lineWideSessionLabel(text);

  for (const { kind, re } of PATTERNS) {
    const regex = new RegExp(re.source, re.flags);
    let m: RegExpExecArray | null;
    while ((m = regex.exec(text)) !== null) {
      const number = parseInt(m[1], 10);
      if (!Number.isFinite(number)) continue;
      const raw = m[0];
      const sessionLabel =
        sessionAfterIndex(text, m.index + raw.length) ?? shorthandSession;
      const ref: LrcBillReference = { kind, number, sessionLabel, raw };
      const key = refKey(ref);
      if (seen.has(key)) continue;
      seen.add(key);
      found.push(ref);
    }
  }

  return found.sort((a, b) => {
    if (a.kind !== b.kind) return a.kind.localeCompare(b.kind);
    if (a.number !== b.number) return a.number - b.number;
    return (a.sessionLabel ?? '').localeCompare(b.sessionLabel ?? '');
  });
}

/** LegiScan-style bill_number token for lookup (e.g. HB 6). */
export function lrcBillReferenceToBillNumber(ref: LrcBillReference): string {
  return `${ref.kind} ${ref.number}`;
}
