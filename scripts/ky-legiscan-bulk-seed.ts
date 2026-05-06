#!/usr/bin/env npx tsx
/**
 * Kentucky LegiScan Bulk Seed — operator-gated dataset importer (LegiScan plan §4.2, §5).
 *
 * Usage:
 *   npm run bulk-seed:ky -- --state=KY
 *   npm run bulk-seed:ky -- --state=KY --dryRun
 *   npm run bulk-seed:ky -- --state=KY --limit=5   # process 5 sessions, re-run to continue
 *
 * Compares dataset_hash against ky_legiscan_datasets and only downloads sessions
 * whose hash changed. Zip decoding lives here (not in ky-legiscan-client): the
 * client returns the raw base64 `zip` field, this script decodes + parses.
 * Idempotent: re-running against unchanged data is a no-op (0 queries).
 * Not wired to cron; manual backfill only.
 */
import './load-env';
import { inflateRawSync } from 'node:zlib';
import AdmZip from 'adm-zip';
import { supabaseAdmin } from '../src/app/lib/supabaseAdminCore';
import { getKyLegiScanClient } from '../src/lib/ky-data-sources';
import { classifyTopics } from '../src/lib/ky-topic-classifier';
import { legiscanSubjectColumnsFromRawPayload } from '../src/lib/ky-legiscan-subjects';
import type { LegiScanDatasetListEntry } from '../src/lib/ky-legiscan-client';

const args = process.argv.slice(2);
const stateFlag = args.find((a) => a.startsWith('--state='))?.split('=')[1];
const state = (stateFlag || 'KY').toUpperCase();
const dryRun = args.includes('--dryRun') || args.includes('--dry-run');
const limitFlag = args.find((a) => a.startsWith('--limit='))?.split('=')[1];
const sessionLimit = limitFlag ? parseInt(limitFlag, 10) : undefined;

const ALLOWED_STATES = new Set(['KY']);
if (!ALLOWED_STATES.has(state)) {
  console.error(
    `[bulk-seed] Unknown state "${state}". Allowed: ${[...ALLOWED_STATES].join(', ')}. ` +
    `Pass --state=KY to import Kentucky data.`
  );
  process.exit(1);
}

const LEGISCAN_STATUS_MAP: Record<number, string> = {
  1: 'Introduced', 2: 'Engrossed', 3: 'Enrolled', 4: 'Passed', 5: 'Vetoed',
  6: 'Failed', 7: 'Veto Override', 8: 'Chaptered', 9: 'Referred', 10: 'Reported',
  11: 'Failed in Committee', 12: 'Draft',
};

function mapStatus(code: number, lastAction: string): string {
  const a = (lastAction || '').toLowerCase();
  if (a.includes('signed by governor')) return 'Signed';
  if (a.includes('delivered to secretary of state')) return 'Signed';
  if (a.includes('vetoed by governor') || a.includes('veto')) return 'Vetoed';
  if (a.includes('veto override')) return 'Veto Override';
  if (a.includes('died') || a.includes('failed')) return 'Failed';
  if (a.includes('third reading, passed') || (a.includes('passed') && a.includes('third reading'))) return 'Passed Chamber';
  if (a.includes('committee') || a.includes('referred to')) return 'In Committee';
  if (a.includes('introduced') || a.includes('filed')) return 'Introduced';
  return LEGISCAN_STATUS_MAP[code] || 'Introduced';
}

function chamberFromBillNumber(n: string): 'house' | 'senate' | null {
  const u = (n || '').toUpperCase();
  if (u.startsWith('H')) return 'house';
  if (u.startsWith('S')) return 'senate';
  return null;
}

function toIsoDate(s: string | undefined | null): string | null {
  if (!s) return null;
  const m = /^(\d{4}-\d{2}-\d{2})/.exec(s);
  if (m) return m[1];
  const d = new Date(s);
  return Number.isNaN(d.getTime()) ? null : d.toISOString().slice(0, 10);
}

function deriveIntroducedDate(bill: any): string | null {
  const direct = toIsoDate(bill?.introduced);
  if (direct) return direct;
  const hist = Array.isArray(bill?.history) ? bill.history : [];
  let earliest: string | null = null;
  for (const h of hist) {
    const d = toIsoDate(h?.date);
    if (!d) continue;
    if (!earliest || d < earliest) earliest = d;
  }
  return earliest;
}

