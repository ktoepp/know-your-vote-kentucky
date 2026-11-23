import { test, describe } from "node:test";
import assert from "node:assert/strict";
import {
  CHUNK_RELOAD_KEY,
  CHUNK_RELOAD_RECOVERED_EVENT,
  hasFinishedChunkReload,
  hasSpentChunkReload,
  recordChunkReloadOutcome,
  reloadOnChunkLoadError,
  type StorageLike,
} from "./chunk-reload";
import { shouldDropException, type ExceptionLike } from "./telemetry-filters";

const memoryStorage = (initial: Record<string, string> = {}): StorageLike & { data: Record<string, string> } => {
  const data = { ...initial };
  return {
    data,
    getItem: (k) => (k in data ? data[k] : null),
    setItem: (k, v) => {
      data[k] = v;
    },
  };
};

const chunkError = () => {
  const err = new Error("Loading chunk 7122 failed.");
  err.name = "ChunkLoadError";
  return err;
};

describe("reloadOnChunkLoadError", () => {
  test("reloads once on the first chunk failure and marks the session", () => {
    const storage = memoryStorage();
    let reloads = 0;
    const triggered = reloadOnChunkLoadError(chunkError(), { storage, reload: () => reloads++ });
    assert.equal(triggered, true);
    assert.equal(reloads, 1);
    assert.equal(storage.data[CHUNK_RELOAD_KEY], "pending");
    assert.equal(hasSpentChunkReload(storage), true);
  });

  test("does not reload again in a session that already reloaded (no loop)", () => {
    for (const state of ["pending", "done"]) {
      const storage = memoryStorage({ [CHUNK_RELOAD_KEY]: state });
      let reloads = 0;
      assert.equal(reloadOnChunkLoadError(chunkError(), { storage, reload: () => reloads++ }), false);
      assert.equal(reloads, 0);
    }
  });

  test("ignores errors that are not chunk failures", () => {
    const storage = memoryStorage();
    let reloads = 0;
    assert.equal(reloadOnChunkLoadError(new Error("boom"), { storage, reload: () => reloads++ }), false);
    assert.equal(reloadOnChunkLoadError(undefined, { storage, reload: () => reloads++ }), false);
    assert.equal(reloads, 0);
    assert.equal(CHUNK_RELOAD_KEY in storage.data, false);
  });

  test("never reloads when the guard flag cannot be written (storage missing or throwing)", () => {
    let reloads = 0;
    assert.equal(reloadOnChunkLoadError(chunkError(), { storage: undefined, reload: () => reloads++ }), false);
    const throwing: StorageLike = {
      getItem: () => null,
      setItem: () => {
        throw new Error("QuotaExceededError");
      },
    };
    assert.equal(reloadOnChunkLoadError(chunkError(), { storage: throwing, reload: () => reloads++ }), false);
    assert.equal(reloads, 0);
  });
});

describe("recordChunkReloadOutcome", () => {
  test("captures chunk_reload_recovered exactly once after a pending reload lands", () => {
    const storage = memoryStorage({ [CHUNK_RELOAD_KEY]: "pending" });
    const captured: string[] = [];
    assert.equal(recordChunkReloadOutcome((e) => captured.push(e), storage), true);
    assert.deepEqual(captured, [CHUNK_RELOAD_RECOVERED_EVENT]);
    assert.equal(storage.data[CHUNK_RELOAD_KEY], "done");
    // A second page load in the same tab must not re-count the recovery.
    assert.equal(recordChunkReloadOutcome((e) => captured.push(e), storage), false);
    assert.equal(captured.length, 1);
  });

  test("captures nothing on an ordinary page load", () => {
    const captured: string[] = [];
    assert.equal(recordChunkReloadOutcome((e) => captured.push(e), memoryStorage()), false);
    assert.equal(captured.length, 0);
  });
});

describe("hasFinishedChunkReload", () => {
  test("is true only once the reload has landed", () => {
    assert.equal(hasFinishedChunkReload(memoryStorage()), false);
    assert.equal(hasFinishedChunkReload(memoryStorage({ [CHUNK_RELOAD_KEY]: "pending" })), false);
    assert.equal(hasFinishedChunkReload(memoryStorage({ [CHUNK_RELOAD_KEY]: "done" })), true);
    assert.equal(hasFinishedChunkReload(undefined), false);
  });
});

describe("telemetry drop decision across the reload lifecycle", () => {
  // V8 shape of a stale webpack runtime loading a chunk from a newer build.
  const staleModule: ExceptionLike[] = [
    {
      type: "TypeError",
      value: "Cannot read properties of undefined (reading 'call')",
      stacktrace: { frames: [{ filename: "https://www.kyvky.com/_next/static/chunks/webpack-40527c2c9ab3273c.js" }] },
    },
  ];
  const drops = (storage: StorageLike) =>
    shouldDropException(staleModule, { chunkReloadSpent: hasFinishedChunkReload(storage) });

  test("drops the error that triggers the reload, even after the listener set the flag", () => {
    const storage = memoryStorage();
    const err = new Error("Cannot read properties of undefined (reading 'call')");
    err.stack = "TypeError: x\n at https://www.kyvky.com/_next/static/chunks/webpack-40527c2c9ab3273c.js:1:100";
    assert.equal(reloadOnChunkLoadError(err, { storage, reload: () => {} }), true);
    assert.equal(storage.data[CHUNK_RELOAD_KEY], "pending");
    assert.equal(drops(storage), true);
  });

  test("keeps the same error once the reloaded page landed (the reload did not help)", () => {
    const storage = memoryStorage({ [CHUNK_RELOAD_KEY]: "pending" });
    recordChunkReloadOutcome(() => {}, storage);
    assert.equal(drops(storage), false);
  });
});
