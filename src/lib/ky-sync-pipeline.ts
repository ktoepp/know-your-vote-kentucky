/**
 * Kentucky Data Sync Pipeline — Orchestrator
 *
 * Fetches data from all Kentucky civic data sources and upserts into Supabase.
 * Supports dry-run mode, per-source sync, and status tracking via ky_sources table.
 */
import {
  getKyLegiScanClient,
  getKyOpenStatesClient,
  getKyLegistarClient,
  getKyExecutiveOrdersClient,
  getKySchoolBoardsClient,
  getKyCountyCourtsClient,
} from './ky-data-sources';
import { supabaseAdmin } from '../app/lib/supabaseAdminCore';
import { classifyTopics } from './ky-topic-classifier';
import {
  committeeSlugFromName,
  extractCanonicalCommitteeSlugsFromOpenStatesPerson,
  extractCommitteeMembershipSlugsFromOpenStatesPerson,
} from './ky-committee-utils';
import { legislatorNameMatchesLegiscanSessionPerson } from './ky-member-committees';
import { legiscanSubjectColumnsFromDetail } from './ky-legiscan-subjects';
import { normalizeLegistarOrdinanceText } from './legistar-text';
import { syncKyLrcCalendar } from './ky-lrc-calendar-sync';
import { syncKyLrcCommitteeMaterials } from './ky-lrc-committee-materials-sync';
import {
  fetchBillHistorySnapshots,
  recordBillStatusHistoryForBuiltBatch,
} from './ky-bill-status-history';
import {
  buildOrdinanceSponsorsJson,
  isLegistarMatterLikelyTestNoise,
  matterTopicsFromLegistar,
  normalizeLegistarOrdinanceNumber,
  parseLegistarApiDate,
  splitLegistarMatterTitleAndDescription,
} from './legistar-matter';
import {
  extractOpenStatesContactDetails,
  extractOpenStatesLegislatorWebLinks,
  openStatesCurrentRole,
  openStatesLegislatorNames,
} from './ky-openstates-client';
import { normalizeBallotpediaForStorage } from './external-legislative-links';
import {
  buildLegislatorExternalLinks,
  normalizeHttpsUrl,
  sanitizeLegislatorCampaignWebsiteUrl,
} from './legislator-link-normalize';
import { normalizeKyLegislatorDistrictForDb } from './ky-district-geo';
import {
  kyLegislatureHeadshotUrlFromLegiscanDistrict,
  normalizeLegislatorPhotoUrl,
  normalizeSponsorNameForMatch,
} from './ky-member-utils';
import type { KYSource } from '../types/kentucky';
import {
  legiscanPersonBioSocial,
  type KyLegiScanClient,
  type LegiScanBillDetail,
  type LegiScanBillSummary,
  type LegiScanMasterListRawBill,
  type LegiScanSession,
  type LegiScanSessionPerson,
  type LegiScanPerson,
} from './ky-legiscan-client';
import { mapLegiScanBillStatus } from './map-legiscan-bill-status';

/** LegiScan getBill `committee` (object or occasional array) → `ky_bills` committee columns. */
function committeeFieldsFromLegiScanDetail(detail: LegiScanBillDetail | null): {
  committee_legiscan_id: number | null;
  committee_name: string | null;
} {
  if (!detail) {
    return { committee_legiscan_id: null, committee_name: null };
  }
  const raw = detail.committee as
    | { committee_id?: number; name?: string }
    | { committee_id?: number; name?: string }[]
    | null
    | undefined;
  let c: { committee_id?: number; name?: string } | null = null;
  if (Array.isArray(raw)) {
    c = raw[0] ?? null;
  } else if (raw && typeof raw === 'object') {
    c = raw;
  }
  if (!c?.name?.trim()) {
    return { committee_legiscan_id: null, committee_name: null };
  }
  return {
    committee_legiscan_id: c.committee_id != null ? Number(c.committee_id) : null,
    committee_name: c.name.trim(),
  };
}

/** Derive chamber from bill number prefix (HB/HR = house, SB/SR = senate). */
function chamberFromBillNumber(billNumber: string): 'house' | 'senate' | null {
  const upper = billNumber.toUpperCase();
  if (upper.startsWith('H')) return 'house';
  if (upper.startsWith('S')) return 'senate';
  return null;
}

/** Normalize a LegiScan date string to YYYY-MM-DD, or null if unparseable. */
function toIsoDate(s: string | undefined | null): string | null {
  if (!s) return null;
  const m = /^(\d{4}-\d{2}-\d{2})/.exec(s);
  if (m) return m[1];
  const d = new Date(s);
  if (Number.isNaN(d.getTime())) return null;
  return d.toISOString().slice(0, 10);
}

/** Audit item #3: derive introduced_date from getBill detail (explicit field or earliest history entry). */
function deriveIntroducedDate(detail: LegiScanBillDetail | null | undefined): string | null {
  if (!detail) return null;
  const direct = toIsoDate(detail.introduced);
  if (direct) return direct;
  if (!detail.history?.length) return null;
  let earliest: string | null = null;
  for (const h of detail.history) {
    const d = toIsoDate(h.date);
    if (!d) continue;
    if (!earliest || d < earliest) earliest = d;
  }
  return earliest;
}

function compareLegiScanBillRecency(a: { last_action_date?: string }, b: { last_action_date?: string }): number {
  const ta = a.last_action_date ? new Date(a.last_action_date).getTime() : 0;
  const tb = b.last_action_date ? new Date(b.last_action_date).getTime() : 0;
  return tb - ta;
}

/**
 * LegiScan master lists are often ordered so House bills fill the first N rows.
 * Taking `slice(0, limit)` would sync almost no Senate bills. Prefer a recent
 * mix from both chambers, then backfill by recency.
 */
function selectBillsForSync<T extends { bill_id: number; number: string; last_action_date?: string }>(
  bills: T[],
  limit: number,
): T[] {
  if (bills.length <= limit) return bills;
  const house: T[] = [];
  const senate: T[] = [];
  const other: T[] = [];
  for (const b of bills) {
    const c = chamberFromBillNumber(b.number);
    if (c === 'house') house.push(b);
    else if (c === 'senate') senate.push(b);
    else other.push(b);
  }
  house.sort(compareLegiScanBillRecency);
  senate.sort(compareLegiScanBillRecency);
  const half = Math.ceil(limit / 2);
  const takeHouse = Math.min(house.length, half);
  const takeSenate = Math.min(senate.length, half);
  const chosen: T[] = [...house.slice(0, takeHouse), ...senate.slice(0, takeSenate)];
  const used = new Set(chosen.map((b) => b.bill_id));
  if (chosen.length < limit) {
    const remainder = [...house.slice(takeHouse), ...senate.slice(takeSenate), ...other]
      .filter((b) => !used.has(b.bill_id))
      .sort(compareLegiScanBillRecency);
    for (const b of remainder) {
      if (chosen.length >= limit) break;
      chosen.push(b);
      used.add(b.bill_id);
    }
  }
  if (chosen.length < limit) {
    const more = bills.filter((b) => !used.has(b.bill_id)).sort(compareLegiScanBillRecency);
    for (const b of more) {
      if (chosen.length >= limit) break;
      chosen.push(b);
      used.add(b.bill_id);
    }
  }
  return chosen;
}

export interface SyncOptions {
  dryRun?: boolean;
  source?: string;
  limit?: number;
  /**
   * Skip per-bill LegiScan `getBill` calls (faster sync; `sponsors` on ky_bills will not be updated).
   * Use for cron jobs if API time or quota is a concern; run a full sync periodically for sponsor JSON.
   */
  skipBillSponsorDetails?: boolean;
  /**
   * LegiScan `session_id` from `getSessionList` (KY). When set, only this General Assembly is synced
   * and `historicSessions` is ignored. Use for a targeted historic backfill.
   */
  legiscanSessionId?: number;
  /**
   * How many recent KY sessions to sync (default `1`). Each session pulls up to `limit` bills
   * (LegiScan master list, chamber-balanced). Set `2` or higher to backfill prior assemblies.
   * Skips sessions whose master list is empty. Requires more LegiScan API time and quota.
   * Ignored when `quotaBackfill` is true (session choice uses `ky_sync_state` cursor instead).
   */
  historicSessions?: number;
  /**
   * Quota-friendly backfill: one `getMasterList` per session, upsert **all** bill rows from that list,
   * but call `getBill` (sponsors) only for the `sponsorDetailBudgetPerSession` most recently acted-on bills.
   * Preserves existing `sponsors` in DB for other rows. Uses `ky_sync_state` to advance to older GAs each run
   * (`quotaBackfillSessionsPerRun` sessions per invocation). Apply migration `005_ky_sync_state.sql`.
   */
  quotaBackfill?: boolean;
  /** With `quotaBackfill`: how many sessions to process per sync (default `1`). Cursor advances by this amount. */
  quotaBackfillSessionsPerRun?: number;
  /** With `quotaBackfill`: max `getBill` calls per session (default `20`). */
  sponsorDetailBudgetPerSession?: number;
  /** With `quotaBackfill`: write next cursor after success (default true). Dry run never advances. */
  quotaBackfillAdvanceCursor?: boolean;
  /**
   * Hash-gated incremental bills sync (LegiScan plan §3). When true, uses `getMasterListRaw`
   * + stored `change_hash` to skip unchanged bills; only changed/new bills trigger `getBill`.
   * Default off — standard path unchanged. Requires migration 007 columns on `ky_bills`.
   */
  useChangeHash?: boolean;
}

export interface SyncResult {
  source: string;
  status: 'success' | 'error' | 'skipped';
  itemsSynced: number;
  error?: string;
  duration: number;
}

