-- 056_ky_committee_meetings_agenda_recovery.sql
--
-- Add `agenda_recovery_status` to `ky_committee_meetings` so the accuracy audit
-- can distinguish "agenda lost on write, unacknowledged" from "agenda lost on
-- write, we've tried to recover it and cannot" (Wayback has no snapshot, or
-- the snapshot no longer parses).
--
-- The FAIL findings in the LLM/committees domain are historical damage from
-- before migration 050 made the delete+insert transactional. That state is
-- now bounded: post-050 the sync cannot re-create it. This column lets the
-- repair script (`scripts/repair-missing-agenda-items.ts`) mark meetings
-- that reingest could not restore, so the audit stops flagging them.
--
-- Values in use:
--   NULL                     — default; audit treats a missing-agenda-with-hash
--                              state as an actionable FAIL.
--   'wayback_unavailable'    — repair script queried Wayback and found no
--                              usable snapshot for this meeting's week.
--   'wayback_parse_failed'   — a snapshot existed but did not yield rows for
--                              this committee/date after re-parsing.
--   'reingested'             — repair script re-populated rows successfully.
--                              Kept as a marker for audit history; the row
--                              count is what actually clears the FAIL.
--
-- Anything else (typos, future values) is tolerated by the audit (it just
-- treats non-NULL as "acknowledged"). Keep this a plain TEXT column rather
-- than a CHECK constraint so the repair script can evolve its value set
-- without a follow-up migration.

ALTER TABLE public.ky_committee_meetings
  ADD COLUMN IF NOT EXISTS agenda_recovery_status TEXT;

COMMENT ON COLUMN public.ky_committee_meetings.agenda_recovery_status IS
  'Set by scripts/repair-missing-agenda-items.ts when a meeting whose agenda_content_hash was written but whose agenda_items rows were lost has been acknowledged. NULL means unacknowledged (audit FAILs). Non-NULL suppresses the audit finding. See migration 056 for the value vocabulary.';