function chamberFromRole(role: string | undefined): 'house' | 'senate' | null {
  const r = (role || '').toLowerCase();
  if (r.startsWith('rep')) return 'house';
  if (r.startsWith('sen')) return 'senate';
  return null;
}

// --- Minimal ZIP parser (Node zlib only; no third-party deps) ---
// Handles store (0) and deflate (8) entries produced by LegiScan's dataset archives.
interface ZipEntry { name: string; data: Buffer; }

function iterateZipEntries(buf: Buffer): ZipEntry[] {
  const EOCD_SIG = 0x06054b50;
  const CDH_SIG = 0x02014b50;
  const LFH_SIG = 0x04034b50;
  let eocd = -1;
  const minStart = Math.max(0, buf.length - 65557);
  for (let i = buf.length - 22; i >= minStart; i--) {
    if (buf.readUInt32LE(i) === EOCD_SIG) { eocd = i; break; }
  }
  if (eocd < 0) throw new Error('ZIP: EOCD record not found');
  const total = buf.readUInt16LE(eocd + 10);
  const cdOff = buf.readUInt32LE(eocd + 16);
  const entries: ZipEntry[] = [];
  let p = cdOff;
  for (let i = 0; i < total; i++) {
    if (buf.readUInt32LE(p) !== CDH_SIG) throw new Error(`ZIP: bad central-directory signature at ${p}`);
    const method = buf.readUInt16LE(p + 10);
    const compSize = buf.readUInt32LE(p + 20);
    const nameLen = buf.readUInt16LE(p + 28);
    const extraLen = buf.readUInt16LE(p + 30);
    const commentLen = buf.readUInt16LE(p + 32);
    const lfhOff = buf.readUInt32LE(p + 42);
    const name = buf.slice(p + 46, p + 46 + nameLen).toString('utf8');
    p += 46 + nameLen + extraLen + commentLen;
    if (buf.readUInt32LE(lfhOff) !== LFH_SIG) throw new Error(`ZIP: bad local-file-header signature for ${name}`);
    const lfhNameLen = buf.readUInt16LE(lfhOff + 26);
    const lfhExtraLen = buf.readUInt16LE(lfhOff + 28);
    const dataOff = lfhOff + 30 + lfhNameLen + lfhExtraLen;
    const raw = buf.slice(dataOff, dataOff + compSize);
    let data: Buffer;
    if (method === 0) data = raw;
    else if (method === 8) data = inflateRawSync(raw);
    else {
      console.warn(`[bulk-seed] ZIP: unsupported method ${method} for ${name}, falling back to adm-zip`);
      throw new Error(`__ADM_ZIP_FALLBACK__:${method}`);
    }
    if (name.endsWith('/')) continue;
    entries.push({ name, data });
  }
  return entries;
}

interface DatasetPayloads {
  bills: any[];
  people: any[];
  rollCalls: any[];
}

function parseDatasetZip(b64: string): DatasetPayloads {
  const buf = Buffer.from(b64, 'base64');
  let entries: ZipEntry[];
  try {
    entries = iterateZipEntries(buf);
  } catch (err: any) {
    if (typeof err?.message === 'string' && err.message.startsWith('__ADM_ZIP_FALLBACK__')) {
      console.log('[bulk-seed] Using adm-zip fallback for ZIP decoding');
      const zip = new AdmZip(buf);
      entries = zip.getEntries()
        .filter(e => !e.isDirectory && e.entryName.endsWith('.json'))
        .map(e => ({ name: e.entryName, data: e.getData() }));
    } else {
      throw err;
    }
  }
  const out: DatasetPayloads = { bills: [], people: [], rollCalls: [] };
  for (const e of entries) {
    if (!e.name.endsWith('.json')) continue;
    let parsed: any;
    try { parsed = JSON.parse(e.data.toString('utf8')); } catch { continue; }
    if (parsed?.bill) out.bills.push(parsed.bill);
    else if (parsed?.person) out.people.push(parsed.person);
    else if (parsed?.roll_call) out.rollCalls.push(parsed.roll_call);
  }
  return out;
}


// --- Row builders ---