const log = (source: string, msg: string) => console.log(`[Sync:${source}] ${msg}`);
const logError = (source: string, msg: string) => console.error(`[Sync:${source}] ERROR: ${msg}`);

/** PostgREST when `lrc_profile_url` column exists in repo migrations but remote DB was not migrated. */
function isMissingLrcProfileUrlColumn(err: { message?: string } | null): boolean {
  return (err?.message || '').toLowerCase().includes('lrc_profile_url');
}

function isMissingCommitteeMembershipsColumn(err: { message?: string } | null): boolean {
  const m = (err?.message || '').toLowerCase();
  return m.includes('committee_memberships');
}

function isMissingExternalLinksColumn(err: { message?: string } | null): boolean {
  return (err?.message || '').toLowerCase().includes('external_links');
}

function getSupabase() {
  if (!supabaseAdmin) {
    throw new Error('Supabase service role client not configured. Set SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY.');
  }
  return supabaseAdmin;
}

async function updateSourceStatus(
  sourceName: string,
  status: KYSource['status'],
  itemsSynced: number,
  errorMessage?: string,
): Promise<void> {
  try {
    const db = getSupabase();
    await db.from('ky_sources').upsert(
      {
        source_name: sourceName,
        status,
        items_synced: itemsSynced,
        last_sync_at: new Date().toISOString(),
        error_message: errorMessage || null,
      },
      { onConflict: 'source_name' },
    );
  } catch (err: any) {
    logError(sourceName, `Failed to update source status: ${err.message}`);
  }
}

const LEGISCAN_BILL_BACKFILL_CURSOR_KEY = 'legiscan_bill_backfill';

async function readLegiscanBackfillCursor(db: ReturnType<typeof getSupabase>): Promise<number> {
  const { data, error } = await db
    .from('ky_sync_state')
    .select('payload')
    .eq('key', LEGISCAN_BILL_BACKFILL_CURSOR_KEY)
    .maybeSingle();
  if (error) {
    log(
      'bills',
      `ky_sync_state unreadable (${error.message}). Apply supabase/migrations/005_ky_sync_state.sql — using cursor 0`,
    );
    return 0;
  }
  const idx = (data?.payload as { next_session_index?: number } | null)?.next_session_index;
  return typeof idx === 'number' && idx >= 0 ? idx : 0;
}

async function writeLegiscanBackfillCursor(db: ReturnType<typeof getSupabase>, index: number): Promise<void> {
  const { error } = await db.from('ky_sync_state').upsert(
    {
      key: LEGISCAN_BILL_BACKFILL_CURSOR_KEY,
      payload: { next_session_index: index },
      updated_at: new Date().toISOString(),
    },
    { onConflict: 'key' },
  );
  if (error) {
    log(
      'bills',
      `ky_sync_state not updated (${error.message}). Apply supabase/migrations/005_ky_sync_state.sql so the backfill cursor persists; next run will start at cursor 0 again.`,
    );
  }
}

async function fetchExistingHashesByLegiscanIds(
  db: ReturnType<typeof getSupabase>,
  legiscanIds: number[],
): Promise<Map<number, string | null>> {
  const map = new Map<number, string | null>();
  const CHUNK = 300;
  for (let i = 0; i < legiscanIds.length; i += CHUNK) {
    const chunk = legiscanIds.slice(i, i + CHUNK);
    const { data } = await db.from('ky_bills').select('legiscan_id, change_hash').in('legiscan_id', chunk);
    for (const row of data || []) {
      if (row.legiscan_id != null) {
        map.set(Number(row.legiscan_id), (row.change_hash as string | null) ?? null);
      }
    }
  }
  return map;
}

async function fetchExistingSponsorsByLegiscanIds(
  db: ReturnType<typeof getSupabase>,
  legiscanIds: number[],
): Promise<Map<number, unknown>> {
  const map = new Map<number, unknown>();
  const CHUNK = 300;
  for (let i = 0; i < legiscanIds.length; i += CHUNK) {
    const chunk = legiscanIds.slice(i, i + CHUNK);
    const { data } = await db.from('ky_bills').select('legiscan_id, sponsors').in('legiscan_id', chunk);
    for (const row of data || []) {
      if (row.legiscan_id != null) map.set(Number(row.legiscan_id), row.sponsors);
    }
  }
  return map;
}

async function fetchExistingLegiscanSubjectsByLegiscanIds(
  db: ReturnType<typeof getSupabase>,
  legiscanIds: number[],
): Promise<Map<number, { legiscan_subjects: unknown; legiscan_subjects_search: string | null }>> {
  const map = new Map<number, { legiscan_subjects: unknown; legiscan_subjects_search: string | null }>();
  const CHUNK = 300;
  for (let i = 0; i < legiscanIds.length; i += CHUNK) {
    const chunk = legiscanIds.slice(i, i + CHUNK);
    const { data } = await db
      .from('ky_bills')
      .select('legiscan_id, legiscan_subjects, legiscan_subjects_search')
      .in('legiscan_id', chunk);
    for (const row of data || []) {
      if (row.legiscan_id != null) {
        map.set(Number(row.legiscan_id), {
          legiscan_subjects: row.legiscan_subjects,
          legiscan_subjects_search: (row.legiscan_subjects_search as string | null) ?? null,
        });
      }
    }
  }
  return map;
}

// --- Bills (LegiScan) ---
async function buildBillRowsForSession(
  source: string,
  client: KyLegiScanClient,
  latestSession: LegiScanSession,
  toSync: LegiScanBillSummary[],
  skipSponsors: boolean,
): Promise<Record<string, unknown>[]> {
  const rows: Record<string, unknown>[] = [];
  for (let i = 0; i < toSync.length; i++) {
    const bill = toSync[i];
    const topics = classifyTopics(bill.title, bill.description || '');
    let sponsors: unknown = null;
    let introducedDate: string | null = null;
    let detailFetched = false;
    let detail: LegiScanBillDetail | null = null;
    if (!skipSponsors) {
      try {
        detail = await client.fetchBillDetail(bill.bill_id);
        if (detail) {
          detailFetched = true;
          if (detail.sponsors?.length) {
            sponsors = detail.sponsors;
          }
          introducedDate = deriveIntroducedDate(detail);
        }
      } catch (err: any) {
        log(source, `Sponsor fetch failed for ${bill.number}: ${err?.message || err}`);
      }
    }
    const row: Record<string, unknown> = {
      legiscan_id: bill.bill_id,
      bill_number: bill.number,
      title: bill.title,
      description: bill.description || null,
      session: latestSession.session_name,
      status: mapLegiScanBillStatus(bill.status, bill.last_action || ''),
      chamber: chamberFromBillNumber(bill.number),
      last_action: bill.last_action || null,
      last_action_date: bill.last_action_date || null,
      bill_text_url: bill.url || null,
      topics: topics.length > 0 ? topics : null,
      source: 'legiscan',
    };
    // Audit item #2: when sponsor details are skipped (e.g. daily cron), omit the
    // sponsors key entirely so Supabase leaves the existing column value intact
    // instead of overwriting sponsor data populated by manual backfill runs.
    if (!skipSponsors) {
      row.sponsors = sponsors;
    }
    // Audit item #3: only set introduced_date when getBill detail was fetched;
    // otherwise omit the key to preserve any value populated by a prior enrich run.
    if (detailFetched) {
      row.introduced_date = introducedDate;
      Object.assign(row, committeeFieldsFromLegiScanDetail(detail));
      Object.assign(row, legiscanSubjectColumnsFromDetail(detail));
    }
    rows.push(row);
    if (!skipSponsors && (i + 1) % 25 === 0) {
      log(source, `Enriched sponsors ${i + 1}/${toSync.length}`);
    }
  }
  return rows;
}

/** Full master list: enrich sponsors only for the `sponsorBudget` most recent bills; keep existing sponsors for others. */
async function buildBillRowsQuotaSession(
  source: string,
  client: KyLegiScanClient,
  session: LegiScanSession,
  bills: LegiScanBillSummary[],
  opts: {
    skipSponsors: boolean;
    sponsorBudget: number;
    existingSponsors: Map<number, unknown>;
    existingLegiscanSubjects: Map<
      number,
      { legiscan_subjects: unknown; legiscan_subjects_search: string | null }
    >;
  },
): Promise<Record<string, unknown>[]> {
  const sortedByDate = [...bills].sort((a, b) => {
    const ta = a.last_action_date ? new Date(a.last_action_date).getTime() : 0;
    const tb = b.last_action_date ? new Date(b.last_action_date).getTime() : 0;
    return tb - ta;
  });
  const enrichIds = new Set<number>();
  if (!opts.skipSponsors && opts.sponsorBudget > 0) {
    for (const b of sortedByDate.slice(0, opts.sponsorBudget)) {
      enrichIds.add(b.bill_id);
    }
  }
  log(
    source,
    `Quota session ${session.session_name}: ${bills.length} rows, ${enrichIds.size} getBill sponsor pulls (cap ${opts.sponsorBudget})`,
  );

  const rows: Record<string, unknown>[] = [];
  let enrichDone = 0;
  for (const bill of bills) {
    const topics = classifyTopics(bill.title, bill.description || '');
    let sponsors: unknown = null;
    let introducedDate: string | null = null;
    let detailFetched = false;
    let detail: LegiScanBillDetail | null = null;
    if (enrichIds.has(bill.bill_id)) {
      try {
        detail = await client.fetchBillDetail(bill.bill_id);
        if (detail) {
          detailFetched = true;
          if (detail.sponsors?.length) sponsors = detail.sponsors;
          introducedDate = deriveIntroducedDate(detail);
        }
      } catch (err: any) {
        log(source, `Sponsor fetch failed for ${bill.number}: ${err?.message || err}`);
      }
      enrichDone++;
      if (enrichDone % 10 === 0) {
        log(source, `Sponsor enrichment ${enrichDone}/${enrichIds.size}`);
      }
    } else {
      sponsors = opts.existingSponsors.has(bill.bill_id)
        ? opts.existingSponsors.get(bill.bill_id)
        : null;
    }
    const row: Record<string, unknown> = {
      legiscan_id: bill.bill_id,
      bill_number: bill.number,
      title: bill.title,
      description: bill.description || null,
      session: session.session_name,
      status: mapLegiScanBillStatus(bill.status, bill.last_action || ''),
      chamber: chamberFromBillNumber(bill.number),
      last_action: bill.last_action || null,
      last_action_date: bill.last_action_date || null,
      bill_text_url: bill.url || null,
      topics: topics.length > 0 ? topics : null,
      source: 'legiscan',
    };
    // Audit item #2: when sponsor details are skipped (e.g. daily cron), omit the
    // sponsors key entirely so Supabase leaves the existing column value intact
    // instead of overwriting sponsor data populated by manual backfill runs.
    if (!opts.skipSponsors) {
      row.sponsors = sponsors;
    }
    // Audit item #3: only set introduced_date when getBill detail was fetched;
    // otherwise omit the key to preserve any value populated by a prior enrich run.
    if (detailFetched) {
      row.introduced_date = introducedDate;
      Object.assign(row, committeeFieldsFromLegiScanDetail(detail));
      Object.assign(row, legiscanSubjectColumnsFromDetail(detail));
    } else {
      const prev = opts.existingLegiscanSubjects.get(bill.bill_id);
      if (prev !== undefined) {
        row.legiscan_subjects = prev.legiscan_subjects;
        row.legiscan_subjects_search = prev.legiscan_subjects_search;
      }
    }
    rows.push(row);
  }
  return rows;
}

