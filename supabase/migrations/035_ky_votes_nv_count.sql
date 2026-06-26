-- 035_ky_votes_nv_count.sql
-- Persist LegiScan "not voting" (nv) tallies on roll calls.
--
-- ky_votes has stored yea_count / nay_count / absent_count since migration 001,
-- but never nv (LegiScan distinguishes "not voting" from "absent"). The bill-detail
-- page renders the NV count, so to render roll calls entirely from the DB (instead
-- of a live getRollCall enrichment that scales LegiScan quota with page traffic) we
-- need nv persisted too.
--
-- Backfilled going forward by syncKyVotes (fetchVotes → getRollCall already returns
-- vote.nv). Existing rows stay NULL until their next vote sync; the UI hides the NV
-- chip when nv is unknown, so Yea/Nay stay accurate in the meantime.
--
-- See decisions.md § 2026-06-26 — bill-detail DB render and src/lib/ky-bill-detail-server.ts.

ALTER TABLE public.ky_votes
  ADD COLUMN IF NOT EXISTS nv_count INTEGER;

COMMENT ON COLUMN public.ky_votes.nv_count IS
  'LegiScan roll-call "not voting" (nv) tally. NULL = not yet captured (pre-2026-06-26 rows until re-synced).';
