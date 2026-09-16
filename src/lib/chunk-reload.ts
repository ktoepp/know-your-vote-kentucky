/**
 * One-shot hard reload when a Next.js chunk fails to load after a deploy.
 *
 * A tab that stayed open across a deploy holds the old build manifest and asks for a
 * content-hashed `/_next/static/chunks/*.js` Vercel no longer serves. The App Router
 * error boundary's `reset()` re-runs the same stale import, so it can never clear the
 * error; only a full reload fetches the new manifest. The reload is guarded by a
 * sessionStorage flag so a chunk that is genuinely missing cannot loop the page.
 *
 * Flag lifecycle (per tab, via sessionStorage):
 *   unset      → first chunk failure: set "pending", reload.
 *   "pending"  → the reloaded page landed: `recordChunkReloadOutcome` captures
 *                `chunk_reload_recovered`, sets "done".
 *   "done"     → a later chunk failure in this tab is not retried (real failure).
 */
import { isChunkLoadError } from "@/lib/telemetry-filters";

export const CHUNK_RELOAD_KEY = "kyvky:chunk-reload";
export const CHUNK_RELOAD_RECOVERED_EVENT = "chunk_reload_recovered";

export type StorageLike = Pick<Storage, "getItem" | "setItem">;

const readFlag = (storage: StorageLike | undefined): string | null => {
  try {
    return storage?.getItem(CHUNK_RELOAD_KEY) ?? null;
  } catch {
    // sessionStorage can throw in private mode / blocked storage; behave as unset.
    return null;
  }
};

const writeFlag = (storage: StorageLike | undefined, value: string): boolean => {
  try {
    storage?.setItem(CHUNK_RELOAD_KEY, value);
    return storage !== undefined;
  } catch {
    return false;
  }
};

const defaultStorage = (): StorageLike | undefined =>
  typeof window === "undefined" ? undefined : window.sessionStorage;

/** True once this tab has already used (or is in the middle of) its one reload. */
export const hasSpentChunkReload = (storage: StorageLike | undefined = defaultStorage()): boolean =>
  readFlag(storage) !== null;

/**
 * If `error` is a chunk-load failure and this tab has not reloaded for one yet, mark the
 * flag and trigger a reload. Returns true when a reload was triggered, so the caller can
 * avoid rendering a retry button that cannot work. Never reloads without being able to
 * set the guard flag first, so a storage failure cannot produce a reload loop.
 */
export const reloadOnChunkLoadError = (
  error: Error | undefined,
  deps: { storage?: StorageLike; reload?: () => void } = {},
): boolean => {
  const storage = "storage" in deps ? deps.storage : defaultStorage();
  const reload = deps.reload ?? (() => window.location.reload());
  if (!isChunkLoadError(error)) return false;
  if (hasSpentChunkReload(storage)) return false;
  if (!writeFlag(storage, "pending")) return false;
  reload();
  return true;
};

/**
 * Called once on every page load (after analytics init). If the previous page in this
 * tab reloaded to recover from a chunk failure, record that the recovery landed and
 * close the flag so a future failure is treated as real.
 */
export const recordChunkReloadOutcome = (
  capture: (event: string, props?: Record<string, unknown>) => void,
  storage: StorageLike | undefined = defaultStorage(),
): boolean => {
  if (readFlag(storage) !== "pending") return false;
  writeFlag(storage, "done");
  capture(CHUNK_RELOAD_RECOVERED_EVENT);
  return true;
};
