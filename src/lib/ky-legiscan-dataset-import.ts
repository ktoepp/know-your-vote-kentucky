/**
 * Shared LegiScan dataset import: parses the base64 ZIP payload from
 * `getDataset`, builds `ky_bills` / `ky_legislators` / `ky_votes` rows, and
 * upserts against Supabase. Hash-gated against `ky_legiscan_datasets` so
 * unchanged sessions cost 0 downloads (LegiScan penalises repeated unchanged
 * pulls — see project_legiscan_dataset_hash_gating memo, 2026-07-07).
 *
 * Two callers today:
 *   - `scripts/ky-legiscan-bulk-seed.ts` — operator-gated, all sessions.
 *   - `scripts/sync-ky-dataset.ts`      — Sunday cron, active session,
 *                                         Slack-wired, quota-hold aware.
 */
import { inflateRawSync } from 'node:zlib';
import AdmZip from 'adm-zip';
import type { SupabaseClient } from '@supabase/supabase-js';
import { classifyTopics } from './ky-topic-classifier';
import { legiscanSubjectColumnsFromRawPayload } from './ky-legiscan-subjects';
import { mapLegiScanBillStatus } from './map-legiscan-bill-status';
import type { LegiScanDatasetListEntry } from './ky-legiscan-client';

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

// --- Minimal ZIP parser (Node zlib only). Handles store (0) + deflate (8);
//     unsupported methods trigger the adm-zip fallback.
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
    else throw new Error(`__ADM_ZIP_FALLBACK__:${method}`);
    if (name.endsWith('/')) continue;
    entries.push({ name, data });
  }
  return entries;
}

export interface DatasetPayloads {
  bills: any[];
  people: any[];
  rollCalls: any[];
}

export function parseDatasetZip(b64: string): DatasetPayloads {
  const buf = Buffer.from(b64, 'base64');
  let entries: ZipEntry[];
  try {
    entries = iterateZipEntries(buf);
  } catch (err: any) {
    if (typeof err?.message === 'string' && err.message.startsWith('__ADM_ZIP_FALLBACK__')) {
      const zip = new AdmZip(buf);
      entries = zip.getEntries()
        .filter((e) => !e.isDirectory && e.entryName.endsWith('.json'))
        .map((e) => ({ name: e.entryName, data: e.getData() }));
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

// --- Row builders --------------------------------------------------------

export function buildBillRow(bill: any, sessionName: string, sessionId: number): Record<string, unknown> {
  const history = Array.isArray(bill?.history) ? bill.history : [];
  const last = history[history.length - 1];
  const lastAction: string | null = last?.action || bill?.last_action || null;
  const lastActionDate = toIsoDate(last?.date || bill?.last_action_date || bill?.status_date);
  const texts = Array.isArray(bill?.texts) ? bill.texts : [];
  const billTextUrl = bill?.state_link || bill?.url || texts[0]?.state_link || texts[0]?.url || null;
  const topics = classifyTopics(bill?.title || '', bill?.description || '');
  const sponsors = Array.isArray(bill?.sponsors) && bill.sponsors.length ? bill.sponsors : null;
  const { legiscan_subjects, legiscan_subjects_search } = legiscanSubjectColumnsFromRawPayload(bill?.subjects);
  return {
    legiscan_id: bill?.bill_id,
    // dataset ZIP uses bill_number; getMasterList uses number.
    bill_number: bill?.bill_number || bill?.number,
    title: bill?.title || '',
    description: bill?.description || null,
    session: sessionName,
    status: mapLegiScanBillStatus(Number(bill?.status) || 0, lastAction || ''),
    chamber: chamberFromBillNumber(bill?.bill_number || bill?.number || ''),
    last_action: lastAction,
    last_action_date: lastActionDate,
    bill_text_url: billTextUrl,
    topics: topics.length > 0 ? topics : null,
    sponsors,
    legiscan_history: history.length ? history : null,
    legiscan_texts: texts.length ? texts : null,
    legiscan_subjects,
    legiscan_subjects_search,
    introduced_date: deriveIntroducedDate(bill),
    source: 'legiscan',
    change_hash: bill?.change_hash || null,
    legiscan_session_id: sessionId,
    updated_from_legiscan_at: new Date().toISOString(),
  };
}

export function buildLegislatorRow(person: any): Record<string, unknown> | null {
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

export function buildVoteRow(rc: any, billUuidByLegiscanId: Map<number, string>): Record<string, unknown> | null {
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

export function dedupeLegislatorRows(rows: Record<string, unknown>[]): Record<string, unknown>[] {
  const byId = new Map<number, Record<string, unknown>>();
  for (const r of rows) {
    const id = Number(r.legiscan_id);
    if (!Number.isFinite(id)) continue;
    byId.set(id, r);
  }
  return [...byId.values()];
}

export function dedupeVoteRows(rows: Record<string, unknown>[]): Record<string, unknown>[] {
  const byKey = new Map<string, Record<string, unknown>>();
  for (const r of rows) {
    const key = `${r.bill_id}:${r.roll_call_id}`;
    byKey.set(key, r);
  }
  return [...byKey.values()];
}

// --- Supabase persistence -------------------------------------------------

export async function fetchStoredDatasetHashes(db: SupabaseClient): Promise<Map<number, string>> {
  const { data, error } = await db.from('ky_legiscan_datasets').select('session_id, dataset_hash');
  if (error) throw new Error(`Read ky_legiscan_datasets failed: ${error.message}`);
  const map = new Map<number, string>();
  for (const row of data || []) {
    if (row.session_id != null && row.dataset_hash) map.set(Number(row.session_id), String(row.dataset_hash));
  }
  return map;
}

export async function upsertBillRows(db: SupabaseClient, rows: Record<string, unknown>[]): Promise<Map<number, string>> {
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

export async function upsertLegislatorRows(db: SupabaseClient, rows: Record<string, unknown>[]): Promise<number> {
  if (rows.length === 0) return 0;
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

export async function upsertVoteRows(db: SupabaseClient, rows: Record<string, unknown>[]): Promise<number> {
  if (rows.length === 0) return 0;
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

export async function recordDatasetImport(
  db: SupabaseClient,
  entry: Pick<LegiScanDatasetListEntry, 'session_id' | 'dataset_hash' | 'access_key'>,
): Promise<void> {
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
