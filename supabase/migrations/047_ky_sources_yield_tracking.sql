-- 047_ky_sources_yield_tracking.sql
-- Track whether a sync is still *producing* anything, not just whether it ran.
--
-- `ky_sources` recorded `status='success'` with `items_synced=0` indefinitely, so
-- a pipeline that ran on schedule and silently stopped yielding data looked
-- identical to a healthy one. On 2026-07-31 `lrc-calendar` reported success with
-- items_synced=0 while no ky_committee_meetings row had been written since
-- 2026-07-26.
--
-- A single zero is normal — change-gated syncs and quiet interim weeks both
-- produce them legitimately — so the useful signal is how long a source has gone
-- without yielding anything, which needs to survive across runs.

ALTER TABLE public.ky_sources
  ADD COLUMN last_nonzero_sync_at TIMESTAMPTZ,
  ADD COLUMN consecutive_zero_syncs INTEGER NOT NULL DEFAULT 0;

COMMENT ON COLUMN public.ky_sources.last_nonzero_sync_at IS
  'Last successful run that synced at least one item. NULL until one is observed.';
COMMENT ON COLUMN public.ky_sources.consecutive_zero_syncs IS
  'Successful runs since the last one that synced at least one item.';

-- Seed a baseline for EVERY existing source, not just those whose last run
-- yielded. A source left NULL here has no fixed reference point, and the
-- evaluator would have to date it from `last_sync_at` — which advances on every
-- run, so the measured age would reset each time and a genuinely stalled source
-- could never breach its budget. History we never recorded cannot be
-- reconstructed, so the clock honestly starts from the last observed run.
UPDATE public.ky_sources
  SET last_nonzero_sync_at = last_sync_at
  WHERE last_nonzero_sync_at IS NULL AND last_sync_at IS NOT NULL;
