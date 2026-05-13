/**
 * Load env files before any other modules.
 *
 * - Paths are resolved from the repo root (parent of `scripts/`), not `process.cwd()`,
 *   so `tsx scripts/manual-sync.ts …` works even when invoked from another directory.
 * - `.env.local` uses `override: true` so values from the file replace stale or empty
 *   shell variables (e.g. `OPENSTATES_API_KEY=` in the environment).
 * - When the script is running from inside a `.claude/worktrees/<name>/` directory,
 *   we walk up to find the main repo's `.env` / `.env.local` so scripts work without
 *   duplicating env files into every worktree.
 */
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';

// supabase-js eagerly constructs a RealtimeClient on createClient() and Node < 22
// has no global WebSocket. Scripts never subscribe to realtime channels, so a
// minimal stub is enough to get past the constructor check.
type WSStub = { new (...args: unknown[]): unknown };
const g = globalThis as unknown as { WebSocket?: WSStub };
if (typeof g.WebSocket === 'undefined') {
  class NoopWebSocket {
    constructor() {
      // never connects; scripts don't use realtime
    }
  }
  g.WebSocket = NoopWebSocket as unknown as WSStub;
}

const scriptsDir = path.dirname(fileURLToPath(import.meta.url));
const worktreeRoot = path.resolve(scriptsDir, '..');

function findMainRepoRoot(startDir: string): string | null {
  const marker = path.join('.claude', 'worktrees');
  const idx = startDir.indexOf(`${path.sep}${marker}${path.sep}`);
  if (idx === -1) return null;
  return startDir.slice(0, idx);
}

const candidateRoots: string[] = [worktreeRoot];
const mainRoot = findMainRepoRoot(worktreeRoot);
if (mainRoot && mainRoot !== worktreeRoot) candidateRoots.push(mainRoot);

function loadFrom(root: string, file: string, override: boolean) {
  const p = path.join(root, file);
  if (!fs.existsSync(p)) return false;
  dotenv.config({ path: p, override });
  return true;
}

// `.env`: any candidate (no override, first wins for that key).
for (const root of candidateRoots) loadFrom(root, '.env', false);
// `.env.local`: prefer the worktree's own file when present, else fall back to main repo.
// `override: true` so file values replace stale shell vars.
const loadedLocal = candidateRoots.some((root) => loadFrom(root, '.env.local', true));
if (!loadedLocal && process.env.LOAD_ENV_DEBUG) {
  console.warn('[load-env] no .env.local found in', candidateRoots);
}
