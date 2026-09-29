import { test } from 'node:test';
import assert from 'node:assert/strict';
import { datasetObjectPath, fetchDatasetZipGated, type DatasetBlobStore } from './legiscan-dataset-store';

const entry = { session_id: 2247, dataset_hash: 'abc123', access_key: 'k' };
const ZIP = Buffer.from('PK-fake-zip').toString('base64');

function memoryStore(initial: Record<string, Buffer> = {}) {
  const objects = new Map(Object.entries(initial));
  const pruned: string[] = [];
  const store: DatasetBlobStore = {
    read: async (p) => objects.get(p) ?? null,
    write: async (p, b) => void objects.set(p, b),
    prune: async (prefix, keep) => {
      for (const k of [...objects.keys()]) {
        if (k.startsWith(`${prefix}/`) && k !== keep) {
          objects.delete(k);
          pruned.push(k);
        }
      }
    },
  };
  return { store, objects, pruned };
}

function countingClient() {
  const calls: number[] = [];
  return {
    calls,
    fetchDataset: async (sessionId: number) => {
      calls.push(sessionId);
      return { zip: ZIP };
    },
  };
}

test('an already-downloaded hash is served from the store for zero queries', async () => {
  const { store } = memoryStore({ [datasetObjectPath(2247, 'abc123')]: Buffer.from(ZIP, 'base64') });
  const client = countingClient();
  const r = await fetchDatasetZipGated(client, entry, { store });
  assert.equal(r.source, 'store');
  assert.equal(r.quotaCost, 0);
  assert.equal(r.zip, ZIP);
  assert.deepEqual(client.calls, []);
});

test('a new hash is downloaded once, stored, and older hashes for the session pruned', async () => {
  const { store, objects, pruned } = memoryStore({ '2247/oldhash.zip': Buffer.from('old') });
  const client = countingClient();
  const first = await fetchDatasetZipGated(client, entry, { store });
  const second = await fetchDatasetZipGated(client, entry, { store });
  assert.equal(first.source, 'api');
  assert.equal(first.quotaCost, 1);
  assert.equal(second.source, 'store');
  assert.deepEqual(client.calls, [2247]);
  assert.deepEqual(pruned, ['2247/oldhash.zip']);
  assert.ok(objects.has('2247/abc123.zip'));
});

test('a store write failure still returns the data', async () => {
  const client = countingClient();
  const store: DatasetBlobStore = {
    read: async () => null,
    write: async () => {
      throw new Error('bucket full');
    },
    prune: async () => {},
  };
  const r = await fetchDatasetZipGated(client, entry, { store });
  assert.equal(r.zip, ZIP);
  assert.equal(r.source, 'api');
});

test('no store configured falls through to the API', async () => {
  const client = countingClient();
  const r = await fetchDatasetZipGated(client, entry, { store: null });
  assert.equal(r.source, 'api');
  assert.deepEqual(client.calls, [2247]);
});
