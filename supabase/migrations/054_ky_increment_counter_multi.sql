-- 054_ky_increment_counter_multi.sql
--
-- Increment several buckets of one `ky_sync_state` counter payload in a single
-- round trip.
--
-- The LegiScan query counter (`legiscan_query_counter`) has only ever bucketed
-- by month, so a month's usage is a single integer with no breakdown. When
-- June 2026 came in at 29,164 queries (97% of the free monthly cap) the cause
-- — the bill-detail read path calling `getBill` on every render — had to be
-- reconstructed from decisions.md rather than read off the data.
--
-- The client now records three buckets per API call: the month total (which
-- the quota guard and the admin page still read unchanged), `month:op`, and
-- `month:op@caller`. Doing that as three `ky_increment_counter` RPCs would be
-- three round trips per LegiScan request, so this variant takes an array and
-- folds them in one statement.
--
-- `ky_increment_counter(text, text)` is left in place — the Anthropic cache and
-- rate-limit counters still use it and only ever touch one bucket.

CREATE OR REPLACE FUNCTION ky_increment_counter_multi(counter_key TEXT, bucket_keys TEXT[])
RETURNS void
LANGUAGE plpgsql AS $$
DECLARE
  bucket TEXT;
  merged JSONB;
BEGIN
  IF bucket_keys IS NULL OR array_length(bucket_keys, 1) IS NULL THEN
    RETURN;
  END IF;

  -- Lock (or create) the counter row, fold every bucket into its payload in
  -- memory, then write it back: two statements and one row lock per call,
  -- however many buckets the caller passes.
  INSERT INTO ky_sync_state (key, payload, updated_at)
  VALUES (counter_key, '{}'::jsonb, NOW())
  ON CONFLICT (key) DO UPDATE SET updated_at = NOW()
  RETURNING COALESCE(payload, '{}'::jsonb) INTO merged;

  FOREACH bucket IN ARRAY bucket_keys LOOP
    IF bucket IS NOT NULL AND bucket <> '' THEN
      merged := jsonb_set(
        merged,
        ARRAY[bucket],
        to_jsonb(COALESCE((merged->>bucket)::int, 0) + 1)
      );
    END IF;
  END LOOP;

  UPDATE ky_sync_state
     SET payload = merged,
         updated_at = NOW()
   WHERE key = counter_key;
END;
$$;

ALTER FUNCTION public.ky_increment_counter_multi(text, text[])
  SET search_path = public;

-- SECURITY INVOKER (like ky_increment_counter), so RLS on ky_sync_state is
-- still what actually stops an anon caller writing; closing the /rpc/ path is
-- belt and braces. service_role is granted explicitly because that is the role
-- the sync client connects as.
REVOKE EXECUTE ON FUNCTION public.ky_increment_counter_multi(text, text[])
  FROM anon, authenticated;
GRANT EXECUTE ON FUNCTION public.ky_increment_counter_multi(text, text[])
  TO service_role;