function buildBillRow(bill: any, sessionName: string, sessionId: number): Record<string, unknown> {
  const history = Array.isArray(bill?.history) ? bill.history : [];
  const last = history[history.length - 1];
  const lastAction: string | null = last?.action || bill?.last_action || null;
  const lastActionDate = toIsoDate(last?.date || bill?.last_action_date || bill?.status_date);
  const texts = Array.isArray(bill?.texts) ? bill.texts : [];
  const billTextUrl = bill?.state_link || bill?.url || texts[0]?.state_link || texts[0]?.url || null;
  const topics = classifyTopics(bill?.title || '', bill?.description || '');
  const sponsors = Array.isArray(bill?.sponsors) && bill.sponsors.length ? bill.sponsors : null;
  const { legiscan_subjects, legiscan_subjects_search } = legiscanSubjectColumnsFromRawPayload(bill?.subjects);
  const row: Record<string, unknown> = {
    legiscan_id: bill?.bill_id,
    bill_number: bill?.bill_number || bill?.number, // dataset ZIP uses bill_number; getMasterList uses number
    title: bill?.title || '',
    description: bill?.description || null,
    session: sessionName,
    status: mapStatus(Number(bill?.status) || 0, lastAction || ''),
    chamber: chamberFromBillNumber(bill?.number || ''),
    last_action: lastAction,
    last_action_date: lastActionDate,
    bill_text_url: billTextUrl,
    topics: topics.length > 0 ? topics : null,
    sponsors,
    legiscan_subjects,
    legiscan_subjects_search,
    introduced_date: deriveIntroducedDate(bill),
    source: 'legiscan',
    change_hash: bill?.change_hash || null,
    legiscan_session_id: sessionId,
    updated_from_legiscan_at: new Date().toISOString(),
  };
  return row;
}

function buildLegislatorRow(person: any): Record<string, unknown> | null {
  if (!person?.people_id) return null;
  const first = person?.first_name || null;
  const last = person?.last_name || null;
  const composed = [first, person?.middle_name, last].filter(Boolean).join(' ').trim();
  const name = person?.name || composed || `LegiScan #${person.people_id}`;
  return {
    legiscan_id: Number(person.people_id),
    name,
    first_name: first,
    last_name: last,
    party: person?.party || null,
    chamber: chamberFromRole(person?.role),
    role_title: person?.role || null,
    district: person?.district != null && person.district !== '' ? String(person.district) : null,
    active: true,
  };
}

function buildVoteRow(rc: any, billUuidByLegiscanId: Map<number, string>): Record<string, unknown> | null {
  const billUuid = billUuidByLegiscanId.get(Number(rc?.bill_id));
  if (!billUuid || rc?.roll_call_id == null) return null;
  const detail = Array.isArray(rc?.votes)
    ? rc.votes.map((v: any) => ({ legislator_id: String(v?.people_id ?? ''), vote: v?.vote_text ?? null }))
    : null;
  return {
    bill_id: billUuid,
    roll_call_id: Number(rc.roll_call_id),
    date: toIsoDate(rc?.date),
    description: rc?.desc || null,
    yea_count: Number(rc?.yea) || 0,
    nay_count: Number(rc?.nay) || 0,
    absent_count: Number(rc?.absent) || 0,
    passed: rc?.passed === 1 || rc?.passed === true,
    roll_call: detail,
  };
}

// --- Supabase helpers ---

function getDb() {
  if (!supabaseAdmin) {
    throw new Error('Supabase service-role client not configured. Set SUPABASE_URL (or NEXT_PUBLIC_SUPABASE_URL) and SUPABASE_SERVICE_ROLE_KEY in .env.local.');
  }
  return supabaseAdmin;
}

async function fetchStoredDatasetHashes(): Promise<Map<number, string>> {
  const db = getDb();
  const { data, error } = await db.from('ky_legiscan_datasets').select('session_id, dataset_hash');
  if (error) throw new Error(`Read ky_legiscan_datasets failed: ${error.message}`);
  const map = new Map<number, string>();
  for (const row of data || []) {
    if (row.session_id != null && row.dataset_hash) map.set(Number(row.session_id), String(row.dataset_hash));
  }
  return map;
}

async function upsertBillRows(rows: Record<string, unknown>[]): Promise<Map<number, string>> {
  const db = getDb();
  const BATCH = 200;
  for (let i = 0; i < rows.length; i += BATCH) {
    const batch = rows.slice(i, i + BATCH);
    const { error } = await db.from('ky_bills').upsert(batch, { onConflict: 'legiscan_id' });
    if (error) throw new Error(`ky_bills upsert batch ${i / BATCH + 1}: ${error.message}`);
  }
  const ids = rows.map((r) => Number(r.legiscan_id)).filter((n) => Number.isFinite(n));
  const map = new Map<number, string>();
  const CHUNK = 300;
  for (let i = 0; i < ids.length; i += CHUNK) {
    const chunk = ids.slice(i, i + CHUNK);
    const { data, error } = await db.from('ky_bills').select('id, legiscan_id').in('legiscan_id', chunk);
    if (error) throw new Error(`ky_bills lookup: ${error.message}`);
    for (const row of data || []) {
      if (row.legiscan_id != null && row.id) map.set(Number(row.legiscan_id), String(row.id));
    }
  }
  return map;
}

