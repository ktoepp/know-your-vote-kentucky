import { createClient } from '@supabase/supabase-js';
import type { WebSocketLikeConstructor } from '@supabase/realtime-js';
import WebSocketFromWs from 'ws';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL;

/**
 * Node.js 22+ exposes global WebSocket. Older Node (e.g. 20) does not; @supabase/realtime-js
 * then requires the `ws` package as Realtime transport (see websocket-factory.ts).
 * Browsers keep the default (native WebSocket).
 */
function realtimeTransport(): WebSocketLikeConstructor | undefined {
  if (typeof globalThis.WebSocket === 'function') {
    return undefined;
  }
  if (typeof window !== 'undefined') {
    return undefined;
  }
  return WebSocketFromWs as unknown as WebSocketLikeConstructor;
}

const legacyNodeWsTransport = realtimeTransport();

// Use the service role key ONLY for server-side code. The `server-only`
// fence lives in `./supabaseAdmin.ts`, which re-exports this; plain-Node
// scripts (e.g. `tsx` manual-sync) import this module directly.
export const supabaseAdmin =
  process.env.SUPABASE_SERVICE_ROLE_KEY && supabaseUrl
    ? createClient(supabaseUrl, process.env.SUPABASE_SERVICE_ROLE_KEY, {
        ...(legacyNodeWsTransport ? { realtime: { transport: legacyNodeWsTransport } } : {}),
      })
    : null;
