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
import { supabaseAdmin } from '../app/lib/supabaseClient';
import { classifyTopics } from './ky-topic-classifier';
import { normalizeLegistarOrdinanceText } from './legistar-text';
import type { KYSource } from '../types/kentucky';

/**
 * LegiScan numeric status codes for state bills.
 * Cross-validated against last_action text for accuracy.
 */
const LEGISCAN_STATUS_MAP: Record<number, string> = {
  1: 'Introduced',
  2: 'Engrossed',
  3: 'Enrolled',
  4: 'Passed',
  5: 'Vetoed',
  6: 'Failed',
  7: 'Veto Override',
  8: 'Chaptered',
  9: 'Referred',
  10: 'Reported',
  11: 'Failed in Committee',
  12: 'Draft',
};

/**
 * Map LegiScan status code to display string, cross-checked against
 * last_action text so Kentucky-specific language (e.g. "delivered to
 * Secretary of State" = signed) is always accurate.
 */
function mapLegiScanStatus(statusCode: number, lastAction: string): string {
  const action = (lastAction || '').toLowerCase();
  if (action.includes('signed by governor')) return 'Signed';
  if (action.includes('delivered to secretary of state')) return 'Signed';
  if (action.includes('vetoed by governor') || action.includes('veto')) return 'Vetoed';
  if (action.includes('veto override')) return 'Veto Override';
  if (action.includes('died') || action.includes('failed')) return 'Failed';
  if (action.includes('third reading, passed') || action.includes('passed') && action.includes('third reading')) return 'Passed Chamber';
  if (action.includes('committee') || action.includes('referred to')) return 'In Committee';
  if (action.includes('introduced') || action.includes('filed')) return 'Introduced';
  return LEGISCAN_STATUS_MAP[statusCode] || 'Introduced';
}

/** Derive chamber from bill number prefix (HB/HR = house, SB/SR = senate). */
function chamberFromBillNumber(billNumber: string): 'house' | 'senate' | null {
  const upper = billNumber.toUpperCase();
  if (upper.startsWith('H')) return 'house';
  if (upper.startsWith('S')) return 'senate';
  return null;
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

// --- Bills (LegiScan) ---
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
    // Pick most recent session by year_end (last in array may be future/empty)
    const sorted = [...sessions].sort((a, b) => (b.year_end || 0) - (a.year_end || 0));
    let latestSession = sorted[0];
    let bills = await client.fetchBills(latestSession.session_id);
    // If empty, try next most recent session
    for (let i = 1; i < sorted.length && bills.length === 0; i++) {
      latestSession = sorted[i];
      log(source, `Session ${sorted[i - 1].session_name} had 0 bills, trying ${latestSession.session_name}`);
      bills = await client.fetchBills(latestSession.session_id);
    }
    const limit = options.limit ?? 250;
    const toSync = selectBillsForSync(bills, limit);
    if (bills.length > limit) log(source, `Limiting to ${limit} of ${bills.length} bills (chamber-balanced recent; use limit param for more)`);
    const nHouse = toSync.filter((b) => chamberFromBillNumber(b.number) === 'house').length;
    const nSenate = toSync.filter((b) => chamberFromBillNumber(b.number) === 'senate').length;
    log(
      source,
      `Fetched ${bills.length} bills from ${latestSession.session_name}, syncing ${toSync.length} (house ${nHouse}, senate ${nSenate}, other ${toSync.length - nHouse - nSenate})`,
    );
    if (options.dryRun) {
      log(source, `[DRY RUN] Would upsert ${toSync.length} bills`);
      return { source, status: 'success', itemsSynced: toSync.length, duration: Date.now() - start };
    }
    const db = getSupabase();
    const skipSponsors = options.skipBillSponsorDetails === true;
    if (skipSponsors) {
      log(source, 'skipBillSponsorDetails: true — sponsors column will not be refreshed this run');
    }
    const rows: Record<string, unknown>[] = [];
    for (let i = 0; i < toSync.length; i++) {
      const bill = toSync[i];
      const topics = classifyTopics(bill.title, bill.description || '');
      let sponsors: unknown = null;
      if (!skipSponsors) {
        try {
          const detail = await client.fetchBillDetail(bill.bill_id);
          if (detail?.sponsors?.length) {
            sponsors = detail.sponsors;
          }
        } catch (err: any) {
          log(source, `Sponsor fetch failed for ${bill.number}: ${err?.message || err}`);
        }
      }
      rows.push({
        legiscan_id: bill.bill_id,
        bill_number: bill.number,
        title: bill.title,
        description: bill.description || null,
        session: latestSession.session_name,
        status: mapLegiScanStatus(bill.status, bill.last_action || ''),
        chamber: chamberFromBillNumber(bill.number),
        last_action: bill.last_action || null,
        last_action_date: bill.last_action_date || null,
        bill_text_url: bill.url || null,
        topics: topics.length > 0 ? topics : null,
        sponsors,
        source: 'legiscan',
      });
      if (!skipSponsors && (i + 1) % 25 === 0) {
        log(source, `Enriched sponsors ${i + 1}/${toSync.length}`);
      }
    }
    // Batch upsert (100 per batch to avoid payload limits)
    const BATCH = 100;
    let synced = 0;
    for (let i = 0; i < rows.length; i += BATCH) {
      const batch = rows.slice(i, i + BATCH);
      const { error } = await db.from('ky_bills').upsert(batch, { onConflict: 'legiscan_id' });
      if (error) logError(source, `Batch ${i / BATCH + 1}: ${error.message}`);
      else synced += batch.length;
    }
    log(source, `Synced ${synced}/${toSync.length} bills`);
    await updateSourceStatus(source, 'success', synced);
    return { source, status: 'success', itemsSynced: synced, duration: Date.now() - start };
  } catch (err: any) {
    logError(source, err.message);
    await updateSourceStatus(source, 'error', 0, err.message);
    return { source, status: 'error', itemsSynced: 0, error: err.message, duration: Date.now() - start };
  }
}