async function upsertKyBillRows(
  source: string,
  db: ReturnType<typeof getSupabase>,
  rows: Record<string, unknown>[],
): Promise<number> {
  const BATCH = 100;
  let synced = 0;
  for (let i = 0; i < rows.length; i += BATCH) {
    const batch = rows.slice(i, i + BATCH);
    const { error } = await db.from('ky_bills').upsert(batch, { onConflict: 'legiscan_id' });
    if (error) logError(source, `Batch ${i / BATCH + 1}: ${error.message}`);
    else synced += batch.length;
  }
  return synced;
}

/**
 * Hash-gated incremental bills sync (LegiScan plan §3). Uses `getMasterListRaw` and
 * stored `change_hash` on `ky_bills` to skip unchanged bills; `getBill` is only
 * called for changed or new bills. Requires migration 007 columns.
 */
async function syncKyBillsByHash(
  source: string,
  client: KyLegiScanClient,
  sortedSessions: LegiScanSession[],
  options: SyncOptions,
  start: number,
): Promise<SyncResult> {
  const skipSponsors = options.skipBillSponsorDetails === true;

  let sessionJobs: { session: LegiScanSession; rawBills: LegiScanMasterListRawBill[] }[] = [];
  if (options.legiscanSessionId != null && !Number.isNaN(options.legiscanSessionId)) {
    const sid = options.legiscanSessionId;
    const meta = sortedSessions.find((s) => s.session_id === sid);
    if (!meta) {
      const msg = `legiscanSessionId ${sid} not found in KY session list (check LegiScan getSessionList)`;
      logError(source, msg);
      await updateSourceStatus(source, 'error', 0, msg);
      return { source, status: 'error', itemsSynced: 0, error: msg, duration: Date.now() - start };
    }
    const rawBills = await client.fetchMasterListRaw(sid);
    if (!rawBills.length) {
      log(source, `Session ${meta.session_name} has 0 bills on masterlistraw`);
      if (!options.dryRun) await updateSourceStatus(source, 'success', 0);
      return { source, status: 'success', itemsSynced: 0, duration: Date.now() - start };
    }
    sessionJobs = [{ session: meta, rawBills }];
    log(source, `Hash-gated single session: ${meta.session_name} (${rawBills.length} raw bills)`);
  } else {
    const wantSessions = Math.max(1, options.historicSessions ?? 1);
    for (const s of sortedSessions) {
      if (sessionJobs.length >= wantSessions) break;
      const rawBills = await client.fetchMasterListRaw(s.session_id);
      if (!rawBills.length) {
        log(source, `Skipping ${s.session_name} (0 bills on masterlistraw)`);
        continue;
      }
      sessionJobs.push({ session: s, rawBills });
      log(source, `Queued ${s.session_name} (${rawBills.length} raw bills, hash-gated)`);
    }
  }

  if (!sessionJobs.length) {
    log(source, 'Hash-gated: no sessions with bills found');
    if (!options.dryRun) await updateSourceStatus(source, 'success', 0);
    return { source, status: 'success', itemsSynced: 0, duration: Date.now() - start };
  }

  const db = options.dryRun ? null : getSupabase();
  const readDb = db ?? getSupabase(); // always read, even in dry-run
  let grandScanned = 0;
  let grandUnchanged = 0;
  let grandChanged = 0;
  let grandNew = 0;
  let grandSynced = 0;

  for (const { session, rawBills } of sessionJobs) {
    const scanned = rawBills.length;
    const existingHashes = await fetchExistingHashesByLegiscanIds(
      readDb,
      rawBills.map((b) => b.bill_id),
    );

    const changedOrNew: LegiScanMasterListRawBill[] = [];
    let unchanged = 0;
    let changed = 0;
    let inserted = 0;
    for (const b of rawBills) {
      const stored = existingHashes.get(b.bill_id);
      if (stored === undefined) {
        inserted++;
        changedOrNew.push(b);
      } else if (stored && b.change_hash && stored === b.change_hash) {
        unchanged++;
      } else {
        changed++;
        changedOrNew.push(b);
      }
    }
    log(
      source,
      `${session.session_name} hash-gated: scanned=${scanned} unchanged_skipped=${unchanged} changed_updated=${changed} new_inserted=${inserted}`,
    );

    grandScanned += scanned;
    grandUnchanged += unchanged;
    grandChanged += changed;
    grandNew += inserted;

    if (options.dryRun || !changedOrNew.length || !db) continue;

    const existingSubjectsForBatch = await fetchExistingLegiscanSubjectsByLegiscanIds(
      db,
      changedOrNew.map((b) => b.bill_id),
    );

    const rows: Record<string, unknown>[] = [];
    for (let i = 0; i < changedOrNew.length; i++) {
      const raw = changedOrNew[i];
      // `getMasterListRaw` returns only bill_id / number / change_hash — it does NOT carry
      // title, status, last_action, etc.  We must call getBillDetail for every changed bill to
      // get the full record.  `skipSponsors` controls whether sponsor data is *written* to the
      // row, not whether the detail fetch happens at all.
      let sponsors: unknown = null;
      let introducedDate: string | null = null;
      let detailFetched = false;
      let detail: LegiScanBillDetail | null = null;
      try {
        detail = await client.fetchBillDetail(raw.bill_id);
        if (detail) {
          detailFetched = true;
          if (!skipSponsors && detail.sponsors?.length) sponsors = detail.sponsors;
          introducedDate = deriveIntroducedDate(detail);
        }
      } catch (err: any) {
        log(source, `Detail fetch failed for ${raw.number}: ${err?.message || err}`);
      }
      if (!detail) continue; // skip if detail fetch failed entirely
      const topics = classifyTopics(detail.title || '', detail.description || '');
      // Build the last_action string the same way the accuracy checker does — from the
      // detail's history array — so the status mapper gets consistent input.
      const lastActionFromDetail = (() => {
        if (detail.last_action) return detail.last_action;
        const history = Array.isArray(detail.history) ? detail.history : [];
        let latest: { action?: string; date?: string } | null = null;
        for (const h of history) {
          if (!h?.action) continue;
          if (!latest || new Date(h.date ?? '').getTime() >= new Date(latest.date ?? '').getTime()) {
            latest = h;
          }
        }
        return latest?.action ?? '';
      })();
      const row: Record<string, unknown> = {
        legiscan_id: raw.bill_id,
        bill_number: detail.number || raw.number,
        title: detail.title,
        description: detail.description || null,
        session: session.session_name,
        status: mapLegiScanBillStatus(detail.status ?? raw.status, lastActionFromDetail),
        chamber: chamberFromBillNumber(raw.number),
        last_action: lastActionFromDetail || null,
        last_action_date: detail.last_action_date || null,
        bill_text_url: detail.url || raw.url || null,
        topics: topics.length > 0 ? topics : null,
        source: 'legiscan',
        change_hash: raw.change_hash || null,
        legiscan_session_id: session.session_id,
        updated_from_legiscan_at: new Date().toISOString(),
      };
      if (!skipSponsors) row.sponsors = sponsors;
      row.introduced_date = introducedDate;
      Object.assign(row, committeeFieldsFromLegiScanDetail(detail));
      Object.assign(row, legiscanSubjectColumnsFromDetail(detail));
      rows.push(row);
      if ((i + 1) % 25 === 0) {
        log(source, `Hash-gated enrich ${i + 1}/${changedOrNew.length}`);
      }
    }
    const prevSnapshots = await fetchBillHistorySnapshots(
      db,
      changedOrNew.map((b) => b.bill_id),
    );
    const synced = await upsertKyBillRows(source, db, rows);
    grandSynced += synced;
    try {
      await recordBillStatusHistoryForBuiltBatch({
        db,
        prevByLegiscan: prevSnapshots,
        rawBills: changedOrNew,
        builtRows: rows,
      });
    } catch (histErr: unknown) {
      logError(source, `Bill status history: ${histErr instanceof Error ? histErr.message : String(histErr)}`);
    }
    log(source, `${session.session_name}: upserted ${synced}/${rows.length} (hash-gated)`);
  }

  log(
    source,
    `Hash-gated totals: scanned=${grandScanned} unchanged_skipped=${grandUnchanged} changed_updated=${grandChanged} new_inserted=${grandNew}`,
  );

  if (options.dryRun) {
    log(source, `[DRY RUN] Would upsert ${grandChanged + grandNew} bill rows (hash-gated)`);
    return { source, status: 'success', itemsSynced: grandChanged + grandNew, duration: Date.now() - start };
  }

  await updateSourceStatus(source, 'success', grandSynced);
  return { source, status: 'success', itemsSynced: grandSynced, duration: Date.now() - start };
}

