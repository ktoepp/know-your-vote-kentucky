import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL;

// Use the service role key ONLY for server-side code. The `server-only`
// fence lives in `./supabaseAdmin.ts`, which re-exports this; plain-Node
// scripts (e.g. `tsx` manual-sync) import this module directly.
export const supabaseAdmin = process.env.SUPABASE_SERVICE_ROLE_KEY && supabaseUrl
  ? createClient(supabaseUrl, process.env.SUPABASE_SERVICE_ROLE_KEY)
  : null;

