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
import type { KYSource } from '../types/kentucky';

export interface SyncOptions {
  dryRun?: boolean;
  source?: string;
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
    const latestSession = sessions[sessions.length - 1];
    log(source, `Fetching bills from session: ${latestSession.session_name}`);
    const bills = await client.fetchBills(latestSession.session_id);
    log(source, `Fetched ${bills.length} bills`);
    if (options.dryRun) {
      log(source, `[DRY RUN] Would upsert ${bills.length} bills`);
      return { source, status: 'success', itemsSynced: bills.length, duration: Date.now() - start };
    }
    const db = getSupabase();
    let synced = 0;
    for (const bill of bills) {
      const row = {
        legiscan_id: bill.bill_id,
        bill_number: bill.number,
        title: bill.title,
        description: bill.description || null,
        session: latestSession.session_name,
        status: bill.status_desc || null,
        last_action: bill.last_action || null,
        last_action_date: bill.last_action_date || null,
        bill_text_url: bill.url || null,
        source: 'legiscan',
      };
      const { error } = await db.from('ky_bills').upsert(row, { onConflict: 'legiscan_id' });
      if (error) logError(source, `Failed to upsert bill ${bill.number}: ${error.message}`);
      else synced++;
    }
    log(source, `Synced ${synced}/${bills.length} bills`);
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
    let synced = 0;
    for (const leg of legislators) {
      const row = {
        openstates_id: leg.id,
        name: leg.name,
        party: leg.party || null,
        chamber: leg.currentRole?.chamber === 'upper' ? 'senate' as const : leg.currentRole?.chamber === 'lower' ? 'house' as const : null,
        district: leg.currentRole?.district || null,
        photo_url: leg.image || null,
        email: leg.email || null,
        active: true,
      };
      const { error } = await db.from('ky_legislators').upsert(row, { onConflict: 'openstates_id' });
      if (error) logError(source, `Failed to upsert legislator ${leg.name}: ${error.message}`);
      else synced++;
    }
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
  log(source, 'Starting votes sync from LegiScan');
  try {
    const legiscanClient = getKyLegiScanClient();
    const db = getSupabase();
    const { data: bills, error: billsError } = await db
      .from('ky_bills')
      .select('id, legiscan_id')
      .not('legiscan_id', 'is', null)
      .order('last_action_date', { ascending: false })
      .limit(50);
    if (billsError || !bills?.length) {
      log(source, 'No bills with legiscan_ids found');
      return { source, status: 'success', itemsSynced: 0, duration: Date.now() - start };
    }
    log(source, `Fetching votes for ${bills.length} bills`);
    let synced = 0;
    for (const bill of bills) {
      try {
        const votes = await legiscanClient.fetchVotes(bill.legiscan_id!);
        if (!votes.length) continue;
        if (options.dryRun) { synced += votes.length; continue; }
        for (const vote of votes) {
          const row = {
            bill_id: bill.id,
            date: vote.date || null,
            description: vote.desc || null,
            yea_count: vote.yea || 0,
            nay_count: vote.nay || 0,
            absent_count: vote.absent || 0,
            passed: vote.passed === 1,
            roll_call: vote.votes?.map((v: any) => ({ legislator_id: String(v.people_id), vote: v.vote_text })) || null,
          };
          const { error } = await db.from('ky_votes').insert(row);
          if (!error) synced++;
        }
      } catch (err: any) {
        logError(source, `Failed to fetch votes for bill ${bill.legiscan_id}: ${err.message}`);
      }
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
    let synced = 0;
    for (const ord of ordinances) {
      const row = {
        legistar_id: ord.MatterId,
        jurisdiction,
        ordinance_number: ord.MatterFile || null,
        title: ord.MatterName || ord.MatterTitle,
        description: ord.MatterTitle || null,
        status: ord.MatterStatusName || null,
        introduced_date: ord.MatterIntroDate || null,
        adopted_date: ord.MatterPassedDate || null,
      };
      const { error } = await db.from('ky_ordinances').upsert(row, { onConflict: 'legistar_id' });
      if (error) logError(source, `Failed to upsert ordinance ${ord.MatterFile}: ${error.message}`);
      else synced++;
    }
    log(source, `Synced ${synced}/${ordinances.length} ordinances`);
    await updateSourceStatus(source, 'success', synced);
    return { source, status: 'success', itemsSynced: synced, duration: Date.now() - start };
  } catch (err: any) {
    logError(source, err.message);
    await updateSourceStatus(source, 'error', 0, err.message);
    return { source, status: 'error', itemsSynced: 0, error: err.message, duration: Date.now() - start };
  }
}

// --- Executive Orders (scraper) ---
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
    let synced = 0;
    for (const eo of orders) {
      if (!eo.number) continue;
      const row = {
        eo_number: eo.number,
        title: eo.title,
        description: eo.summary || null,
        signed_date: eo.date || null,
        governor: eo.governor || null,
        full_text_url: eo.url || null,
      };
      const { error } = await db.from('ky_executive_orders').upsert(row, { onConflict: 'eo_number' });
      if (error) logError(source, `Failed to upsert EO ${eo.number}: ${error.message}`);
      else synced++;
    }
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
    let synced = 0;
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
      // Use title + district + meeting_date as a natural key for dedup
      const { data: existing } = await db
        .from('ky_school_board_items')
        .select('id')
        .eq('district', item.district)
        .eq('title', item.title)
        .limit(1);
      if (existing?.length) {
        const { error } = await db.from('ky_school_board_items').update(row).eq('id', existing[0].id);
        if (!error) synced++;
      } else {
        const { error } = await db.from('ky_school_board_items').insert(row);
        if (!error) synced++;
      }
    }
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
    let synced = 0;
    for (const action of actions) {
      const row = {
        county: action.county,
        title: action.title,
        description: action.summary || null,
        meeting_date: action.date || null,
        action_type: action.type || null,
        document_url: action.url || null,
      };
      // Use title + county + date as natural key for dedup
      const { data: existing } = await db
        .from('ky_county_actions')
        .select('id')
        .eq('county', action.county)
        .eq('title', action.title)
        .limit(1);
      if (existing?.length) {
        const { error } = await db.from('ky_county_actions').update(row).eq('id', existing[0].id);
        if (!error) synced++;
      } else {
        const { error } = await db.from('ky_county_actions').insert(row);
        if (!error) synced++;
      }
    }
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
  'executive-orders': syncExecutiveOrders,
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