export async function syncKyBills(options: SyncOptions = {}): Promise<SyncResult> {
  const start = Date.now();
  const source = 'bills';
  log(source, 'Starting bills sync from LegiScan');
  try {
    const client = getKyLegiScanClient();
    const sessions = await client.fetchSessions();
    if (!sessions.length) {
      log(source, 'No sessions found');
      return { source, status: 'success', itemsSynced: 0, duration: Date.now() - start };
    }
    const sorted = [...sessions].sort((a, b) => (b.year_end || 0) - (a.year_end || 0));

    if (options.useChangeHash === true) {
      return await syncKyBillsByHash(source, client, sorted, options, start);
    }

    const limit = options.limit ?? 250;
    const skipSponsors = options.skipBillSponsorDetails === true;
    const quotaBackfill = options.quotaBackfill === true;
    const sponsorBudget = Math.max(0, options.sponsorDetailBudgetPerSession ?? 20);
    const sessionsPerRun = Math.max(1, options.quotaBackfillSessionsPerRun ?? 1);
    const advanceCursor = options.quotaBackfillAdvanceCursor !== false;

    if (skipSponsors) {
      log(source, 'skipBillSponsorDetails: true — no getBill sponsor pulls this run');
    }

    let sessionJobs: { session: LegiScanSession; bills: LegiScanBillSummary[] }[] = [];
    /** Next cursor index after this run (quota mode only); `null` = do not advance. */
    let nextCursorAfterRun: number | null = null;

    if (quotaBackfill && options.legiscanSessionId != null && !Number.isNaN(options.legiscanSessionId)) {
      const sid = options.legiscanSessionId;
      const meta = sorted.find((s) => s.session_id === sid);
      if (!meta) {
        const msg = `legiscanSessionId ${sid} not found in KY session list (check LegiScan getSessionList)`;
        logError(source, msg);
        await updateSourceStatus(source, 'error', 0, msg);
        return { source, status: 'error', itemsSynced: 0, error: msg, duration: Date.now() - start };
      }
      const bills = await client.fetchBills(sid);
      if (!bills.length) {
        log(source, `Session ${meta.session_name} has 0 bills on master list`);
        return { source, status: 'success', itemsSynced: 0, duration: Date.now() - start };
      }
      sessionJobs = [{ session: meta, bills }];
      nextCursorAfterRun = null;
      log(
        source,
        `Quota backfill (single session): ${meta.session_name} — full master list ${bills.length} bills`,
      );
    } else if (quotaBackfill) {
      let cursorStart = 0;
      try {
        const dbRead = getSupabase();
        cursorStart = await readLegiscanBackfillCursor(dbRead);
      } catch {
        log(source, 'Supabase unavailable — cursor 0');
      }
      if (cursorStart >= sorted.length) cursorStart = 0;
      const end = Math.min(cursorStart + sessionsPerRun, sorted.length);
      const slice = sorted.slice(cursorStart, end);
      nextCursorAfterRun = end >= sorted.length ? 0 : end;
      log(
        source,
        `Quota backfill cursor: sessions [${cursorStart}, ${end}) of ${sorted.length}; next cursor → ${nextCursorAfterRun}`,
      );
      for (const s of slice) {
        const bills = await client.fetchBills(s.session_id);
        if (!bills.length) {
          log(source, `Skipping ${s.session_name} (0 bills on master list)`);
          continue;
        }
        sessionJobs.push({ session: s, bills });
        log(source, `Queued ${s.session_name} (${bills.length} bills, master list)`);
      }
    } else if (options.legiscanSessionId != null && !Number.isNaN(options.legiscanSessionId)) {
      const sid = options.legiscanSessionId;
      const meta = sorted.find((s) => s.session_id === sid);
      if (!meta) {
        const msg = `legiscanSessionId ${sid} not found in KY session list (check LegiScan getSessionList)`;
        logError(source, msg);
        await updateSourceStatus(source, 'error', 0, msg);
        return { source, status: 'error', itemsSynced: 0, error: msg, duration: Date.now() - start };
      }
      const bills = await client.fetchBills(sid);
      if (!bills.length) {
        log(source, `Session ${meta.session_name} has 0 bills on master list`);
        return { source, status: 'success', itemsSynced: 0, duration: Date.now() - start };
      }
      sessionJobs = [{ session: meta, bills }];
      log(source, `Single session mode: ${meta.session_name} (${bills.length} bills on master list)`);
    } else {
      const wantSessions = Math.max(1, options.historicSessions ?? 1);
      for (const s of sorted) {
        if (sessionJobs.length >= wantSessions) break;
        const bills = await client.fetchBills(s.session_id);
        if (!bills.length) {
          log(source, `Skipping ${s.session_name} (0 bills on master list)`);
          continue;
        }
        sessionJobs.push({ session: s, bills });
        log(source, `Queued ${s.session_name} (${bills.length} bills on master list)`);
      }
      if (!sessionJobs.length) {
        log(source, 'No sessions with bills found');
        return { source, status: 'success', itemsSynced: 0, duration: Date.now() - start };
      }
      if (wantSessions > 1) {
        log(source, `Historic mode: syncing ${sessionJobs.length} session(s), up to ${limit} bills each`);
      }
    }

    if (options.dryRun) {
      if (quotaBackfill) {
        let n = 0;
        let enrich = 0;
        for (const { bills } of sessionJobs) {
          n += bills.length;
          enrich += skipSponsors ? 0 : Math.min(sponsorBudget, bills.length);
        }
        log(
          source,
          `[DRY RUN] Would upsert ${n} bill rows, ~${enrich} getBill calls, ${sessionJobs.length} session(s); cursor advance: ${advanceCursor && nextCursorAfterRun != null ? nextCursorAfterRun : 'no'}`,
        );
        return { source, status: 'success', itemsSynced: n, duration: Date.now() - start };
      }
      let totalDry = 0;
      for (const { session, bills } of sessionJobs) {
        const toSync = selectBillsForSync(bills, limit);
        if (bills.length > limit) {
          log(
            source,
            `Would limit ${session.session_name} to ${limit} of ${bills.length} bills (chamber-balanced)`,
          );
        }
        totalDry += toSync.length;
      }
      log(source, `[DRY RUN] Would upsert ${totalDry} bills across ${sessionJobs.length} session(s)`);
      return { source, status: 'success', itemsSynced: totalDry, duration: Date.now() - start };
    }

    if (!sessionJobs.length) {
      log(source, 'Nothing to sync (no bills in selected sessions)');
      if (quotaBackfill && advanceCursor && nextCursorAfterRun != null) {
        const db = getSupabase();
        await writeLegiscanBackfillCursor(db, nextCursorAfterRun);
        log(source, `Advanced cursor to ${nextCursorAfterRun} (empty slice)`);
      }
      await updateSourceStatus(source, 'success', 0);
      return { source, status: 'success', itemsSynced: 0, duration: Date.now() - start };
    }

    const db = getSupabase();
    let totalSynced = 0;

    for (const { session, bills } of sessionJobs) {
      if (quotaBackfill) {
        const existing = await fetchExistingSponsorsByLegiscanIds(
          db,
          bills.map((b) => b.bill_id),
        );
        const existingLegiscanSubjects = await fetchExistingLegiscanSubjectsByLegiscanIds(
          db,
          bills.map((b) => b.bill_id),
        );
        const rows = await buildBillRowsQuotaSession(source, client, session, bills, {
          skipSponsors,
          sponsorBudget,
          existingSponsors: existing,
          existingLegiscanSubjects,
        });
        const legiscanIds = rows.map((r) => Number(r.legiscan_id));
        const prevSnapshots = await fetchBillHistorySnapshots(db, legiscanIds);
        const synced = await upsertKyBillRows(source, db, rows);
        totalSynced += synced;
        try {
          const rawBills = legiscanIds.map((id, i) => ({
            bill_id: id,
            change_hash: (rows[i]!.change_hash as string | null | undefined) ?? null,
          }));
          await recordBillStatusHistoryForBuiltBatch({
            db,
            prevByLegiscan: prevSnapshots,
            rawBills,
            builtRows: rows,
          });
        } catch (histErr: unknown) {
          logError(source, `Bill status history: ${histErr instanceof Error ? histErr.message : String(histErr)}`);
        }
        log(source, `Upserted ${synced}/${bills.length} for ${session.session_name} (quota backfill)`);
      } else {
        const toSync = selectBillsForSync(bills, limit);
        const nHouse = toSync.filter((b) => chamberFromBillNumber(b.number) === 'house').length;
        const nSenate = toSync.filter((b) => chamberFromBillNumber(b.number) === 'senate').length;
        log(
          source,
          `${session.session_name}: syncing ${toSync.length} of ${bills.length} bills (house ${nHouse}, senate ${nSenate}, other ${toSync.length - nHouse - nSenate})`,
        );
        const rows = await buildBillRowsForSession(source, client, session, toSync, skipSponsors);
        const legiscanIds = rows.map((r) => Number(r.legiscan_id));
        const prevSnapshots = await fetchBillHistorySnapshots(db, legiscanIds);
        const synced = await upsertKyBillRows(source, db, rows);
        totalSynced += synced;
        try {
          const rawBills = legiscanIds.map((id, i) => ({
            bill_id: id,
            change_hash: (rows[i]!.change_hash as string | null | undefined) ?? null,
          }));
          await recordBillStatusHistoryForBuiltBatch({
            db,
            prevByLegiscan: prevSnapshots,
            rawBills,
            builtRows: rows,
          });
        } catch (histErr: unknown) {
          logError(source, `Bill status history: ${histErr instanceof Error ? histErr.message : String(histErr)}`);
        }
        log(source, `Upserted ${synced}/${toSync.length} for ${session.session_name}`);
      }
    }

    if (quotaBackfill && advanceCursor && nextCursorAfterRun != null) {
      await writeLegiscanBackfillCursor(db, nextCursorAfterRun);
      log(source, `LegiScan backfill cursor → ${nextCursorAfterRun}`);
    }

    await updateSourceStatus(source, 'success', totalSynced);
    return { source, status: 'success', itemsSynced: totalSynced, duration: Date.now() - start };
  } catch (err: any) {
    logError(source, err.message);
    await updateSourceStatus(source, 'error', 0, err.message);
    return { source, status: 'error', itemsSynced: 0, error: err.message, duration: Date.now() - start };
  }
}