async function upsertLegislatorRows(rows: Record<string, unknown>[]): Promise<number> {
  if (rows.length === 0) return 0;
  const db = getDb();
  const BATCH = 200;
  let synced = 0;
  for (let i = 0; i < rows.length; i += BATCH) {
    const batch = rows.slice(i, i + BATCH);
    const { error } = await db.from('ky_legislators').upsert(batch, { onConflict: 'legiscan_id' });
    if (error) throw new Error(`ky_legislators upsert batch ${i / BATCH + 1}: ${error.message}`);
    synced += batch.length;
  }
  return synced;
}

async function upsertVoteRows(rows: Record<string, unknown>[]): Promise<number> {
  if (rows.length === 0) return 0;
  const db = getDb();
  const BATCH = 200;
  let synced = 0;
  for (let i = 0; i < rows.length; i += BATCH) {
    const batch = rows.slice(i, i + BATCH);
    const { error } = await db.from('ky_votes').upsert(batch, { onConflict: 'bill_id,roll_call_id' });
    if (error) throw new Error(`ky_votes upsert batch ${i / BATCH + 1}: ${error.message}`);
    synced += batch.length;
  }
  return synced;
}

async function recordDatasetImport(entry: LegiScanDatasetListEntry): Promise<void> {
  const db = getDb();
  const { error } = await db.from('ky_legiscan_datasets').upsert(
    {
      session_id: entry.session_id,
      dataset_hash: entry.dataset_hash,
      access_key: entry.access_key,
      last_imported_at: new Date().toISOString(),
    },
    { onConflict: 'session_id' },
  );
  if (error) throw new Error(`ky_legiscan_datasets upsert: ${error.message}`);
}

// --- Main orchestrator ---

function dedupeLegislatorRows(rows: Record<string, unknown>[]): Record<string, unknown>[] {
  const byId = new Map<number, Record<string, unknown>>();
  for (const r of rows) {
    const id = Number(r.legiscan_id);
    if (!Number.isFinite(id)) continue;
    byId.set(id, r);
  }
  return [...byId.values()];
}

function dedupeVoteRows(rows: Record<string, unknown>[]): Record<string, unknown>[] {
  const byKey = new Map<string, Record<string, unknown>>();
  for (const r of rows) {
    const key = `${r.bill_id}:${r.roll_call_id}`;
    byKey.set(key, r);
  }
  return [...byKey.values()];
}

async function processDatasetEntry(entry: LegiScanDatasetListEntry): Promise<{ bills: number; people: number; votes: number }> {
  const client = getKyLegiScanClient();
  const dataset = await client.fetchDataset(entry.session_id, entry.access_key);
  if (!dataset?.zip) throw new Error(`Empty dataset payload for session ${entry.session_id}`);
  const { bills, people, rollCalls } = parseDatasetZip(dataset.zip);
  const sessionName = dataset.session_name || entry.session_name || entry.session_title || String(entry.session_id);
  console.log(`[bulk-seed] Parsed dataset ${entry.session_id} (${sessionName}): ${bills.length} bills, ${people.length} people, ${rollCalls.length} roll calls`);

  if (dryRun) {
    return { bills: bills.length, people: people.length, votes: rollCalls.length };
  }

  const billRows = bills
    .map((b) => buildBillRow(b, sessionName, entry.session_id))
    .filter((r) => r.legiscan_id != null && r.bill_number);
  const billUuidByLegiscanId = await upsertBillRows(billRows);
  console.log(`[bulk-seed] Upserted ${billRows.length} bills (session ${entry.session_id})`);

  const legislatorRows = dedupeLegislatorRows(
    people.map((p) => buildLegislatorRow(p)).filter((r): r is Record<string, unknown> => r !== null),
  );
  const legSynced = await upsertLegislatorRows(legislatorRows);
  console.log(`[bulk-seed] Upserted ${legSynced} legislators (session ${entry.session_id})`);

  const voteRows = dedupeVoteRows(
    rollCalls.map((rc) => buildVoteRow(rc, billUuidByLegiscanId)).filter((r): r is Record<string, unknown> => r !== null),
  );
  const voteSynced = await upsertVoteRows(voteRows);
  console.log(`[bulk-seed] Upserted ${voteSynced} votes (session ${entry.session_id})`);

  await recordDatasetImport(entry);
  return { bills: billRows.length, people: legSynced, votes: voteSynced };
}

