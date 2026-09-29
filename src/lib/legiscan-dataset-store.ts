/**
 * Hash-keyed store for LegiScan dataset ZIPs, so each (session, dataset_hash)
 * is downloaded from LegiScan at most once, whichever code path asks first.
 *
 * Why this exists: LegiScan flagged our key on 2026-07-07 for "repeated
 * downloads of the same dataset when there have been no changes" and, from
 * 2026-11-01, audits keys and permanently bans violators. The dataset sync was
 * already gated on `ky_legiscan_datasets.dataset_hash`, but that gate only
 * answers "have we *imported* this hash" — a reader that needs the ZIP's
 * contents (the accuracy audit compares rows against it) had no copy to read
 * and re-downloaded every run. LegiScan's own guidance is to cache the ZIPs
 * locally: they are static for a week at a time, forever for closed sessions.
 *
 * Objects live in a private Supabase Storage bucket at
 * `{session_id}/{dataset_hash}.zip`. A new hash for a session replaces the old
 * object, so the bucket holds one ZIP per session.
 *
 * Failure policy: storage is an optimization of a compliance rule, not a
 * dependency. A storage read/write failure logs and falls through to the API
 * (read) or is ignored (write) — the caller still gets its data.
 */
import { supabaseAdmin } from '../app/lib/supabaseAdminCore';
import type { LegiScanDatasetListEntry } from './ky-legiscan-client';

export const LEGISCAN_DATASET_BUCKET = 'legiscan-datasets';

export type DatasetFetcher = {
  fetchDataset: (sessionId: number, accessKey: string) => Promise<{ zip?: string } | null>;
};

/** Minimal storage surface, so tests can stub it without a Supabase project. */
export type DatasetBlobStore = {
  read: (path: string) => Promise<Buffer | null>;
  write: (path: string, data: Buffer) => Promise<void>;
  /** Removes every object under `prefix` except `keep`. */
  prune: (prefix: string, keep: string) => Promise<void>;
};

export type GatedDatasetResult = {
  /** Base64 ZIP, the same shape `getDataset` returns, so `parseDatasetZip` takes it unchanged. */
  zip: string;
  source: 'store' | 'api';
  /** LegiScan queries spent: 0 from the store, 1 from the API. */
  quotaCost: 0 | 1;
};

export function datasetObjectPath(sessionId: number, datasetHash: string): string {
  return `${sessionId}/${datasetHash.replace(/[^A-Za-z0-9]/g, '')}.zip`;
}

let bucketReady: Promise<boolean> | null = null;

function ensureBucket(): Promise<boolean> {
  if (!supabaseAdmin) return Promise.resolve(false);
  if (!bucketReady) {
    const db = supabaseAdmin;
    bucketReady = (async () => {
      const { data } = await db.storage.getBucket(LEGISCAN_DATASET_BUCKET);
      if (data) return true;
      const { error } = await db.storage.createBucket(LEGISCAN_DATASET_BUCKET, { public: false });
      // A concurrent run may have created it between the two calls.
      if (error && !/already exists/i.test(error.message)) {
        console.warn(`[dataset-store] Could not create bucket: ${error.message}`);
        return false;
      }
      return true;
    })().catch((err: unknown) => {
      console.warn(`[dataset-store] Bucket check failed: ${err instanceof Error ? err.message : String(err)}`);
      return false;
    });
  }
  return bucketReady;
}

/** Supabase Storage-backed store, or null when no service-role client is configured. */
export function supabaseDatasetBlobStore(): DatasetBlobStore | null {
  if (!supabaseAdmin) return null;
  const bucket = () => supabaseAdmin!.storage.from(LEGISCAN_DATASET_BUCKET);
  return {
    async read(path) {
      if (!(await ensureBucket())) return null;
      const { data, error } = await bucket().download(path);
      if (error || !data) return null;
      return Buffer.from(await data.arrayBuffer());
    },
    async write(path, buf) {
      if (!(await ensureBucket())) return;
      const { error } = await bucket().upload(path, buf, { contentType: 'application/zip', upsert: true });
      if (error) throw new Error(error.message);
    },
    async prune(prefix, keep) {
      if (!(await ensureBucket())) return;
      const { data, error } = await bucket().list(prefix);
      if (error || !data) return;
      const stale = data.map((o) => `${prefix}/${o.name}`).filter((p) => p !== keep);
      if (stale.length) await bucket().remove(stale);
    },
  };
}

/**
 * Returns the dataset ZIP for `entry`, reading the stored copy when this exact
 * `dataset_hash` has been downloaded before and calling `getDataset` only when
 * it has not. Every `getDataset` caller should go through this.
 */
export async function fetchDatasetZipGated(
  client: DatasetFetcher,
  entry: Pick<LegiScanDatasetListEntry, 'session_id' | 'dataset_hash' | 'access_key'>,
  deps: { store?: DatasetBlobStore | null } = {},
): Promise<GatedDatasetResult> {
  const store = deps.store === undefined ? supabaseDatasetBlobStore() : deps.store;
  const path = entry.dataset_hash ? datasetObjectPath(entry.session_id, entry.dataset_hash) : null;

  if (store && path) {
    try {
      const cached = await store.read(path);
      if (cached && cached.length > 0) {
        return { zip: cached.toString('base64'), source: 'store', quotaCost: 0 };
      }
    } catch (err) {
      console.warn(`[dataset-store] Read failed for ${path}: ${err instanceof Error ? err.message : String(err)}`);
    }
  }

  const dataset = await client.fetchDataset(entry.session_id, entry.access_key);
  if (!dataset?.zip) throw new Error(`getDataset returned no zip payload for session ${entry.session_id}`);

  if (store && path) {
    try {
      await store.write(path, Buffer.from(dataset.zip, 'base64'));
      await store.prune(String(entry.session_id), path);
    } catch (err) {
      console.warn(
        `[dataset-store] Could not store ${path} (next reader will re-download): ${err instanceof Error ? err.message : String(err)}`,
      );
    }
  }
  return { zip: dataset.zip, source: 'api', quotaCost: 1 };
}