// --- Legislators (Open States) ---

function legiscanSessionRoleToChamber(role: string | null | undefined): 'house' | 'senate' | null {
  const r = (role || '').toLowerCase();
  if (r.includes('sen')) return 'senate';
  if (r.includes('rep') || r.includes('del')) return 'house';
  return null;
}

function legiscanSessionPeopleAtSeat(
  people: LegiScanSessionPerson[],
  chamber: 'house' | 'senate',
  districtNorm: string,
): LegiScanSessionPerson[] {
  return people.filter((p) => {
    const ch = legiscanSessionRoleToChamber(p.role);
    if (ch !== chamber) return false;
    const pDist = normalizeKyLegislatorDistrictForDb(ch, p.district);
    return Boolean(pDist && pDist === districtNorm);
  });
}

function legiscanSessionPeopleMatchingLegislatorName(
  people: LegiScanSessionPerson[],
  leg: {
    name: string;
    first_name: string | null;
    last_name: string | null;
    chamber: string | null;
    district: string | null;
  },
): LegiScanSessionPerson[] {
  if (leg.chamber !== 'house' && leg.chamber !== 'senate') return [];
  const districtNorm = (leg.district || '').trim();
  if (!districtNorm) return [];

  const legName = normalizeSponsorNameForMatch(
    (leg.name || '').trim() || `${leg.first_name || ''} ${leg.last_name || ''}`.trim(),
  );
  if (!legName) return [];

  return people.filter((p) => {
    const ch = legiscanSessionRoleToChamber(p.role);
    if (ch !== leg.chamber) return false;
    const pDist = normalizeKyLegislatorDistrictForDb(ch, p.district);
    if (!pDist || pDist !== districtNorm) return false;
    const pName = (p.name || '').trim() || `${p.first_name || ''} ${p.last_name || ''}`.trim();
    if (!pName) return false;
    const pNorm = normalizeSponsorNameForMatch(pName);
    if (pNorm.length > 0 && pNorm === legName) return true;
    return legislatorNameMatchesLegiscanSessionPerson(leg, pName);
  });
}

/**
 * Refresh `ky_legislators.legiscan_id` from LegiScan `getSessionPeople` for the latest KY session so public
 * `/people/id/{id}` links and vote joins stay aligned after turnover (stale rows often keep the predecessor id).
 */
async function reconcileKyLegislatorLegiscanIdsFromLatestSession(
  db: ReturnType<typeof getSupabase>,
  legiscanClient: KyLegiScanClient,
): Promise<number> {
  const sessions = await legiscanClient.fetchSessions();
  if (!sessions.length) return 0;
  const sortedSessions = [...sessions].sort((a, b) => (b.year_end || 0) - (a.year_end || 0));
  const sessionId = sortedSessions[0]!.session_id;
  const people = await legiscanClient.getSessionPeople(sessionId);
  if (!people.length) return 0;

  const { data: legs, error } = await db
    .from('ky_legislators')
    .select('id, name, first_name, last_name, chamber, district, legiscan_id')
    .eq('active', true);
  if (error) throw new Error(error.message);
  if (!legs?.length) return 0;

  const nowIso = new Date().toISOString();
  let updated = 0;

  for (const leg of legs as Array<{
    id: string;
    name: string;
    first_name: string | null;
    last_name: string | null;
    chamber: string | null;
    district: string | null;
    legiscan_id: number | null;
  }>) {
    if (leg.chamber !== 'house' && leg.chamber !== 'senate') continue;
    const districtNorm = (leg.district || '').trim();
    if (!districtNorm) continue;

    const legName = normalizeSponsorNameForMatch(
      (leg.name || '').trim() || `${leg.first_name || ''} ${leg.last_name || ''}`.trim(),
    );
    if (!legName) continue;

    let matches = legiscanSessionPeopleMatchingLegislatorName(people, leg);
    // Preferred vs legal names (e.g. Sarge/Michael Pollock, Max/George Wise) — unique seat is enough.
    if (matches.length !== 1) {
      const seatMatches = legiscanSessionPeopleAtSeat(people, leg.chamber, districtNorm);
      if (seatMatches.length === 1) matches = seatMatches;
    }

    if (matches.length !== 1) continue;
    const pid = matches[0]!.people_id;
    if (leg.legiscan_id === pid) continue;

    const { error: clearErr } = await db
      .from('ky_legislators')
      .update({ legiscan_id: null, updated_at: nowIso })
      .eq('legiscan_id', pid)
      .neq('id', leg.id);
    if (clearErr) throw new Error(clearErr.message);

    const { error: upErr } = await db
      .from('ky_legislators')
      .update({ legiscan_id: pid, updated_at: nowIso })
      .eq('id', leg.id);
    if (upErr) throw new Error(upErr.message);
    updated++;
  }

  return updated;
}

