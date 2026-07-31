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
import {
  classifyLinkStatus,
  mapWithConcurrency,
  persistMaterialLinkStatus,
  probeUrl,
} from '../../ky-committee-material-link-probe';

const FETCH_HEADERS = {
  'User-Agent': 'KnowYourVoteKentucky/1.0 (+https://kyvky.com; accuracy-audit)',
  Accept: 'text/html',
};

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
  /** Present for `material` targets so a probe result can persist to its row. */
  materialId?: string;
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

  // Fetch the LRC pages concurrently. These are plain HTML GETs against a
  // different host than LegiScan and consume no API quota, so there was no
  // reason to serialize them behind a 30s timeout each — this was the single
  // largest wall-clock cost in the checker.
  const fetched = await mapWithConcurrency(committees, 4, async (committee) => {
    if (committee.lrc_rsn == null) return null;
    const url = lrcCommitteeDocumentsUrl(committee.lrc_rsn);
    try {
      const res = await axios.get<string>(url, {
        timeout: 30_000,
        responseType: 'text',
        headers: FETCH_HEADERS,
        validateStatus: (s) => s < 500,
      });
      return { committee, url, html: res.status === 404 ? null : res.data, error: null as string | null };
    } catch (e) {
      return {
        committee,
        url,
        html: null,
        error: e instanceof Error ? e.message : String(e),
      };
    }
  });

  const usable = fetched.filter(
    (f): f is { committee: CommitteeRow; url: string; html: string; error: null } => {
      if (!f) return false;
      if (f.error) {
        findings.push({
          severity: 'warn',
          domain: 'materials',
          entity: f.committee.name,
          message: `LRC documents fetch failed: ${f.error}`,
          url: f.url,
        });
        return false;
      }
      return f.html != null;
    },
  );

  // One query for every sampled committee's stored materials, replacing a
  // per-committee select inside the loop.
  const storedByCommittee = new Map<string, Map<string, MaterialRow>>();
  if (usable.length > 0) {
    const { data: storedRows } = await db
      .from('ky_committee_materials')
      .select('id, committee_id, title, url')
      .in('committee_id', usable.map((u) => u.committee.id));
    for (const r of (storedRows ?? []) as MaterialRow[]) {
      if (!storedByCommittee.has(r.committee_id)) storedByCommittee.set(r.committee_id, new Map());
      storedByCommittee.get(r.committee_id)!.set(r.url, r);
    }
  }

  for (const { committee, url, html } of usable) {
    processed += 1;
    const parsed = parseCommitteeMaterialsHtml(html, url);
    const liveMaterials = parsed.meetings.flatMap((m) => m.materials);
    if (liveMaterials.length === 0) continue;

    const storedByUrl = storedByCommittee.get(committee.id) ?? new Map<string, MaterialRow>();

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
  // Split the budget without dropping a target: floor() on both halves spent
  // only 24 of a configured 25.
  const materialLimit = Math.max(1, Math.ceil(cfg.linkSampleLimit / 2));
  const billLimit = Math.max(1, cfg.linkSampleLimit - materialLimit);

  // Prefer never-probed rows so link coverage advances instead of re-drawing
  // uniformly. At the time of writing 944 of 1,773 material rows had never been
  // probed, while the UI's "Link unavailable" affordance reads link_status.
  const unprobed = await sampleTable<{ id: string; title: string | null; url: string }>(db, {
    table: 'ky_committee_materials',
    select: 'id, title, url',
    seed: cfg.seed,
    limit: materialLimit,
    filter: (q) => q.is('link_checked_at', null),
    cacheKey: 'link_checked_at_null',
  });
  const materials =
    unprobed.length >= materialLimit
      ? unprobed
      : [
          ...unprobed,
          ...(await sampleTable<{ id: string; title: string | null; url: string }>(db, {
            table: 'ky_committee_materials',
            select: 'id, title, url',
            seed: cfg.seed ^ 0x1b873593,
            limit: materialLimit - unprobed.length + unprobed.length,
            cacheKey: 'all',
          })).filter((m) => !unprobed.some((u) => u.id === m.id)),
        ].slice(0, materialLimit);

  const bills = await sampleTable<{ bill_number: string; bill_text_url: string }>(db, {
    table: 'ky_bills',
    select: 'bill_number, bill_text_url',
    seed: cfg.seed ^ 0x9e3779b9, // distinct stream from the materials sample
    limit: billLimit,
    filter: (q) => q.not('bill_text_url', 'is', null),
    cacheKey: 'bill_text_url_not_null',
  });

  const targets: LinkTarget[] = [];
  for (const m of materials) {
    if (m.url) {
      targets.push({ kind: 'material', label: `material: ${m.title ?? m.url}`, url: m.url, materialId: m.id });
    }
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
    // Persist the definitive outcome on material rows so the UI can flag dead
    // links (bill text URLs live in ky_bills and are out of scope here).
    if (t.materialId) {
      await persistMaterialLinkStatus(db, t.materialId, classifyLinkStatus(status));
    }
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
