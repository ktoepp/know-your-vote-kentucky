-- 048_ky_committee_materials_drop_legacy_duplicates.sql
-- Delete the superseded flat-URL committee-material rows that render every
-- affected document twice.
--
-- NOT APPLIED AUTOMATICALLY. Deleting 802 production rows is the repo owner's
-- call, not a migration-runner's. Read the guards below, run the verification
-- block first, then apply deliberately.
--
-- What: LRC moved committee documents from a flat
--   /CommitteeDocuments/{meeting_id}/{file}
-- layout to one nested under the committee RSN
--   /CommitteeDocuments/{rsn}/{meeting_id}/{file}
-- (see `lrcCommitteeDocumentsUrl` — the trailing slash that produces the nested
-- form is load-bearing). Rows written before that fix kept the flat URL. As of
-- 2026-07-31: 802 of 1,773 rows (45%) are flat, all 802 have an exact nested
-- twin (same committee_id + title + meeting_date), and 263 are dated 2026. Each
-- affected document therefore appears twice in the committee page's materials
-- section, one copy pointing at a dead URL.
--
-- Why this is safe to delete rather than repair: the nested twin already carries
-- identical content (same title, same meeting, same file) and is what every sync
-- since the URL fix writes. The flat row is a duplicate, not a distinct document.
--
-- Nothing holds an FK to ky_committee_materials.id — the accuracy audit writes
-- link_status/link_checked_at on the row itself and nothing else references it.
--
-- Before applying:
--   1. Re-run the verification block below; legacy_total must equal has_twin.
--   2. Run `npm run probe:legacy-material-urls` from GitHub Actions (the dev
--      sandbox cannot reach apps.legislature.ky.gov) and confirm the VERDICT
--      line supports the cleanup. The 404 claim originated in a code comment,
--      not a live probe.
-- After applying:
--   3. `npm run probe:committee-links` and confirm no live link was lost.
--   4. The `checkLegacyDuplicateUrls` finding in the accuracy audit disappears
--      on its own. Do not loosen that check to silence it.
--
-- See decisions.md § 2026-07-31 (hardening pass) and
-- docs/handoff-data-defects-2026-07-31.md § Defect 1.

BEGIN;

-- ---------------------------------------------------------------------------
-- Verification — run this alone first. Both counts must match (802/802 on
-- 2026-07-31). A legacy row WITHOUT a twin is the only copy of that document;
-- the DELETE below leaves such rows alone by construction, but a nonzero
-- orphan count means the situation has changed and wants a fresh look.
-- ---------------------------------------------------------------------------
DO $$
DECLARE
  legacy_total  INTEGER;
  has_twin      INTEGER;
  orphans       INTEGER;
BEGIN
  SELECT count(*) INTO legacy_total
  FROM public.ky_committee_materials
  WHERE url ~ '/CommitteeDocuments/[0-9]+/[^/]+$';

  SELECT count(*) INTO has_twin
  FROM public.ky_committee_materials l
  WHERE l.url ~ '/CommitteeDocuments/[0-9]+/[^/]+$'
    AND EXISTS (
      SELECT 1 FROM public.ky_committee_materials n
      WHERE n.committee_id = l.committee_id
        AND n.title        = l.title
        AND n.meeting_date = l.meeting_date
        AND n.id <> l.id
        AND n.url ~ '/CommitteeDocuments/[0-9]+/[0-9]+/[^/]+$'
    );

  orphans := legacy_total - has_twin;
  RAISE NOTICE 'legacy flat rows: %  with nested twin: %  orphans (kept): %',
    legacy_total, has_twin, orphans;

  IF orphans > 0 THEN
    RAISE WARNING
      'legacy rows without a nested twin: % — these are NOT deleted. Investigate before assuming the cleanup is complete.',
      orphans;
  END IF;
END $$;

-- ---------------------------------------------------------------------------
-- Reversibility. A DELETE of 802 rows has no undo, so keep the deleted rows in
-- a side table. Drop it once a probe pass confirms nothing was lost:
--   DROP TABLE public.ky_committee_materials_legacy_dupes_048;
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.ky_committee_materials_legacy_dupes_048
  AS SELECT * FROM public.ky_committee_materials WHERE false;

COMMENT ON TABLE public.ky_committee_materials_legacy_dupes_048 IS
  'Rows deleted by migration 048 (superseded flat-URL duplicate materials). Restore source; safe to drop once probe:committee-links confirms no live link was lost.';

WITH doomed AS (
  SELECT l.*
  FROM public.ky_committee_materials l
  WHERE l.url ~ '/CommitteeDocuments/[0-9]+/[^/]+$'
    -- Only ever delete a row that still has its nested twin. This is the whole
    -- safety argument: without the twin the flat row is the only copy.
    AND EXISTS (
      SELECT 1 FROM public.ky_committee_materials n
      WHERE n.committee_id = l.committee_id
        AND n.title        = l.title
        AND n.meeting_date = l.meeting_date
        AND n.id <> l.id
        AND n.url ~ '/CommitteeDocuments/[0-9]+/[0-9]+/[^/]+$'
    )
)
INSERT INTO public.ky_committee_materials_legacy_dupes_048
SELECT * FROM doomed;

DELETE FROM public.ky_committee_materials l
WHERE l.url ~ '/CommitteeDocuments/[0-9]+/[^/]+$'
  AND EXISTS (
    SELECT 1 FROM public.ky_committee_materials n
    WHERE n.committee_id = l.committee_id
      AND n.title        = l.title
      AND n.meeting_date = l.meeting_date
      AND n.id <> l.id
      AND n.url ~ '/CommitteeDocuments/[0-9]+/[0-9]+/[^/]+$'
  );

-- Post-delete sanity: every backed-up row must be gone from the live table, and
-- no nested row may have been touched.
DO $$
DECLARE
  backed_up   INTEGER;
  remaining   INTEGER;
  nested_left INTEGER;
BEGIN
  SELECT count(*) INTO backed_up FROM public.ky_committee_materials_legacy_dupes_048;
  SELECT count(*) INTO remaining
  FROM public.ky_committee_materials WHERE url ~ '/CommitteeDocuments/[0-9]+/[^/]+$';
  SELECT count(*) INTO nested_left
  FROM public.ky_committee_materials WHERE url ~ '/CommitteeDocuments/[0-9]+/[0-9]+/[^/]+$';

  RAISE NOTICE 'deleted (backed up): %  legacy rows remaining (orphans): %  nested rows intact: %',
    backed_up, remaining, nested_left;

  IF nested_left = 0 THEN
    RAISE EXCEPTION 'refusing to commit: no nested rows left — the delete matched the wrong shape';
  END IF;
END $$;

COMMIT;
