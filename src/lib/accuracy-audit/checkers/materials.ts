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
  try {
    let status = await attempt('head');
    if (status === 405 || status === 501 || status === 403) {
      status = await attempt('get');
    }
    return { ok: status >= 200 && status < 400, status };
  } catch {
    return { ok: false, status: 0 };
  }
}

async function checkMaterialsDiff(
  db: SupabaseClient,
  cfg: AuditConfig,
  findings: Finding[],
): Promise<number> {
  const sinceIso = new Date(Date.now() - cfg.lookbackDays * 86_400_000).toISOString();

  // Committees with recently-scraped materials are the "active" ones worth re-checking.
  const { data: recent } = await db
    .from('ky_committee_materials')
    .select('committee_id, scraped_at')
    .gte('scraped_at', sinceIso)
    .order('scraped_at', { ascending: false })
    .limit(500);

  const committeeIds = [...new Set((recent ?? []).map((r) => r.committee_id as string))].slice(
    0,
    cfg.materialsCommitteeLimit,
  );
  if (committeeIds.length === 0) return 0;

  const { data: committees } = await db
    .from('ky_committees')
    .select('id, name, lrc_rsn, committee_type')
    .in('id', committeeIds)
    .not('lrc_rsn', 'is', null);

  let processed = 0;

  for (const committee of (committees ?? []) as CommitteeRow[]) {
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

async function checkLinkReachability(
  db: SupabaseClient,
  cfg: AuditConfig,
  findings: Finding[],
): Promise<number> {
  const half = Math.max(1, Math.floor(cfg.linkSampleLimit / 2));

  const { data: materials } = await db
    .from('ky_committee_materials')
    .select('title, url')
    .order('scraped_at', { ascending: false })
    .limit(half);

  const { data: bills } = await db
    .from('ky_bills')
    .select('bill_number, bill_text_url')
    .not('bill_text_url', 'is', null)
    .order('updated_from_legiscan_at', { ascending: false, nullsFirst: false })
    .limit(half);

  const targets: { label: string; url: string }[] = [];
  for (const m of materials ?? []) {
    if (m.url) targets.push({ label: `material: ${m.title ?? m.url}`, url: m.url as string });
  }
  for (const b of bills ?? []) {
    if (b.bill_text_url) targets.push({ label: `bill text: ${b.bill_number}`, url: b.bill_text_url as string });
  }

  let probed = 0;
  for (const t of targets) {
    const { ok, status } = await probeUrl(t.url);
    probed += 1;
    if (ok) continue;
    findings.push({
      severity: status === 404 ? 'fail' : 'warn',
      domain: 'materials',
      entity: t.label,
      field: 'reachability',
      message: status === 0 ? 'request failed / timed out' : `HTTP ${status}`,
      url: t.url,
    });
  }

  return probed;
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
    checked += await checkLinkReachability(db, cfg, findings);
  } catch (e) {
    findings.push({
      severity: 'warn',
      domain: 'materials',
      message: `link reachability pass failed: ${e instanceof Error ? e.message : String(e)}`,
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
