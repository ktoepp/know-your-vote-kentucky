import type { KYCommittee } from '@/types/kentucky';

export const LRC_LEGISLATIVE_CALENDAR_URL = 'https://apps.legislature.ky.gov/legislativecalendar';
export const LRC_COMMITTEES_INDEX_URL = 'https://legislature.ky.gov/Committees/Pages/default.aspx';

/** GA committee browse: House, Senate, or Joint (bicameral). Empty = no chamber filter. */
export type GaChamberFilter = 'house' | 'senate' | 'joint' | '';

const TITLE_CASE_SMALL_WORDS = new Set([
  'a',
  'an',
  'the',
  'and',
  'or',
  'of',
  'on',
  'in',
  'for',
  'to',
  'at',
  'by',
  'as',
]);

const TITLE_CASE_ACRONYMS = new Set(['lrc', 'ket', 'krc', 'jcps', 'fcps', 'it']);

function isMostlyUppercase(text: string): boolean {
  const letters = text.replace(/[^a-zA-Z]/g, '');
  if (letters.length < 4) return false;
  const upper = (letters.match(/[A-Z]/g) ?? []).length;
  return upper / letters.length >= 0.75;
}

function titleCaseToken(token: string, index: number): string {
  if (!token) return token;
  if (/^\([HS]\)$/i.test(token)) return token.toUpperCase();
  if (token === '&') return '&';

  const segments = token.split('/');
  if (segments.length > 1) {
    return segments.map((seg, i) => titleCaseToken(seg, index + i)).join('/');
  }

  const parts = token.split('-');
  if (parts.length > 1) {
    return parts.map((part, i) => titleCaseToken(part, index + i)).join('-');
  }

  const lower = token.toLowerCase();
  if (TITLE_CASE_ACRONYMS.has(lower)) return lower.toUpperCase();
  if (index > 0 && TITLE_CASE_SMALL_WORDS.has(lower)) return lower;
  return lower.charAt(0).toUpperCase() + lower.slice(1);
}

/**
 * LRC calendar and committee names often arrive in ALL CAPS. Convert to title case when needed.
 * Already-mixed-case strings (e.g. static committee registry) are left unchanged.
 */
export function normalizeKyGaDisplayName(text: string | null | undefined): string {
  if (!text?.trim()) return '';
  const trimmed = text.trim().replace(/\s+/g, ' ');
  if (!isMostlyUppercase(trimmed)) return trimmed;
  return trimmed.split(' ').map((word, i) => titleCaseToken(word, i)).join(' ');
}

/** @deprecated Alias — prefer {@link normalizeKyGaDisplayName}. */
export const formatKyGaCommitteeName = normalizeKyGaDisplayName;

export function normalizeKyGaAgendaLine(text: string | null | undefined): string {
  return normalizeKyGaDisplayName(text);
}

export function gaChamberFilterLabel(filter: GaChamberFilter): string {
  switch (filter) {
    case 'house':
      return 'House';
    case 'senate':
      return 'Senate';
    case 'joint':
      return 'Joint';
    default:
      return '';
  }
}

export function chamberLabel(chamber: KYCommittee['chamber'] | string | null | undefined): string {
  switch (String(chamber ?? '').toLowerCase()) {
    case 'house':
      return 'House';
    case 'senate':
      return 'Senate';
    case 'joint':
      return 'Joint';
    default:
      return 'General Assembly';
  }
}