export async function syncKyLegislators(options: SyncOptions = {}): Promise<SyncResult> {
  const start = Date.now();
  const source = 'legislators';
  log(source, 'Starting legislators sync from Open States');
  try {
    const client = getKyOpenStatesClient();
    const legislators = await client.fetchLegislators();
    log(source, `Fetched ${legislators.length} legislators`);
    if (options.dryRun) {
      log(source, `[DRY RUN] Would upsert ${legislators.length} legislators`);
      return { source, status: 'success', itemsSynced: legislators.length, duration: Date.now() - start };
    }
    const db = getSupabase();

    // Build canonical slug map from ky_committees so committee_memberships stores
    // slugs that exactly match ky_committees.slug (eliminating substring-matching fragility).
    const { data: committeeRows } = await db.from('ky_committees').select('slug, name');
    const canonicalCommitteeMap = new Map<string, string>();
    for (const row of committeeRows ?? []) {
      if (row.slug && row.name) canonicalCommitteeMap.set(committeeSlugFromName(row.name), row.slug);
    }

    const rows = legislators.map((leg) => {
      const cr = openStatesCurrentRole(leg);
      const org = cr?.org_classification;
      const chamber = org === 'upper' ? ('senate' as const) : org === 'lower' ? ('house' as const) : null;
      const districtRaw = cr?.district != null && cr.district !== '' ? String(cr.district) : null;
      const district = normalizeKyLegislatorDistrictForDb(chamber, districtRaw);
      const { lrcProfileUrl, otherWebsiteUrl } = extractOpenStatesLegislatorWebLinks(leg);
      const { first_name, last_name } = openStatesLegislatorNames(leg);
      const { email, phone } = extractOpenStatesContactDetails(leg);
      const committee_memberships =
        canonicalCommitteeMap.size > 0
          ? extractCanonicalCommitteeSlugsFromOpenStatesPerson(leg, canonicalCommitteeMap)
          : extractCommitteeMembershipSlugsFromOpenStatesPerson(leg); // fallback when ky_committees not yet seeded
      const external_links = buildLegislatorExternalLinks(leg.links);
      return {
        openstates_id: leg.id,
        name: leg.name,
        first_name,
        last_name,
        party: leg.party || null,
        chamber,
        role_title: cr?.title?.trim() || null,
        district,
        photo_url: normalizeLegislatorPhotoUrl(leg.image) || null,
        email,
        phone,
        lrc_profile_url: normalizeHttpsUrl(lrcProfileUrl),
        website: sanitizeLegislatorCampaignWebsiteUrl(otherWebsiteUrl, chamber, districtRaw),
        active: true,
        committee_memberships,
        external_links,
      };
    });
    let { error } = await db.from('ky_legislators').upsert(rows, { onConflict: 'openstates_id' });
    if (error && isMissingExternalLinksColumn(error)) {
      log(
        source,
        'Retrying legislator upsert without external_links (run supabase/migrations/023_ky_legislators_external_links.sql)',
      );
      const rowsLegacy = rows.map((r) => {
        const { external_links: _e, ...rest } = r;
        return rest;
      });
      const retryEl = await db.from('ky_legislators').upsert(rowsLegacy, { onConflict: 'openstates_id' });
      error = retryEl.error;
    }
    if (error && isMissingCommitteeMembershipsColumn(error)) {
      log(
        source,
        'Retrying legislator upsert without committee_memberships (run supabase/migrations/017_search_members_discovery.sql)',
      );
      const rowsLegacy = rows.map((r) => {
        const { committee_memberships: _c, external_links: _e, ...rest } = r;
        return rest;
      });
      const retryCm = await db.from('ky_legislators').upsert(rowsLegacy, { onConflict: 'openstates_id' });
      error = retryCm.error;
    }
    if (error && isMissingLrcProfileUrlColumn(error)) {
      log(
        source,
        'Retrying without lrc_profile_url (run supabase/migrations/004_ky_legislators_lrc_profile_url.sql for split LRC vs campaign URLs)',
      );
      const rowsLegacy = rows.map((r) => {
        const { lrc_profile_url: lrc, website: w, external_links: _e, ...rest } = r;
        return {
          ...rest,
          website: w || lrc || null,
        };
      });
      const second = await db.from('ky_legislators').upsert(rowsLegacy, { onConflict: 'openstates_id' });
      error = second.error;
    }
    const synced = error ? 0 : rows.length;
    if (error) {
      logError(source, error.message);
      await updateSourceStatus(source, 'error', 0, error.message);
      return { source, status: 'error', itemsSynced: 0, error: error.message, duration: Date.now() - start };
    }

    const nowIso = new Date().toISOString();
    const syncedOpenStatesIds = new Set(
      rows.map((r) => r.openstates_id).filter((id): id is string => typeof id === 'string' && id.length > 0),
    );

    // First pass: deactivate rows whose openstates_id is absent from the current OS response.
    // Grace period: require 2 consecutive misses before deactivating to survive transient OS data
    // gaps (e.g. a temporary API blip that omits a legislator for one sync run).
    // Miss streaks are tracked in ky_sync_state under LEGISLATORS_OS_MISS_STREAK_KEY.
    const LEGISLATORS_OS_MISS_STREAK_KEY = 'legislators_os_miss_streak';
    const OS_MISS_THRESHOLD = 2;
    if (syncedOpenStatesIds.size > 0) {
      const { data: withOs, error: osFetchErr } = await db
        .from('ky_legislators')
        .select('id, openstates_id')
        .not('openstates_id', 'is', null)
        .eq('active', true);
      if (osFetchErr) {
        logError(source, `Could not read legislators for active cleanup: ${osFetchErr.message}`);
      } else {
        // Load current miss-streak map from sync state.
        const { data: streakRow } = await db
          .from('ky_sync_state')
          .select('payload')
          .eq('key', LEGISLATORS_OS_MISS_STREAK_KEY)
          .maybeSingle();
        const missMap: Record<string, number> =
          (streakRow?.payload as Record<string, number> | null) ?? {};

        const staleIds: string[] = [];
        const warnedIds: string[] = [];

        for (const r of withOs || []) {
          const oid = r.openstates_id as string | null;
          if (!oid) continue;
          if (syncedOpenStatesIds.has(oid)) {
            // Back in OS response — reset streak.
            delete missMap[oid];
          } else {
            const streak = (missMap[oid] ?? 0) + 1;
            if (streak >= OS_MISS_THRESHOLD) {
              staleIds.push(r.id as string);
              delete missMap[oid];
            } else {
              missMap[oid] = streak;
              warnedIds.push(oid);
            }
          }
        }

        if (warnedIds.length) {
          log(
            source,
            `${warnedIds.length} legislator openstates_id(s) missing from OS response (streak 1/${OS_MISS_THRESHOLD} — will deactivate on next miss): ${warnedIds.slice(0, 5).join(', ')}${warnedIds.length > 5 ? '…' : ''}`,
          );
        }

        const CHUNK = 100;
        for (let i = 0; i < staleIds.length; i += CHUNK) {
          const chunk = staleIds.slice(i, i + CHUNK);
          const { error: deactErr } = await db
            .from('ky_legislators')
            .update({ active: false, updated_at: nowIso })
            .in('id', chunk);
          if (deactErr) logError(source, `Mark inactive chunk failed: ${deactErr.message}`);
        }
        if (staleIds.length) {
          log(source, `Marked ${staleIds.length} legislator row(s) inactive (absent from Open States ${OS_MISS_THRESHOLD} consecutive syncs)`);
        }

        // Persist updated streak map.
        await db.from('ky_sync_state').upsert(
          { key: LEGISLATORS_OS_MISS_STREAK_KEY, payload: missMap, updated_at: nowIso },
          { onConflict: 'key' },
        );
      }
    }

    // Second pass: deactivate LegiScan-only rows (no openstates_id) at seats
    // where this sync just produced a current Open States row. Those legacy
    // rows are predecessors or alias dupes (e.g. "Matthew Lehman" alongside
    // the canonical "Matt Lehman" with openstates_id). Conservative: only
    // deactivate at seats Open States covers; never at seats it doesn't.
    {
      const activeSeats = new Set<string>();
      for (const r of rows) {
        if (!r.openstates_id || !r.chamber || !r.district) continue;
        activeSeats.add(`${r.chamber}|${r.district}`);
      }
      if (activeSeats.size > 0) {
        const { data: legacyRows, error: legacyErr } = await db
          .from('ky_legislators')
          .select('id, chamber, district')
          .is('openstates_id', null)
          .eq('active', true);
        if (legacyErr) {
          logError(source, `Could not read LegiScan-only rows for cleanup: ${legacyErr.message}`);
        } else {
          const stale = (legacyRows || []).filter((r) => {
            const ch = r.chamber as string | null;
            const d = r.district as string | null;
            return Boolean(ch && d && activeSeats.has(`${ch}|${d}`));
          });
          const CHUNK = 100;
          for (let i = 0; i < stale.length; i += CHUNK) {
            const ids = stale.slice(i, i + CHUNK).map((r) => r.id as string);
            const { error: deactErr } = await db
              .from('ky_legislators')
              .update({ active: false, updated_at: nowIso })
              .in('id', ids);
            if (deactErr) logError(source, `Legacy deactivate chunk failed: ${deactErr.message}`);
          }
          if (stale.length) {
            log(
              source,
              `Marked ${stale.length} LegiScan-only row(s) inactive (seat covered by current Open States legislator)`,
            );
          }
        }
      }
    }

    log(source, `Synced ${synced}/${legislators.length} legislators`);

    if (process.env.LEGISCAN_API_KEY) {
      try {
        const legiscan = getKyLegiScanClient();
        const n = await reconcileKyLegislatorLegiscanIdsFromLatestSession(db, legiscan);
        if (n > 0) log(source, `Refreshed LegiScan people_id on ${n} legislators (session roster match)`);
      } catch (e: any) {
        logError(source, `LegiScan people_id refresh failed (non-fatal): ${e.message}`);
      }
    }

    await updateSourceStatus(source, 'success', synced);
    return { source, status: 'success', itemsSynced: synced, duration: Date.now() - start };
  } catch (err: any) {
    logError(source, err.message);
    await updateSourceStatus(source, 'error', 0, err.message);
    return { source, status: 'error', itemsSynced: 0, error: err.message, duration: Date.now() - start };
  }
}

// --- Legislator bio enrichment (LegiScan getPerson) ---
function legislatorRowNeedsBioEnrichment(leg: {
  ballotpedia: string | null;
  photo_url: string | null;
  legiscan_image_url: string | null;
}): boolean {
  const blank = (s: string | null | undefined) => s == null || String(s).trim() === '';
  if (blank(leg.ballotpedia)) return true;
  // Match migration intent: legiscan_image_url is a fallback when Open States has no photo.
  if (blank(leg.photo_url) && blank(leg.legiscan_image_url)) return true;
  return false;
}

/**
 * For each legislator with a legiscan_id, call getPerson to backfill:
 *   - ballotpedia slug (direct link)
 *   - legiscan_image_url (photo fallback when photo_url is null)
 * Skips legislators who already have ballotpedia and at least one photo source.
 * Quota cost: 1 query per legislator processed.
 */
export async function syncKyLegislatorBios(options: SyncOptions = {}): Promise<SyncResult> {
  const start = Date.now();
  const source = 'legislator-bios';
  log(source, 'Starting legislator bio enrichment from LegiScan');
  try {
    const db = getSupabase();
    const { data: legislators, error: fetchErr } = await db
      .from('ky_legislators')
      .select('id, legiscan_id, ballotpedia, photo_url, legiscan_image_url')
      .not('legiscan_id', 'is', null);
    if (fetchErr) throw new Error(fetchErr.message);
    if (!legislators?.length) {
      log(source, 'No legislators with legiscan_id found');
      return { source, status: 'success', itemsSynced: 0, duration: Date.now() - start };
    }

    const toEnrich = legislators.filter((l) => legislatorRowNeedsBioEnrichment(l));
    log(source, `${toEnrich.length}/${legislators.length} legislators need enrichment`);

    if (options.dryRun) {
      log(source, `[DRY RUN] Would enrich ${toEnrich.length} legislators`);
      return { source, status: 'success', itemsSynced: toEnrich.length, duration: Date.now() - start };
    }

    const legiscanClient = getKyLegiScanClient();
    let synced = 0;
    let failed = 0;
    let noop = 0;
    for (const leg of toEnrich) {
      try {
        const person: LegiScanPerson | null = await legiscanClient.getPerson(leg.legiscan_id!);
        if (!person) {
          noop++;
          continue;
        }
        const social = legiscanPersonBioSocial(person);
        const ballotpediaRaw = social?.ballotpedia ?? person.ballotpedia;

        const blank = (s: string | null | undefined) => s == null || String(s).trim() === '';
        let imageRaw = social?.image;
        if (!imageRaw && blank(leg.legiscan_image_url) && blank(leg.photo_url)) {
          imageRaw = kyLegislatureHeadshotUrlFromLegiscanDistrict(person.district) ?? undefined;
        }

        const update: Record<string, string | null> = {};
        if (blank(leg.ballotpedia) && ballotpediaRaw != null && String(ballotpediaRaw).trim()) {
          const canon = normalizeBallotpediaForStorage(String(ballotpediaRaw));
          if (canon) update.ballotpedia = canon;
        }
        if (blank(leg.legiscan_image_url) && blank(leg.photo_url) && imageRaw) {
          const img = normalizeLegislatorPhotoUrl(String(imageRaw));
          if (img) update.legiscan_image_url = img;
        }
        if (Object.keys(update).length === 0) {
          noop++;
          continue;
        }
        const { error } = await db.from('ky_legislators').update(update).eq('id', leg.id);
        if (error) {
          failed++;
          logError(source, `Failed updating ${leg.id}: ${error.message}`);
        } else synced++;
      } catch (err: any) {
        failed++;
        logError(source, `getPerson failed for legiscan_id=${leg.legiscan_id}: ${err.message}`);
      }
    }

    log(source, `Enriched ${synced} legislators (${failed} failed, ${noop} unchanged/no data)`);
    await updateSourceStatus(source, failed > 0 && synced === 0 ? 'error' : 'success', synced);
    return { source, status: failed > 0 && synced === 0 ? 'error' : 'success', itemsSynced: synced, duration: Date.now() - start };
  } catch (err: any) {
    logError(source, err.message);
    await updateSourceStatus(source, 'error', 0, err.message);
    return { source, status: 'error', itemsSynced: 0, error: err.message, duration: Date.now() - start };
  }
}

