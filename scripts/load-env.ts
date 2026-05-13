/**
 * Load env files before any other modules.
 *
 * - Paths are resolved from the repo root (parent of `scripts/`), not `process.cwd()`,
 *   so `tsx scripts/manual-sync.ts …` works even when invoked from another directory.
 * - `.env.local` uses `override: true` so values from the file replace stale or empty
 *   shell variables (e.g. `OPENSTATES_API_KEY=` in the environment).
 */
import path from 'path';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';

const rootDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');

dotenv.config({ path: path.join(rootDir, '.env') });
dotenv.config({ path: path.join(rootDir, '.env.local'), override: true });
