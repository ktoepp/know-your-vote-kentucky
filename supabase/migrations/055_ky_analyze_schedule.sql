-- 055_ky_analyze_schedule.sql
--
-- Close the "scheduling ANALYZE is still open" follow-up left by Defect 4
-- (TASKS.md, 2026-08-02).
--
-- What the follow-up actually needed, measured 2026-08-24 rather than assumed:
-- autoanalyze is NOT broken. `ky_bills` shows autoanalyze_count = 43, and every
-- other read-path table is in the hundreds. The original note ("last_analyze is
-- null, run ANALYZE regardless") described a one-time gap that was fixed by
-- hand on 2026-07-31. A blind periodic ANALYZE on top of working autoanalyze
-- would be theatre.
--
-- The real gap is the *threshold*. Postgres autoanalyzes a table after
-- roughly `50 + 0.1 * n_live_tup` changed rows, so `ky_bills` at 22.5k rows
-- waits for ~2,300 changes. The 6-hourly bill-status sync can exceed that in a
-- single session-time run and then serve browse queries against stats that
-- describe the pre-run table. Interim traffic hides this: `ky_bills` last
-- autoanalyzed 2026-08-01, three weeks before this migration, simply because
-- nothing changed.
--
-- Two changes, addressing the two different ways stats go stale:
--
--   1. Volume-based — lower the scale factor on `ky_bills` only, where the
--      evidence is (the ~4.2 s cold Seq Scan behind Defect 4). Other tables are
--      already autoanalyzing constantly and are left alone.
--   2. Time-based — `ky_analyze_read_path_tables()`, called once daily by the
--      source-health workflow, so stats can never be more than ~24h stale even
--      on a table that sits below its churn threshold for weeks.

-- 1. Volume: analyze ky_bills after ~450 changed rows instead of ~2,300.
--    Vacuum scale factor comes down with it so dead tuples from the same
--    churn are reclaimed on a comparable cadence.
ALTER TABLE ky_bills SET (
  autovacuum_analyze_scale_factor = 0.02,
  autovacuum_analyze_threshold = 200,
  autovacuum_vacuum_scale_factor = 0.05,
  autovacuum_vacuum_threshold = 200
);

-- 2. Time: a daily floor across the tables the read path plans against.
--
-- SECURITY DEFINER because ANALYZE requires table ownership and `service_role`
-- (the role the cron connects as) is not the owner. The table list is
-- hardcoded rather than taken as an argument: no caller input reaches the
-- statement, so there is nothing to inject. Returns what it touched so the
-- workflow can log it instead of asserting success blindly.
CREATE OR REPLACE FUNCTION ky_analyze_read_path_tables()
RETURNS TABLE (table_name TEXT, analyzed_at TIMESTAMPTZ)
LANGUAGE plpgsql
SECURITY DEFINER AS $$
DECLARE
  t TEXT;
BEGIN
  FOREACH t IN ARRAY ARRAY[
    'ky_bills',
    'ky_votes',
    'ky_bill_status_history',
    'ky_committee_agenda_items',
    'ky_committee_materials',
    'ky_committee_meetings',
    'ky_legislators'
  ] LOOP
    EXECUTE format('ANALYZE public.%I', t);
    table_name := t;
    analyzed_at := clock_timestamp();
    RETURN NEXT;
  END LOOP;
END;
$$;

ALTER FUNCTION public.ky_analyze_read_path_tables()
  SET search_path = public;

-- Maintenance, not public API: reachable only by the service role.
REVOKE EXECUTE ON FUNCTION public.ky_analyze_read_path_tables()
  FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.ky_analyze_read_path_tables()
  TO service_role;