// --- Votes (LegiScan) ---
export async function syncKyVotes(options: SyncOptions = {}): Promise<SyncResult> {
  const start = Date.now();
  const source = 'votes';
  const billLimit = options.limit ?? 5;
  log(source, 'Starting votes sync from LegiScan');
  try {
    const legiscanClient = getKyLegiScanClient();
    const db = getSupabase();
    const { data: bills, error: billsError } = await db
      .from('ky_bills')
      .select('id, legiscan_id')
      .not('legiscan_id', 'is', null)
      .order('last_action_date', { ascending: false })
      .limit(billLimit);
    if (billsError || !bills?.length) {
      log(source, 'No bills with legiscan_ids found');
      return { source, status: 'success', itemsSynced: 0, duration: Date.now() - start };
    }
    log(source, `Fetching votes for ${bills.length} bills (limit ${billLimit})`);
    const rows: Record<string, unknown>[] = [];
    let skippedNoRollCallId = 0;
    for (const bill of bills) {
      try {
        const votes = await legiscanClient.fetchVotes(bill.legiscan_id!);
        if (!votes.length) continue;
        for (const vote of votes) {
          if (vote.roll_call_id == null) {
            skippedNoRollCallId += 1;
            continue;
          }
          rows.push({
            bill_id: bill.id,
            roll_call_id: vote.roll_call_id,
            date: vote.date || null,
            description: vote.desc || null,
            yea_count: vote.yea || 0,
            nay_count: vote.nay || 0,
            absent_count: vote.absent || 0,
            passed: vote.passed === 1,
            roll_call: vote.votes?.map((v: any) => ({ legislator_id: String(v.people_id), vote: v.vote_text })) || null,
          });
        }
      } catch (err: any) {
        logError(source, `Failed to fetch votes for bill ${bill.legiscan_id}: ${err.message}`);
      }
    }
    if (skippedNoRollCallId > 0) {
      log(source, `Skipped ${skippedNoRollCallId} vote(s) missing roll_call_id to avoid duplicate rows`);
    }
    let synced = 0;
    if (rows.length > 0 && !options.dryRun) {
      const BATCH = 50;
      for (let i = 0; i < rows.length; i += BATCH) {
        const batch = rows.slice(i, i + BATCH);
        const { error } = await db
          .from('ky_votes')
          .upsert(batch, { onConflict: 'bill_id,roll_call_id', ignoreDuplicates: false });
        if (!error) synced += batch.length;
      }
    } else if (options.dryRun) {
      synced = rows.length;
    }
    if (options.dryRun) log(source, `[DRY RUN] Would insert ${synced} votes`);
    else { log(source, `Synced ${synced} votes`); await updateSourceStatus(source, 'success', synced); }
    return { source, status: 'success', itemsSynced: synced, duration: Date.now() - start };
  } catch (err: any) {
    logError(source, err.message);
    await updateSourceStatus(source, 'error', 0, err.message);
    return { source, status: 'error', itemsSynced: 0, error: err.message, duration: Date.now() - start };
  }
}

// --- Louisville Ordinances (Legistar) ---
export async function syncLouisvilleOrdinances(options: SyncOptions = {}): Promise<SyncResult> {
  return syncOrdinances('louisville', options);
}

// --- Lexington Ordinances (Legistar) ---
export async function syncLexingtonOrdinances(options: SyncOptions = {}): Promise<SyncResult> {
  return syncOrdinances('lexington', options);
}

async function syncOrdinances(jurisdiction: 'louisville' | 'lexington', options: SyncOptions = {}): Promise<SyncResult> {
  const start = Date.now();
  const source = `ordinances-${jurisdiction}`;
  log(source, `Starting ${jurisdiction} ordinances sync from Legistar`);
  try {
    const client = getKyLegistarClient();
    const ordinances = await client.fetchOrdinances(jurisdiction);
    log(source, `Fetched ${ordinances.length} ordinances`);
    if (options.dryRun) {
      log(source, `[DRY RUN] Would upsert ${ordinances.length} ordinances`);
      return { source, status: 'success', itemsSynced: ordinances.length, duration: Date.now() - start };
    }
    const db = getSupabase();
    const rows = ordinances.filter((ord) => !isLegistarMatterLikelyTestNoise(ord)).map((ord) => {
        const { title, description } = splitLegistarMatterTitleAndDescription(ord);
        const rawStatus = ord.MatterStatusName || null;
        const sponsors = buildOrdinanceSponsorsJson(ord);
        const topics = matterTopicsFromLegistar(ord);
        return {
          legistar_id: jurisdiction === 'lexington' ? ord.MatterId + 1_000_000 : ord.MatterId,
          jurisdiction,
          ordinance_number: normalizeLegistarOrdinanceNumber(ord.MatterFile),
          title,
          description,
          status: rawStatus ? normalizeLegistarOrdinanceText(rawStatus) : null,
          introduced_date: parseLegistarApiDate(ord.MatterIntroDate),
          adopted_date: parseLegistarApiDate(ord.MatterPassedDate),
          sponsors,
          topics,
        };
      });
    if (rows.length === 0) {
      log(source, 'No ordinances to sync after quality filters');
      await updateSourceStatus(source, 'success', 0);
      return { source, status: 'success', itemsSynced: 0, duration: Date.now() - start };
    }
    const { error } = await db.from('ky_ordinances').upsert(rows, { onConflict: 'legistar_id' });
    const synced = error ? 0 : rows.length;
    if (error) logError(source, error.message);
    log(source, `Synced ${synced}/${ordinances.length} ordinances`);
    await updateSourceStatus(source, 'success', synced);
    return { source, status: 'success', itemsSynced: synced, duration: Date.now() - start };
  } catch (err: any) {
    logError(source, err.message);
    await updateSourceStatus(source, 'error', 0, err.message);
    return { source, status: 'error', itemsSynced: 0, error: err.message, duration: Date.now() - start };
  }
}

// --- Executive Orders (scraper) — not wired into SYNC_SOURCES while MVP omits EO (unreliable listing URL).
// Re-add `'executive-orders': syncExecutiveOrders` when a stable index or official feed exists.
export async function syncExecutiveOrders(options: SyncOptions = {}): Promise<SyncResult> {
  const start = Date.now();
  const source = 'executive-orders';
  log(source, 'Starting executive orders sync');
  try {
    const client = getKyExecutiveOrdersClient();
    const orders = await client.fetchExecutiveOrders();
    log(source, `Fetched ${orders.length} executive orders`);
    if (options.dryRun) {
      log(source, `[DRY RUN] Would upsert ${orders.length} executive orders`);
      return { source, status: 'success', itemsSynced: orders.length, duration: Date.now() - start };
    }
    const db = getSupabase();
    const rows = orders.filter((eo) => eo.number).map((eo) => ({
      eo_number: eo.number,
      title: eo.title,
      description: eo.summary || null,
      signed_date: eo.date || null,
      governor: eo.governor || null,
      full_text_url: eo.url || null,
    }));
    const { error } = await db.from('ky_executive_orders').upsert(rows, { onConflict: 'eo_number' });
    const synced = error ? 0 : rows.length;
    if (error) logError(source, error.message);
    log(source, `Synced ${synced}/${orders.length} executive orders`);
    await updateSourceStatus(source, 'success', synced);
    return { source, status: 'success', itemsSynced: synced, duration: Date.now() - start };
  } catch (err: any) {
    logError(source, err.message);
    await updateSourceStatus(source, 'error', 0, err.message);
    return { source, status: 'error', itemsSynced: 0, error: err.message, duration: Date.now() - start };
  }
}

