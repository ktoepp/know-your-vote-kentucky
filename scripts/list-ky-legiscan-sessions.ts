#!/usr/bin/env npx tsx
/**
 * Print Kentucky LegiScan session ids (newest first). Use session_id with:
 *   npm run sync:ky -- bills --legiscan-session-id=<id>
 */
import './load-env';
import { getKyLegiScanClient } from '../src/lib/ky-data-sources';

async function main() {
  const client = getKyLegiScanClient();
  const sessions = await client.fetchSessions();
  const sorted = [...sessions].sort((a, b) => (b.year_end || 0) - (a.year_end || 0));
  console.log('session_id\tsession_name\tyears');
  for (const s of sorted) {
    console.log(`${s.session_id}\t${s.session_name}\t${s.year_start}-${s.year_end}`);
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
