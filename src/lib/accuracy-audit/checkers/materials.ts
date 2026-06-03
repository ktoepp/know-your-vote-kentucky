/**
 * Committee materials accuracy checker.
 *
 * 1. Re-fetches LRC Committee Documents pages for recently-active committees and
 *    diffs the parsed material links/titles against stored `ky_committee_materials`.
 * 2. Probes a rotating sample of stored material URLs (and bill text URLs) for
 *    reachability — 404 is a hard failure, other non-2xx/3xx is a warning.
 */
import axios from 'axios';
import type { SupabaseClient } from '@supabase/supabase-js';
import {
  lrcCommitteeDocumentsUrl,
  parseCommitteeMaterialsHtml,
} from '../../lrc-committee-materials-parser';
import { sampleTable } from '../sampling';
import {
  norm,
  summarizeResult,
  type AuditConfig,
  type CheckerResult,
  type Finding,
} from '../types';

const FETCH_HEADERS = {
  'User-Agent': 'KnowYourVoteKentucky/1.0 (+https://kyvky.com; accuracy-audit)',
  Accept: 'text/html',
};
const PROBE_TIMEOUT_MS = 15_000;

interface CommitteeRow {
  id: string;
  name: string;
  lrc_rsn: number | null;
  committee_type: string | null;
}

interface MaterialRow {
  id: string;
  committee_id: string;
  title: string | null;
  url: string;
}

type LinkKind = 'material' | 'bill';

interface LinkTarget {
  kind: LinkKind;
  label: string;
  url: string;
}

/** Known Kentucky legislature web hosts (current + legacy LRC domain). */
function isKyLegislatureHost(host: string): boolean {
  return host === 'lrc.ky.gov' || host === 'ky.gov' || host.endsWith('legislature.ky.gov');
}

/**
 * Static source-of-truth check: validate URL shape and host against the known
 * canonical hosts for each kind (no network). Returns a Finding or null when OK.
 */
function validateLinkShape(target: LinkTarget): Finding | null {
  let host: string;
  let path: string;
  try {
    const u = new URL(target.url);
    host = u.hostname.replace(/^www\./i, '').toLowerCase();
    path = u.pathname.replace(/^\/+|\/+$/g, '');
    if (!/^https?:$/.test(u.protocol)) {
      return {
        severity: 'fail',
        domain: 'materials',
        entity: target.label,
        field: 'url',
        message: `non-http(s) URL scheme "${u.protocol}"`,
        url: target.url,
      };
    }
  } catch {
    return {
      severity: 'fail',
      domain: 'materials',
      entity: target.label,
      field: 'url',
      message: 'malformed URL',
      url: target.url,
    };
  }

  if (!path) {
    return {
      severity: 'warn',
      domain: 'materials',
      entity: target.label,
      field: 'url',
      message: 'URL has no path (likely not a real document/bill link)',
      url: target.url,
    };
  }

  const allowed =
    target.kind === 'material'
      ? isKyLegislatureHost(host)
      : host === 'legiscan.com' || isKyLegislatureHost(host);

  if (!allowed) {
    return {
      severity: 'warn',
      domain: 'materials',
      entity: target.label,
      field: 'url',
      message: `unexpected host "${host}" (expected ${
        target.kind === 'material' ? 'a ky.gov legislature host' : 'legiscan.com or a ky.gov legislature host'
      })`,
      url: target.url,
    };
  }

  return null;
}

async function probeUrl(url: string): Promise<{ ok: boolean; status: number }> {
  const attempt = async (method: 'head' | 'get') => {
    const res = await axios.request({
      url,
      method,
      timeout: PROBE_TIMEOUT_MS,
      maxRedirects: 5,
      validateStatus: () => true,
      headers: method === 'get' ? { ...FETCH_HEADERS, Range: 'bytes=0-0' } : FETCH_HEADERS,
    });
    return res.status;
  };
  const once = async () => {
    let status = await attempt('head');
    if (status === 405 || status === 501 || status === 403) {
      status = await attempt('get');
    }
    return status;
  };
  try {
    let status = await once();
    // One retry for transient timeouts/connection resets (status 0).
    if (status === 0) {
      await new Promise((r) => setTimeout(r, 500 + Math.random() * 500));
      status = await once();
    }
    return { ok: status >= 200 && status < 400, status };
  } catch {
    return { ok: false, status: 0 };
  }
}

/** Run async tasks with a small concurrency cap + jitter to avoid burst timeouts. */
async function mapWithConcurrency<T>(
  items: T[],
  limit: number,
  fn: (item: T) => Promise<void>,
): Promise<void> {
  let cursor = 0;
  const workers = Array.from({ length: Math.min(limit, items.length) }, async () => {
    while (cursor < items.length) {
      const item = items[cursor++]!;
      await new Promise((r) => setTimeout(r, Math.random() * 250));
      await fn(item);
    }
  });
  await Promise.all(workers);
}

