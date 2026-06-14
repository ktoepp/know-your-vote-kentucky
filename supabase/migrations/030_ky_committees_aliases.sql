-- 030: slug aliases on ky_committees
--
-- Supports merging duplicate committee records (seed-code committee_type 'IJ'/'S'
-- vs the full labels LRC now emits in CommitteeType URL params, e.g.
-- 'Interim Joint Committee'). When a duplicate row is merged away, its slug is
-- appended to the survivor's aliases so old /committees/[slug] URLs can redirect.
--
-- See decisions.md § 2026-06-12 (committee record merge) and
-- scripts/merge-duplicate-committees.ts.

ALTER TABLE ky_committees
  ADD COLUMN IF NOT EXISTS aliases TEXT[] NOT NULL DEFAULT '{}'::text[];

-- Alias lookup is a contains query (aliases @> ARRAY[slug]).
CREATE INDEX IF NOT EXISTS idx_ky_committees_aliases
  ON ky_committees USING GIN (aliases);
