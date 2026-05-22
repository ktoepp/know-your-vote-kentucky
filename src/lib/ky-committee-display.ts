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

const COMMITTEE_PREFIX_PATTERNS: { kind: string; re: RegExp }[] = [
  { kind: 'house_standing', re: /^House Standing Committee on\s+/i },
  { kind: 'senate_standing', re: /^Senate Standing Committee on\s+/i },
  { kind: 'interim_joint', re: /^Interim Joint Committee on\s+/i },
  { kind: 'statutory', re: /^Statutory Committee on\s+/i },
  { kind: 'special', re: /^Special Committee on\s+/i },
];

export type ShortKyCommitteeLabel = {
  shortLabel: string;
  fullLabel: string;
  committeeKind: string | null;
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
