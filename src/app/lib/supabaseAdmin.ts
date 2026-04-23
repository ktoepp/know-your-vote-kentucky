import 'server-only';
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL;

// Use the service role key ONLY for server-side code; `server-only` above
// causes any client-component import of this module to fail at build time.
export const supabaseAdmin = process.env.SUPABASE_SERVICE_ROLE_KEY && supabaseUrl
  ? createClient(supabaseUrl, process.env.SUPABASE_SERVICE_ROLE_KEY)
  : null;

