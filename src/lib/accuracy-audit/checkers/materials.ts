/**
 * Committee materials accuracy checker.
 *
 * 1. Re-fetches LRC Committee Documents pages for recently-active committees and
 *    diffs them against stored `ky_committee_materials` in both directions: live
 *    materials missing from storage (with title, meeting_date, date_label,
 *    file_type and sort_order compared), and stored rows the live page no longer
 *    lists (scoped to meeting groups the page still shows — see the reverse-diff
 *    comment for why `source_url` cannot be used for that scoping).
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
  classifyCheckerError,
  diffFinding,
  errorMessage,
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
  /** ISO date the material was filed under; drives the materials section's grouping. */
  meeting_date: string | null;
  /** As-printed heading ("Thursday, May 21, 2026"); rendered verbatim as the group heading. */
  date_label: string | null;
  /** Lowercase extension; drives the per-row file-type badge. */
  file_type: string | null;
  /** Index within its meeting group; the materials list is ordered by this. */
  sort_order: number | null;
}

/**
 * Max per-committee "stored but absent from the live page" rows named individually
 * before the rest collapse into the roll-up count. Kept small on purpose: the
 * condition is overwhelmingly systemic (a whole batch of rows goes stale at once
 * when LRC re-shapes its URLs), so listing every row buries every other finding in
 * the run without adding information. See the reverse-diff comment below.
 */
const STALE_EXAMPLES_PER_COMMITTEE = 3;

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

/**
 * The pre-migration flat `/CommitteeDocuments/{meeting_id}/file` URL shape,
 * superseded by the nested `/{rsn}/{meeting_id}/file` form.
 */
const LEGACY_FLAT_MATERIAL_URL = /\/CommitteeDocuments\/[0-9]+\/[^/]+$/;
const NESTED_MATERIAL_URL = /\/CommitteeDocuments\/[0-9]+\/[0-9]+\/[^/]+$/;

/**
 * One systemic finding for stored materials that are exact duplicates of another
 * row under the superseded URL shape.
 *
 * These render the same document twice in the materials section, and the legacy
 * copy's URL 404s (see `lrcCommitteeDocumentsUrl`), so a visitor clicking the
 * wrong one of a visually identical pair gets nothing. It is a single data
 * defect with a single fix — deleting the superseded rows — so it is reported
 * once with a total rather than per committee or per row.
 *
 * Returns the set of duplicate URLs so the reverse diff can exclude them.
 */
async function checkLegacyDuplicateUrls(
  db: SupabaseClient,
  findings: Finding[],
): Promise<Set<string>> {
  const duplicates = new Set<string>();
  const { data, error } = await db
    .from('ky_committee_materials')
    .select('id, committee_id, title, meeting_date, url');
  if (error) return duplicates;

  const rows = data ?? [];
  // Key on the identity of the document itself, not its URL.
  const nested = new Set(
    rows
      .filter((r) => NESTED_MATERIAL_URL.test(String(r.url)))
      .map((r) => `${r.committee_id}|${r.title}|${r.meeting_date}`),
  );

  let currentYear = 0;
  for (const r of rows) {
    const url = String(r.url);
    if (!LEGACY_FLAT_MATERIAL_URL.test(url)) continue;
    if (!nested.has(`${r.committee_id}|${r.title}|${r.meeting_date}`)) continue;
    duplicates.add(url);
    if (String(r.meeting_date ?? '') >= `${new Date().getUTCFullYear()}-01-01`) currentYear += 1;
  }

  if (duplicates.size > 0) {
    findings.push({
      severity: 'warn',
      domain: 'materials',
      field: 'url',
      message:
        `${duplicates.size} stored material(s) duplicate another row under the superseded ` +
        `/CommitteeDocuments/{meeting_id}/ URL shape (${currentYear} dated this year). Each renders ` +
        'the document twice in the materials section and the superseded copy 404s. ' +
        'Fix is a one-time cleanup of the duplicate rows, not a sync change.',
    });
  }
  return duplicates;
}

