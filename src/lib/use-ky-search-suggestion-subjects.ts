'use client';

import { useEffect, useState } from 'react';
import { supabase } from '@/app/lib/supabaseClient';
import { getActiveSession } from '@/lib/ky-sessions';

export interface KySearchSubjectSuggestion {
  subject_name: string;
  bill_count: number;
}

/**
 * Top LegiScan subject labels from bills (weighted by count), for search discovery chips.
 * Prefer active session when provided by DB; falls back to all sessions if RPC returns empty.
 */
export function useKySearchSuggestionSubjects(options?: { limit?: number }) {
  const lim = options?.limit ?? 16;
  const [rows, setRows] = useState<KySearchSubjectSuggestion[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const sb = supabase;
    if (!sb) {
      setLoading(false);
      setRows([]);
      return;
    }

    const client = sb;

    let cancelled = false;

    async function run() {
      setLoading(true);
      setError(null);
      try {
        const activeName = getActiveSession()?.name ?? null;

        const tryRpc = async (sessionFilter: string | null) => {
          const { data, error: rpcErr } = await client.rpc('ky_top_legiscan_subject_names', {
            p_session: sessionFilter,
            p_limit: lim,
          });
          if (rpcErr) throw rpcErr;
          return (data as KySearchSubjectSuggestion[] | null) ?? [];
        };

        let list = activeName ? await tryRpc(activeName) : [];
        if (!cancelled && list.length === 0) {
          list = await tryRpc(null);
        }

        if (!cancelled) {
          setRows(list.filter((r) => r.subject_name && r.bill_count > 0));
        }
      } catch (e: unknown) {
        const msg =
          e && typeof e === 'object' && 'message' in e ? String((e as { message: unknown }).message) : 'Suggestions unavailable.';
        if (!cancelled) {
          setError(msg.includes('ky_top_legiscan_subject_names') ? 'Subject suggestions require migration 017.' : msg);
          setRows([]);
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    void run();
    return () => {
      cancelled = true;
    };
  }, [lim]);

  return { rows, loading, error };
}
