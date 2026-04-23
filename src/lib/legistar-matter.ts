/**
 * Map Legistar "matter" records into ky_ordinances fields with consistent quality rules.
 */

import { normalizeLegistarOrdinanceText } from './legistar-text';

export type LegistarMatterForOrdinance = {
  MatterId: number;
  MatterFile: string;
  MatterName: string | null;
  MatterTitle: string | null;
  MatterText1?: string | null;
  MatterRequester?: string | null;
  MatterTypeName?: string | null;
  MatterBodyName?: string | null;
  MatterIntroDate: string;
  MatterPassedDate?: string | null;
};

/** ISO date-only (YYYY-MM-DD) for Postgres DATE columns, or null. */
export function parseLegistarApiDate(value: string | null | undefined): string | null {
  if (value == null || String(value).trim() === '') return null;
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return null;
  return d.toISOString().slice(0, 10);
}

/** Drop obvious Legistar sandbox / placeholder rows from public listings. */
export function isLegistarMatterLikelyTestNoise(ord: LegistarMatterForOrdinance): boolean {
  const combinedRaw = [ord.MatterTitle, ord.MatterName].filter(Boolean).join(' ') || ord.MatterFile || '';
  const combined = normalizeLegistarOrdinanceText(combinedRaw);
  if (!combined) return false;
  if (/^\s*test\b/i.test(combined)) return true;
  if (/\(test\)/i.test(combined)) return true;
  if (/\btest for\b/i.test(combined)) return true;
  return false;
}

/**
 * Title is the short name when present; long MatterTitle becomes description only when it differs.
 * Avoids storing the same long text in both title and description (common when MatterName is null).
 */
export function splitLegistarMatterTitleAndDescription(ord: LegistarMatterForOrdinance): {
  title: string;
  description: string | null;
} {
  const fileNorm = normalizeLegistarOrdinanceText(ord.MatterFile || '');
  const nameNorm =
    ord.MatterName != null && ord.MatterName.trim() !== '' ? normalizeLegistarOrdinanceText(ord.MatterName) : '';
  const titleNorm =
    ord.MatterTitle != null && ord.MatterTitle.trim() !== '' ? normalizeLegistarOrdinanceText(ord.MatterTitle) : '';

  const title = nameNorm || titleNorm || fileNorm || 'Untitled matter';
  let description: string | null = null;

  if (nameNorm && titleNorm && nameNorm !== titleNorm) {
    description = titleNorm;
  }

  return { title, description };
}

export function normalizeLegistarOrdinanceNumber(file: string | null | undefined): string | null {
  if (file == null || String(file).trim() === '') return null;
  const n = normalizeLegistarOrdinanceText(String(file));
  return n || null;
}

export function buildOrdinanceSponsorsJson(ord: LegistarMatterForOrdinance): Record<string, unknown> | null {
  const payload: Record<string, unknown> = {};
  const req = ord.MatterRequester != null ? normalizeLegistarOrdinanceText(ord.MatterRequester) : '';
  if (req) payload.requester = req;
  const body = ord.MatterBodyName != null ? normalizeLegistarOrdinanceText(ord.MatterBodyName) : '';
  if (body) payload.body = body;
  if (Object.keys(payload).length === 0) return null;
  return payload;
}

export function matterTopicsFromLegistar(ord: LegistarMatterForOrdinance): string[] | null {
  const t = ord.MatterTypeName?.trim();
  if (!t) return null;
  const norm = normalizeLegistarOrdinanceText(t);
  return norm ? [norm] : null;
}

export type ParsedOrdinanceSponsorsPayload = {
  requester?: string;
  body?: string;
  names: string[];
};

/** Read ky_ordinances.sponsors JSON written by sync (and optional future API sponsor arrays). */
export function parseOrdinanceSponsorsPayload(sponsors: Record<string, unknown> | null): ParsedOrdinanceSponsorsPayload {
  const out: ParsedOrdinanceSponsorsPayload = { names: [] };
  if (!sponsors || typeof sponsors !== 'object') return out;
  const req = sponsors.requester;
  if (typeof req === 'string' && req.trim()) out.requester = req.trim();
  const body = sponsors.body;
  if (typeof body === 'string' && body.trim()) out.body = body.trim();
  const rawList = sponsors.sponsors;
  if (Array.isArray(rawList)) {
    for (const item of rawList) {
      if (typeof item === 'string' && item.trim()) out.names.push(item.trim());
      else if (item && typeof item === 'object' && 'name' in item && typeof (item as { name: unknown }).name === 'string') {
        const n = (item as { name: string }).name.trim();
        if (n) out.names.push(n);
      }
    }
  }
  return out;
}
