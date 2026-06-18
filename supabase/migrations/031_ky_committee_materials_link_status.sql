-- 031_ky_committee_materials_link_status.sql
-- Persisted reachability for LRC committee material links.
--
-- LRC document URLs go dead after a session ends (the CommitteeDocuments path
-- 404s). We link out — no file hosting — so a stored link that now 404s shows
-- the user a broken link. This column records the last probe result so the
-- committee detail page can flag a known-dead link instead of linking to it.
--
-- Populated by:
--   - the accuracy-audit link probe (ACCURACY_PROBE_LINKS=true) — rotating sample
--   - scripts/probe-committee-material-links.ts (`npm run probe:committee-links`)
--     — full coverage / backfill, cron candidate.
--
-- See decisions.md § 2026-06-13 — Committee material link-status and
-- src/lib/accuracy-audit/checkers/materials.ts.

ALTER TABLE public.ky_committee_materials
  ADD COLUMN IF NOT EXISTS link_status TEXT
    CHECK (link_status IN ('ok', 'dead')),
  ADD COLUMN IF NOT EXISTS link_checked_at TIMESTAMPTZ;

COMMENT ON COLUMN public.ky_committee_materials.link_status IS
  'Last probed reachability: ok = 2xx/3xx, dead = HTTP 404. NULL = never probed / unknown.';
COMMENT ON COLUMN public.ky_committee_materials.link_checked_at IS
  'When link_status was last written by a probe run.';
