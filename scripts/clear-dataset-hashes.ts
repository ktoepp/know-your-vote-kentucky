import './load-env';
import { supabaseAdmin } from '../src/app/lib/supabaseAdminCore';

// Sessions that were processed with 0 bills due to the bill_number field bug
const SESSION_IDS = [2247, 2179, 2120, 2024, 1993];

async function main() {
  const { error, count } = await supabaseAdmin!
    .from('ky_legiscan_datasets')
    .delete({ count: 'exact' })
    .in('session_id', SESSION_IDS);
  if (error) throw error;
  console.log(`Cleared ${count} hash records for sessions: ${SESSION_IDS.join(', ')}`);
  console.log('Re-run bulk-seed to re-import with fix applied.');
}
main();