async function checkMaterialsDiff(
  db: SupabaseClient,
  cfg: AuditConfig,
  findings: Finding[],
): Promise<number> {
  // Seed-sample committees that have an LRC documents page.
  const committees = await sampleTable<CommitteeRow>(db, {
    table: 'ky_committees',
    select: 'id, name, lrc_rsn, committee_type',
    seed: cfg.seed,
    limit: cfg.materialsCommitteeLimit,
    filter: (q) => q.not('lrc_rsn', 'is', null),
  });
  if (committees.length === 0) return 0;

  let processed = 0;

  for (const committee of committees) {
    if (committee.lrc_rsn == null) continue;
    const url = lrcCommitteeDocumentsUrl(committee.lrc_rsn);

    let html: string | null = null;
    try {
      const res = await axios.get<string>(url, {
        timeout: 30_000,
        responseType: 'text',
        headers: FETCH_HEADERS,
        validateStatus: (s) => s < 500,
      });
      html = res.status === 404 ? null : res.data;
    } catch (e) {
      findings.push({
        severity: 'warn',
        domain: 'materials',
        entity: committee.name,
        message: `LRC documents fetch failed: ${e instanceof Error ? e.message : String(e)}`,
        url,
      });
      continue;
    }
    if (!html) continue;

    processed += 1;
    const parsed = parseCommitteeMaterialsHtml(html, url);
    const liveMaterials = parsed.meetings.flatMap((m) => m.materials);
    if (liveMaterials.length === 0) continue;

    const { data: storedRows } = await db
      .from('ky_committee_materials')
      .select('id, committee_id, title, url')
      .eq('committee_id', committee.id);

    const storedByUrl = new Map<string, MaterialRow>();
    for (const r of (storedRows ?? []) as MaterialRow[]) storedByUrl.set(r.url, r);

    for (const mat of liveMaterials) {
      const stored = storedByUrl.get(mat.url);
      if (!stored) {
        findings.push({
          severity: 'warn',
          domain: 'materials',
          entity: committee.name,
          message: `material on LRC page is not stored: ${mat.title}`,
          url: mat.url,
        });
        continue;
      }
      if (norm(mat.title) && norm(mat.title) !== norm(stored.title)) {
        findings.push({
          severity: 'warn',
          domain: 'materials',
          entity: committee.name,
          field: 'title',
          message: 'stored material title differs from LRC page',
          expected: mat.title,
          actual: stored.title ?? '',
          url: mat.url,
        });
      }
    }
  }

  return processed;
}

async function checkLinks(db: SupabaseClient, cfg: AuditConfig, findings: Finding[]): Promise<number> {
  const half = Math.max(1, Math.floor(cfg.linkSampleLimit / 2));

  const materials = await sampleTable<{ title: string | null; url: string }>(db, {
    table: 'ky_committee_materials',
    select: 'title, url',
    seed: cfg.seed,
    limit: half,
  });

  const bills = await sampleTable<{ bill_number: string; bill_text_url: string }>(db, {
    table: 'ky_bills',
    select: 'bill_number, bill_text_url',
    seed: cfg.seed ^ 0x9e3779b9, // distinct stream from the materials sample
    limit: half,
    filter: (q) => q.not('bill_text_url', 'is', null),
  });

  const targets: LinkTarget[] = [];
  for (const m of materials) {
    if (m.url) targets.push({ kind: 'material', label: `material: ${m.title ?? m.url}`, url: m.url });
  }
  for (const b of bills) {
    if (b.bill_text_url) {
      targets.push({ kind: 'bill', label: `bill text: ${b.bill_number}`, url: b.bill_text_url });
    }
  }

  // Default: static source-of-truth validation (no network).
  if (!cfg.probeLinks) {
    for (const t of targets) {
      const finding = validateLinkShape(t);
      if (finding) findings.push(finding);
    }
    return targets.length;
  }

  // Opt-in (ACCURACY_PROBE_LINKS=true): live HTTP reachability, concurrency-limited.
  await mapWithConcurrency(targets, 4, async (t) => {
    const { ok, status } = await probeUrl(t.url);
    if (ok) return;
    findings.push({
      severity: status === 404 ? 'fail' : 'warn',
      domain: 'materials',
      entity: t.label,
      field: 'reachability',
      message: status === 0 ? 'request failed / timed out' : `HTTP ${status}`,
      url: t.url,
    });
  });

  return targets.length;
}

export async function checkMaterials(db: SupabaseClient, cfg: AuditConfig): Promise<CheckerResult> {
  const started = Date.now();
  const findings: Finding[] = [];

  let checked = 0;
  try {
    checked += await checkMaterialsDiff(db, cfg, findings);
  } catch (e) {
    findings.push({
      severity: 'warn',
      domain: 'materials',
      message: `materials diff pass failed: ${e instanceof Error ? e.message : String(e)}`,
    });
  }

  try {
    checked += await checkLinks(db, cfg, findings);
  } catch (e) {
    findings.push({
      severity: 'warn',
      domain: 'materials',
      message: `link check pass failed: ${e instanceof Error ? e.message : String(e)}`,
    });
  }

  if (checked === 0) {
    return summarizeResult('materials', 0, findings, started, {
      skipped: true,
      skipReason: 'no recently-active committee materials or links to probe',
    });
  }

  return summarizeResult('materials', checked, findings, started);
}