async function main() {
  console.log('');
  console.log('╔══════════════════════════════════════════════╗');
  console.log('║  KY LegiScan Bulk Seed — Dataset Importer    ║');
  console.log('╚══════════════════════════════════════════════╝');
  console.log(`  state: ${state}${dryRun ? '  [DRY RUN]' : ''}`);
  console.log('');

  if (!process.env.LEGISCAN_API_KEY) {
    console.warn('[bulk-seed] LEGISCAN_API_KEY not set — getDatasetList will fail.');
  }
  if (!dryRun) {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL;
    if (!supabaseUrl) console.warn('[bulk-seed] Supabase URL not set — DB writes will fail.');
    if (!process.env.SUPABASE_SERVICE_ROLE_KEY) console.warn('[bulk-seed] SUPABASE_SERVICE_ROLE_KEY not set — DB writes will fail.');
  }

  const client = getKyLegiScanClient();
  const list = await client.fetchDatasetList(state);
  console.log(`[bulk-seed] getDatasetList(${state}) returned ${list.length} sessions`);
  if (!list.length) {
    console.log('[bulk-seed] Nothing to do.');
    process.exit(0);
  }

  const stored = dryRun ? new Map<number, string>() : await fetchStoredDatasetHashes();
  const changed: LegiScanDatasetListEntry[] = [];
  const unchanged: LegiScanDatasetListEntry[] = [];
  for (const entry of list) {
    if (stored.get(entry.session_id) === entry.dataset_hash) unchanged.push(entry);
    else changed.push(entry);
  }
  const toProcess = sessionLimit ? changed.slice(0, sessionLimit) : changed;
  const deferred = sessionLimit ? changed.slice(sessionLimit) : [];
  console.log(`[bulk-seed] ${unchanged.length} unchanged (skipped), ${toProcess.length} to download${deferred.length ? `, ${deferred.length} deferred (re-run to continue)` : ''}`);
  for (const s of unchanged) console.log(`  ⏭️  ${s.session_id} ${s.session_name} (hash unchanged)`);
  for (const s of deferred) console.log(`  ⏸️  ${s.session_id} ${s.session_name} (deferred)`);

  let totalBills = 0;
  let totalPeople = 0;
  let totalVotes = 0;
  const failures: { session_id: number; error: string }[] = [];
  for (const entry of toProcess) {
    console.log('');
    console.log(`[bulk-seed] → session ${entry.session_id} ${entry.session_name} (${entry.year_start}-${entry.year_end}) hash=${entry.dataset_hash.slice(0, 8)}…`);
    if (dryRun) {
      console.log(`[bulk-seed] [DRY RUN] Would fetchDataset + decode zip + upsert bills/people/votes, then record hash in ky_legiscan_datasets.`);
      continue;
    }
    try {
      const res = await processDatasetEntry(entry);
      totalBills += res.bills;
      totalPeople += res.people;
      totalVotes += res.votes;
    } catch (err: any) {
      const msg = err?.message || String(err);
      console.error(`[bulk-seed] Session ${entry.session_id} FAILED: ${msg}`);
      failures.push({ session_id: entry.session_id, error: msg });
    }
  }

  console.log('');
  console.log('═══════════════ Bulk Seed Results ═══════════════');
  console.log(`  sessions skipped (unchanged): ${unchanged.length}`);
  console.log(`  sessions deferred:            ${deferred.length}`);
  console.log(`  sessions processed:           ${toProcess.length - failures.length}`);
  console.log(`  sessions failed:              ${failures.length}`);
  if (!dryRun) {
    console.log(`  bills upserted:               ${totalBills}`);
    console.log(`  legislators upserted:         ${totalPeople}`);
    console.log(`  votes upserted:               ${totalVotes}`);
  }
  for (const f of failures) console.log(`  ❌ session ${f.session_id}: ${f.error}`);
  console.log('');

  process.exit(failures.length > 0 ? 1 : 0);
}

main().catch((err) => {
  console.error(`[bulk-seed] Fatal: ${err?.message || err}`);
  process.exit(1);
});
