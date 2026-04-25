import './load-env';
import { supabaseAdmin } from '../src/app/lib/supabaseAdminCore';

async function main() {
  const month = new Date().toISOString().slice(0, 7);
  const { data } = await supabaseAdmin!.from('ky_sync_state').select('payload').eq('key', 'legiscan_query_counter').maybeSingle();
  const used = (data?.payload as any)?.[month] ?? 0;
  console.log(`Month:     ${month}`);
  console.log(`Used:      ${used} / 30,000`);
  console.log(`Run cost:  ~26 queries (1 list + 25 datasets)`);
  console.log(`After run: ${30000 - used - 26} remaining`);
  console.log(used + 26 <= 30000 ? '✅ Safe to proceed' : '❌ Insufficient quota');
}
main();