export function formatKyMeetingDate(dateStr: string | null | undefined): string {
  if (!dateStr) return 'Date TBD';
  const d = new Date(`${dateStr}T12:00:00`);
  if (Number.isNaN(d.getTime())) return dateStr;
  return d.toLocaleDateString('en-US', {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
}

export function formatAgendaItemKind(kind: string | null | undefined): string | null {
  if (!kind || kind === 'other') return null;
  return kind.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase());
}

/** ISO date string (YYYY-MM-DD) for comparisons in local civic UI. */
export function kyTodayIso(): string {
  const d = new Date();
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

const COMMITTEE_PREFIX_PATTERNS: { kind: KyCommitteeKind; re: RegExp }[] = [
  { kind: 'house_subcommittee', re: /^House Standing Subcommittee on\s+/i },
  { kind: 'senate_subcommittee', re: /^Senate Standing Subcommittee on\s+/i },
  { kind: 'subcommittee', re: /^Subcommittee on\s+/i },
  { kind: 'house_standing', re: /^House Standing Committee on\s+/i },
  { kind: 'senate_standing', re: /^Senate Standing Committee on\s+/i },
  { kind: 'interim_joint', re: /^Interim Joint Committee on\s+/i },
  { kind: 'statutory', re: /^Statutory Committee on\s+/i },
  { kind: 'special', re: /^Special Committee on\s+/i },
];

export type KyCommitteeKind =
  | 'house_standing'
  | 'senate_standing'
  | 'house_subcommittee'
  | 'senate_subcommittee'
  | 'subcommittee'
  | 'interim_joint'
  | 'statutory'
  | 'special'
  | 'board'
  | 'oversight'
  | 'unknown';

const COMMITTEE_KIND_LABELS: Record<KyCommitteeKind, string> = {
  house_standing: 'House standing',
  senate_standing: 'Senate standing',
  house_subcommittee: 'House subcommittee',
  senate_subcommittee: 'Senate subcommittee',
  subcommittee: 'Subcommittee',
  interim_joint: 'Interim joint',
  statutory: 'Statutory',
  special: 'Special',
  board: 'Board',
  oversight: 'Oversight',
  unknown: 'Committee',
};

export function committeeKindLabel(kind: KyCommitteeKind): string {
  return COMMITTEE_KIND_LABELS[kind] ?? 'Committee';
}

function committeeTypeToKind(committeeType: string | null | undefined): KyCommitteeKind | null {
  const t = (committeeType ?? '').trim().toLowerCase();
  if (!t) return null;
  if (t.includes('interim joint')) return 'interim_joint';
  if (t.includes('house standing')) return 'house_standing';
  if (t.includes('senate standing')) return 'senate_standing';
  if (t.includes('statutory')) return 'statutory';
  if (t.includes('special')) return 'special';
  return null;
}

function nameHeuristicKind(fullLabel: string): KyCommitteeKind | null {
  const upper = fullLabel.toUpperCase();
  if (/\bBOARD\b/.test(upper)) return 'board';
  if (/\bOVERSIGHT\b/.test(upper)) return 'oversight';
  return null;
}

export type KyCommitteeKindInfo = {
  kind: KyCommitteeKind;
  shortLabel: string;
  fullLabel: string;
};

/** Resolve committee kind from LRC `committee_type` + normalized name patterns. */
export function resolveKyCommitteeKind(
  name: string | null | undefined,
  committeeType?: string | null,
): KyCommitteeKindInfo {
  const parsed = shortKyCommitteeLabel(name);
  if (parsed.committeeKind) {
    return {
      kind: parsed.committeeKind as KyCommitteeKind,
      shortLabel: parsed.shortLabel,
      fullLabel: parsed.fullLabel,
    };
  }

  const fromType = committeeTypeToKind(committeeType);
  if (fromType) {
    return { kind: fromType, shortLabel: parsed.shortLabel, fullLabel: parsed.fullLabel };
  }

  const heuristic = parsed.fullLabel ? nameHeuristicKind(parsed.fullLabel) : null;
  if (heuristic) {
    return { kind: heuristic, shortLabel: parsed.shortLabel, fullLabel: parsed.fullLabel };
  }

  return {
    kind: 'unknown',
    shortLabel: parsed.shortLabel,
    fullLabel: parsed.fullLabel,
  };
}

export type KyCommitteeParentRef = {
  label: string;
  href?: string;
};

/** When this row is a subcommittee, infer the parent standing committee for display/link. */
export function resolveKyCommitteeParent(
  name: string | null | undefined,
  kind: KyCommitteeKind,
  shortLabel: string,
  roster: ReadonlyArray<Pick<KYCommittee, 'slug' | 'name'>>,
): KyCommitteeParentRef | null {
  if (
    kind !== 'house_subcommittee' &&
    kind !== 'senate_subcommittee' &&
    kind !== 'subcommittee'
  ) {
    return null;
  }
  if (!shortLabel) return null;

  const standingPrefix =
    kind === 'house_subcommittee' || (kind === 'subcommittee' && /^house/i.test(name ?? ''))
      ? 'House Standing Committee on '
      : kind === 'senate_subcommittee' || (kind === 'subcommittee' && /^senate/i.test(name ?? ''))
        ? 'Senate Standing Committee on '
        : null;

  if (!standingPrefix) {
    return { label: `Subcommittee on ${shortLabel}` };
  }

  const parentName = normalizeKyGaDisplayName(`${standingPrefix}${shortLabel}`);
  const match = roster.find((c) => normalizeKyGaDisplayName(c.name) === parentName);
  return match
    ? { label: parentName, href: `/committees/${encodeURIComponent(match.slug)}` }
    : { label: parentName };
}

export type ShortKyCommitteeLabel = {
  shortLabel: string;
  fullLabel: string;
  committeeKind: KyCommitteeKind | null;
};

/** Strip LRC boilerplate prefixes for compact member-profile tiles. */
export function shortKyCommitteeLabel(name: string | null | undefined): ShortKyCommitteeLabel {
  const fullLabel = normalizeKyGaDisplayName(name);
  if (!fullLabel) return { shortLabel: '', fullLabel: '', committeeKind: null };

  for (const { kind, re } of COMMITTEE_PREFIX_PATTERNS) {
    if (re.test(fullLabel)) {
      return {
        shortLabel: fullLabel.replace(re, '').trim(),
        fullLabel,
        committeeKind: kind,
      };
    }
  }

  return { shortLabel: fullLabel, fullLabel, committeeKind: null };
}