async function checkMaterialsDiff(
  db: SupabaseClient,
  cfg: AuditConfig,
  findings: Finding[],
  legacyDuplicateUrls: Set<string>,
): Promise<{ checked: number; upstreamFailures: number }> {
  // Seed-sample committees that have an LRC documents page.
  const committees = await sampleTable<CommitteeRow>(db, {
    table: 'ky_committees',
    select: 'id, name, lrc_rsn, committee_type',
    seed: cfg.seed,
    limit: cfg.materialsCommitteeLimit,
    filter: (q) => q.not('lrc_rsn', 'is', null),
  });
  if (committees.length === 0) return { checked: 0, upstreamFailures: 0 };

  let processed = 0;
  let upstreamFailures = 0;

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
      return {
        committee,
        url,
        html: res.status === 404 ? null : res.data,
        error: null as unknown,
        errorKind: null as ReturnType<typeof classifyCheckerError> | null,
      };
    } catch (e) {
      return {
        committee,
        url,
        html: null,
        error: e as unknown,
        errorKind: classifyCheckerError(e),
      };
    }
  });

  const usable = fetched.filter(
    (f): f is { committee: CommitteeRow; url: string; html: string; error: null; errorKind: null } => {
      if (!f) return false;
      if (f.error) {
        // A transient LRC hiccup on one committee counts against the outage
        // ratio (so a total outage escalates via the report layer) but still
        // reports a per-committee warn so the operator can see which pages were
        // reachable. A non-transient failure (parse error, unexpected 4xx) is a
        // fail — we should look at it.
        const transient = f.errorKind === 'upstream_outage';
        if (transient) upstreamFailures += 1;
        findings.push({
          severity: transient ? 'warn' : 'fail',
          domain: 'materials',
          entity: f.committee.name,
          message: `LRC documents fetch failed: ${errorMessage(f.error)}`,
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
      .select('id, committee_id, title, url, meeting_date, date_label, file_type, sort_order')
      .in('committee_id', usable.map((u) => u.committee.id));
    for (const r of (storedRows ?? []) as MaterialRow[]) {
      if (!storedByCommittee.has(r.committee_id)) storedByCommittee.set(r.committee_id, new Map());
      storedByCommittee.get(r.committee_id)!.set(r.url, r);
    }
  }

  for (const { committee, url, html } of usable) {
    processed += 1;
    const parsed = parseCommitteeMaterialsHtml(html, url);
    // Flatten while keeping each material's meeting context and its index within
    // that meeting: `meeting_date`, `date_label` and `sort_order` are all derived
    // from the group a material sits in, so they can only be diffed with it.
    const liveEntries = parsed.meetings.flatMap((meeting) =>
      meeting.materials.map((mat, index) => ({ mat, meeting, index })),
    );
    if (liveEntries.length === 0) continue;

    const storedByUrl = storedByCommittee.get(committee.id) ?? new Map<string, MaterialRow>();

    // One ordering finding per meeting group at most. A single insertion upstream
    // shifts every following index, which would otherwise emit one finding per
    // material for what is one change.
    const orderingReported = new Set<string>();

    for (const { mat, meeting, index } of liveEntries) {
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

      // Presentation metadata below. All `warn`, never `fail`: a wrong date group
      // or badge misleads a reader about *when* a document was discussed or *what*
      // it is, which matters, but the document itself and its link are still
      // correct — nothing here makes the page state something false about the
      // legislature. `info` would be too weak: the committee page groups, heads
      // and orders the entire materials section off these four columns.

      // meeting_date: only diff when the live label actually parsed. `parseDateLabel`
      // returns null for any heading it doesn't recognize, and a null there says
      // "unknown", not "the stored date is wrong". Stored values come from a date
      // column, so slice defensively in case PostgREST ever widens it to a timestamp.
      const liveDate = meeting.meetingDate;
      const storedDate = (stored.meeting_date ?? '').slice(0, 10);
      if (liveDate && storedDate !== liveDate) {
        findings.push(
          diffFinding('warn', 'materials', committee.name, 'meeting_date', liveDate, storedDate, mat.url),
        );
      }

      // date_label is rendered verbatim as the group heading, so it is compared
      // through `norm` — LRC's own whitespace/case around the heading varies
      // between page generations and is invisible once rendered.
      if (norm(meeting.dateLabel) && norm(meeting.dateLabel) !== norm(stored.date_label)) {
        findings.push(
          diffFinding(
            'warn',
            'materials',
            committee.name,
            'date_label',
            meeting.dateLabel,
            stored.date_label,
            mat.url,
          ),
        );
      }

      // file_type: the parser lower-cases the extension and deliberately returns
      // null for non-file links (.html year pages), so a null live value carries no
      // assertion about the stored badge — skip rather than flag it.
      if (mat.fileType && mat.fileType.toLowerCase() !== (stored.file_type ?? '').toLowerCase()) {
        findings.push(
          diffFinding('warn', 'materials', committee.name, 'file_type', mat.fileType, stored.file_type, mat.url),
        );
      }

      // sort_order is written by both sync paths as the material's index within its
      // meeting group, so the live index is directly comparable.
      const groupKey = meeting.meetingDate ?? meeting.dateLabel;
      if (stored.sort_order !== index && !orderingReported.has(groupKey)) {
        orderingReported.add(groupKey);
        findings.push(
          diffFinding(
            'warn',
            'materials',
            committee.name,
            `sort_order[${groupKey}]`,
            String(index),
            String(stored.sort_order ?? ''),
            mat.url,
          ),
        );
      }
    }

    // Reverse direction: rows we store that the live page no longer lists. These
    // still render in the committee page's materials section with a link that looks
    // live, so they are exactly as user-visible as a missing row.
    //
    // Scoping is the whole difficulty. `ky_committee_materials` also holds rows from
    // `backfill:lrc:committee-materials`, which walks each committee's "Other Meeting
    // Years" chain, so most stored rows legitimately are not on the current page.
    // `source_url` cannot separate them — every one of the 1,773 stored rows records
    // a committee-root source_url (`/CommitteeDocuments/{rsn}` or `…/{rsn}/`), none a
    // year page, because the later daily sync rewrites source_url on update.
    //
    // So scope by meeting group instead: consider only stored rows whose meeting_date
    // matches a date the live page is *currently showing*. If LRC still lists that
    // meeting, everything we hold under it should be in that group; if LRC has rolled
    // the meeting off to a year page, the whole group drops out of scope and stays
    // silent. Every stored row has a non-null meeting_date (verified: 0 of 1,773 are
    // null), so nothing falls through the scoping for lack of a date.
    const liveUrls = new Set(liveEntries.map((e) => e.mat.url));
    const liveDates = new Set(
      parsed.meetings.map((m) => m.meetingDate).filter((d): d is string => d != null),
    );
    if (liveDates.size > 0) {
      const stale = [...storedByUrl.values()].filter(
        (row) =>
          row.meeting_date != null &&
          liveDates.has(row.meeting_date.slice(0, 10)) &&
          !liveUrls.has(row.url) &&
          // Exclude the known duplicate class. Every one of the 802 legacy
          // flat-URL rows has an exact nested twin (same committee, title and
          // date), so they are one data defect with one fix — reported once by
          // `checkLegacyDuplicateUrls` — not evidence that LRC removed a
          // document. Leaving them in here would put a double-digit count on
          // ~10 of 12 sampled committees every single run, which is how a check
          // teaches people to skim past it.
          !legacyDuplicateUrls.has(row.url),
      );
      if (stale.length > 0) {
        // Rolled up to a single finding per committee rather than one per row. The
        // condition is systemic in practice: 802 of 1,773 stored rows still carry the
        // pre-migration flat `/CommitteeDocuments/{meeting_id}/…` URL shape alongside
        // their nested `/{rsn}/{meeting_id}/…` twin, and one committee alone holds 75
        // of them in the current year. Emitting them individually would put several
        // hundred findings in a run and drown every other domain; one finding per
        // committee, carrying the count and a few examples, is enough to act on and
        // keeps the per-run ceiling at one per sampled committee. It also matches the
        // `checked` unit — one committee page examined, at most one entity flagged.
        const examples = stale.slice(0, STALE_EXAMPLES_PER_COMMITTEE).map((r) => r.url);
        findings.push({
          severity: 'warn',
          domain: 'materials',
          entity: committee.name,
          field: 'stored_not_on_lrc',
          message:
            `${stale.length} stored material(s) filed under meeting date(s) the LRC page still ` +
            `lists are absent from that page — likely removed upstream or a stale URL shape; ` +
            `they still render as working links`,
          expected: 'listed on the LRC documents page',
          actual: examples.join(' , ') + (stale.length > examples.length ? ' , …' : ''),
          url,
        });
      }
    }
  }

  return { checked: processed, upstreamFailures };
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
  let materials = unprobed;
  if (unprobed.length < materialLimit) {
    // Top up from the full population. Over-fetch by the number already held so
    // that removing overlaps still leaves enough to reach the limit.
    const seenIds = new Set(unprobed.map((m) => m.id));
    const topUp = await sampleTable<{ id: string; title: string | null; url: string }>(db, {
      table: 'ky_committee_materials',
      select: 'id, title, url',
      seed: cfg.seed ^ 0x1b873593,
      limit: materialLimit + unprobed.length,
      cacheKey: 'all',
    });
    materials = [...unprobed, ...topUp.filter((m) => !seenIds.has(m.id))].slice(0, materialLimit);
  }

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

  // `checked` sums two different units — committee pages diffed, then link
  // targets validated — because `summarizeResult` derives `passed` from
  // distinct flagged entity labels, and the two label namespaces (`<committee
  // name>` vs `material: …` / `bill text: …`) cannot collide. The sum keeps
  // pass-rate math and outage-ratio math honest.
  //
  // The unit mix only misreads on the digest, where "37 checked" reads like
  // 37 committees. `checkedBreakdown` carries the split so the status line can
  // render "12 committee pages, 25 link targets" instead of the ambiguous sum.
  let committeePages = 0;
  let linkTargets = 0;
  let upstreamFailures = 0;
  try {
    // Runs first: the reverse diff needs the duplicate set to exclude, and the
    // systemic finding should precede the per-committee ones in the report.
    const legacyDuplicateUrls = await checkLegacyDuplicateUrls(db, findings);
    const diff = await checkMaterialsDiff(db, cfg, findings, legacyDuplicateUrls);
    committeePages += diff.checked;
    upstreamFailures += diff.upstreamFailures;
  } catch (e) {
    // A pass-level throw (not one committee fetch failing — the whole pass) that
    // classifies as transient upstream still counts against the outage ratio;
    // a non-transient throw is a real bug on our side.
    const transient = classifyCheckerError(e) === 'upstream_outage';
    if (transient) upstreamFailures += 1;
    findings.push({
      severity: transient ? 'warn' : 'fail',
      domain: 'materials',
      message: `materials diff pass failed: ${errorMessage(e)}`,
    });
  }

  try {
    linkTargets += await checkLinks(db, cfg, findings);
  } catch (e) {
    findings.push({
      severity: 'warn',
      domain: 'materials',
      message: `link check pass failed: ${errorMessage(e)}`,
    });
  }

  const checked = committeePages + linkTargets;

  if (checked === 0 && upstreamFailures === 0) {
    return summarizeResult('materials', 0, findings, started, {
      skipped: true,
      skipReason: 'no recently-active committee materials or links to probe',
    });
  }

  return summarizeResult('materials', checked, findings, started, {
    upstreamFailures,
    checkedBreakdown: [
      { label: 'committee pages', count: committeePages },
      { label: 'link targets', count: linkTargets },
    ],
  });
}