// --- School Board Items (scraper) ---
export async function syncSchoolBoardItems(options: SyncOptions = {}): Promise<SyncResult> {
  const start = Date.now();
  const source = 'school-boards';
  log(source, 'Starting school board items sync');
  try {
    const client = getKySchoolBoardsClient();
    const items = await client.fetchLatest();
    log(source, `Fetched ${items.length} school board items`);
    if (options.dryRun) {
      log(source, `[DRY RUN] Would upsert ${items.length} school board items`);
      return { source, status: 'success', itemsSynced: items.length, duration: Date.now() - start };
    }
    const db = getSupabase();
    const { data: existing } = await db.from('ky_school_board_items').select('id, district, title, meeting_date');
    const normDate = (d: string | null) => {
      if (!d) return '';
      const s = String(d);
      if (/^\d{4}-\d{2}-\d{2}/.test(s)) return s.slice(0, 10);
      const parsed = new Date(s);
      return isNaN(parsed.getTime()) ? '' : parsed.toISOString().slice(0, 10);
    };
    const key = (d: string, t: string, m: string | null) => `${d}|${t}|${normDate(m)}`;
    const existingMap = new Map<string, { id: string }>();
    for (const e of existing || []) {
      existingMap.set(key(e.district, e.title, e.meeting_date), { id: e.id });
    }
    const toInsert: Record<string, unknown>[] = [];
    const toUpdate: { id: string; row: Record<string, unknown> }[] = [];
    for (const item of items) {
      const row = {
        district: item.district,
        title: item.title,
        description: item.summary || null,
        meeting_date: item.date || null,
        category: item.category || null,
        vote_result: item.voteResult || null,
        document_url: item.url || null,
      };
      const match = existingMap.get(key(item.district, item.title, item.date));
      if (match) toUpdate.push({ id: match.id, row });
      else toInsert.push(row);
    }
    let synced = 0;
    if (toInsert.length > 0) {
      const { error } = await db.from('ky_school_board_items').insert(toInsert);
      if (!error) synced += toInsert.length;
    }
    await Promise.all(toUpdate.map(({ id, row }) => db.from('ky_school_board_items').update(row).eq('id', id)));
    synced += toUpdate.length;
    log(source, `Synced ${synced}/${items.length} school board items`);
    await updateSourceStatus(source, 'success', synced);
    return { source, status: 'success', itemsSynced: synced, duration: Date.now() - start };
  } catch (err: any) {
    logError(source, err.message);
    await updateSourceStatus(source, 'error', 0, err.message);
    return { source, status: 'error', itemsSynced: 0, error: err.message, duration: Date.now() - start };
  }
}

// --- County Actions (scraper) ---
export async function syncCountyActions(options: SyncOptions = {}): Promise<SyncResult> {
  const start = Date.now();
  const source = 'county-actions';
  log(source, 'Starting county actions sync');
  try {
    const client = getKyCountyCourtsClient();
    const actions = await client.fetchLatest();
    log(source, `Fetched ${actions.length} county actions`);
    if (options.dryRun) {
      log(source, `[DRY RUN] Would upsert ${actions.length} county actions`);
      return { source, status: 'success', itemsSynced: actions.length, duration: Date.now() - start };
    }
    const db = getSupabase();
    const { data: existing } = await db.from('ky_county_actions').select('id, county, title, meeting_date');
    const normDate = (d: string | null) => {
      if (!d) return '';
      const s = String(d);
      if (/^\d{4}-\d{2}-\d{2}/.test(s)) return s.slice(0, 10);
      const parsed = new Date(s);
      return isNaN(parsed.getTime()) ? '' : parsed.toISOString().slice(0, 10);
    };
    const key = (c: string, t: string, m: string | null) => `${c}|${t}|${normDate(m)}`;
    const existingMap = new Map<string, { id: string }>();
    for (const e of existing || []) {
      existingMap.set(key(e.county, e.title, e.meeting_date), { id: e.id });
    }
    const toInsert: Record<string, unknown>[] = [];
    const toUpdate: { id: string; row: Record<string, unknown> }[] = [];
    for (const action of actions) {
      const row = {
        county: action.county,
        title: action.title,
        description: action.summary || null,
        meeting_date: action.date || null,
        action_type: action.type || null,
        document_url: action.url || null,
      };
      const match = existingMap.get(key(action.county, action.title, action.date));
      if (match) toUpdate.push({ id: match.id, row });
      else toInsert.push(row);
    }
    let synced = 0;
    if (toInsert.length > 0) {
      const { error } = await db.from('ky_county_actions').insert(toInsert);
      if (!error) synced += toInsert.length;
    }
    await Promise.all(toUpdate.map(({ id, row }) => db.from('ky_county_actions').update(row).eq('id', id)));
    synced += toUpdate.length;
    log(source, `Synced ${synced}/${actions.length} county actions`);
    await updateSourceStatus(source, 'success', synced);
    return { source, status: 'success', itemsSynced: synced, duration: Date.now() - start };
  } catch (err: any) {
    logError(source, err.message);
    await updateSourceStatus(source, 'error', 0, err.message);
    return { source, status: 'error', itemsSynced: 0, error: err.message, duration: Date.now() - start };
  }
}


// --- Source map for per-source sync ---

/**
 * Sources run when `syncAll()` is called without `?source=` (CLI `npm run sync:ky`, POST /api/sync).
 * Local-government sources are implemented but paused from product scope — use explicit `?source=`.
 * @see docs/specs/committee-calendar.md
 */
export const SYNC_SOURCES_DEFAULT = ['bills', 'legislators', 'votes'] as const;

/** Removed from Vercel Cron 2026-05-18; manual sync still supported. */
export const SYNC_SOURCES_PAUSED_FROM_CRON = ['ordinances', 'school-boards', 'county-actions'] as const;

export const SYNC_SOURCES: Record<string, (options: SyncOptions) => Promise<SyncResult>> = {
  bills: syncKyBills,
  legislators: syncKyLegislators,
  'legislator-bios': syncKyLegislatorBios,
  votes: syncKyVotes,
  ordinances: async (opts) => {
    const lou = await syncLouisvilleOrdinances(opts);
    const lex = await syncLexingtonOrdinances(opts);
    return {
      source: 'ordinances',
      status: lou.status === 'error' && lex.status === 'error' ? 'error' : 'success',
      itemsSynced: lou.itemsSynced + lex.itemsSynced,
      duration: lou.duration + lex.duration,
      error: [lou.error, lex.error].filter(Boolean).join('; ') || undefined,
    };
  },
  'school-boards': syncSchoolBoardItems,
  'county-actions': syncCountyActions,
  'lrc-calendar': async (opts) => {
    const start = Date.now();
    const source = 'lrc-calendar';
    try {
      const db = getSupabase();
      const result = await syncKyLrcCalendar(db, opts);
      if (!opts.dryRun) {
        await updateSourceStatus(
          source,
          result.status === 'error' ? 'error' : 'success',
          result.itemsSynced,
          result.error,
        );
      }
      return result;
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : String(err);
      logError(source, message);
      if (!opts.dryRun) await updateSourceStatus(source, 'error', 0, message);
      return {
        source,
        status: 'error',
        itemsSynced: 0,
        error: message,
        duration: Date.now() - start,
      };
    }
  },
  /**
   * Committee meeting materials — scrapes
   * apps.legislature.ky.gov/CommitteeDocuments/{lrc_rsn} for every committee
   * with an lrc_rsn. Idempotent upserts; safe to run daily.
   * See docs/specs/committee-calendar.md § Phase 5 + decisions.md § 2026-06-02.
   */
  'lrc-committee-materials': async (opts) => {
    const start = Date.now();
    const source = 'lrc-committee-materials';
    try {
      const db = getSupabase();
      const stats = await syncKyLrcCommitteeMaterials(db, {
        dryRun: opts.dryRun,
        delayMs: 250,
      });
      const itemsSynced = stats.materialsInserted + stats.materialsUpdated;
      const status = stats.errors > 0 ? 'error' : 'success';
      const errorMsg =
        stats.errors > 0 ? `${stats.errors} committee fetch/parse error(s)` : undefined;
      if (!opts.dryRun) {
        await updateSourceStatus(source, status, itemsSynced, errorMsg);
      }
      return {
        source,
        status,
        itemsSynced,
        error: errorMsg,
        duration: Date.now() - start,
      };
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : String(err);
      logError(source, message);
      if (!opts.dryRun) await updateSourceStatus(source, 'error', 0, message);
      return {
        source,
        status: 'error',
        itemsSynced: 0,
        error: message,
        duration: Date.now() - start,
      };
    }
  },
};

// --- Sync All ---
export async function syncAll(options: SyncOptions = {}): Promise<SyncResult[]> {
  log('all', `Starting full sync (dryRun: ${!!options.dryRun})`);
  const results: SyncResult[] = [];

  const sources = options.source
    ? [options.source]
    : [...SYNC_SOURCES_DEFAULT];

  for (const sourceName of sources) {
    const syncFn = SYNC_SOURCES[sourceName];
    if (!syncFn) {
      log('all', `Unknown source: ${sourceName}, skipping`);
      results.push({ source: sourceName, status: 'skipped', itemsSynced: 0, duration: 0, error: 'Unknown source' });
      continue;
    }
    try {
      await updateSourceStatus(sourceName, 'running', 0);
      const result = await syncFn(options);
      results.push(result);
    } catch (err: any) {
      logError('all', `Source ${sourceName} failed: ${err.message}`);
      results.push({ source: sourceName, status: 'error', itemsSynced: 0, duration: 0, error: err.message });
    }
  }

  log('all', `Sync complete. ${results.filter(r => r.status === 'success').length}/${results.length} sources succeeded`);
  return results;
}

// --- Get sync status ---
export async function getSyncStatus(): Promise<KYSource[]> {
  try {
    const db = getSupabase();
    const { data, error } = await db
      .from('ky_sources')
      .select('*')
      .order('source_name');
    if (error) throw error;
    return data || [];
  } catch (err: any) {
    logError('status', `Failed to get sync status: ${err.message}`);
    return [];
  }
}