// --- Legislators (Open States) ---
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
    const rows = legislators.map((leg) => {
      const org = leg.currentRole?.org_classification;
      const chamber = org === 'upper' ? ('senate' as const) : org === 'lower' ? ('house' as const) : null;
      const district = leg.currentRole?.district != null ? String(leg.currentRole.district) : null;
      return {
        openstates_id: leg.id,
        name: leg.name,
        party: leg.party || null,
        chamber,
        district,
        photo_url: leg.image || null,
        email: leg.email || null,
        active: true,
      };
    });
    const { error } = await db.from('ky_legislators').upsert(rows, { onConflict: 'openstates_id' });
    const synced = error ? 0 : rows.length;
    if (error) logError(source, error.message);
    log(source, `Synced ${synced}/${legislators.length} legislators`);
    await updateSourceStatus(source, 'success', synced);
    return { source, status: 'success', itemsSynced: synced, duration: Date.now() - start };
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
    for (const bill of bills) {
      try {
        const votes = await legiscanClient.fetchVotes(bill.legiscan_id!);
        if (!votes.length) continue;
        for (const vote of votes) {
          rows.push({
            bill_id: bill.id,
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
    let synced = 0;
    if (rows.length > 0 && !options.dryRun) {
      const BATCH = 50;
      for (let i = 0; i < rows.length; i += BATCH) {
        const batch = rows.slice(i, i + BATCH);
        const { error } = await db.from('ky_votes').insert(batch);
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
    const rows = ordinances.map((ord) => {
      const rawTitle = ord.MatterName || ord.MatterTitle;
      const rawDesc = ord.MatterTitle || null;
      const rawStatus = ord.MatterStatusName || null;
      return {
        legistar_id: jurisdiction === 'lexington' ? ord.MatterId + 1_000_000 : ord.MatterId,
        jurisdiction,
        ordinance_number: ord.MatterFile || null,
        title: normalizeLegistarOrdinanceText(rawTitle),
        description: rawDesc ? normalizeLegistarOrdinanceText(rawDesc) : null,
        status: rawStatus ? normalizeLegistarOrdinanceText(rawStatus) : null,
        introduced_date: ord.MatterIntroDate || null,
        adopted_date: ord.MatterPassedDate || null,
      };
    });
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
export const SYNC_SOURCES: Record<string, (options: SyncOptions) => Promise<SyncResult>> = {
  bills: syncKyBills,
  legislators: syncKyLegislators,
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
};

// --- Sync All ---
export async function syncAll(options: SyncOptions = {}): Promise<SyncResult[]> {
  log('all', `Starting full sync (dryRun: ${!!options.dryRun})`);
  const results: SyncResult[] = [];

  const sources = options.source
    ? [options.source]
    : Object.keys(SYNC_SOURCES);

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