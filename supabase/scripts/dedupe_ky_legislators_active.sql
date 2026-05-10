-- =============================================================================
-- Deactivate duplicate ACTIVE ky_legislators rows (same chamber + seat + name)
--
-- Typical pattern: one row has district "HD-042", another "42" — same seat, two UUIDs.
-- Safe for FKs: nothing in this schema REFERENCES ky_legislators(id); votes use LegiScan ids in JSONB.
--
-- Steps:
--   1) Run PREVIEW (losers only). Confirm counts look right.
--   2) Run PREVIEW “LegiScan id merged onto winners” — copy legiscan_id from duplicate rows onto the kept row.
--   3) Optionally BACKUP: Dashboard → Database → Backups / pg_dump.
--   4) Run FIX inside a transaction (merge LegiScan id, then deactivate losers); rollback if anything looks wrong.
--
-- Afterward: run legislator sync so remaining rows stay normalized (HD-/SD- prefixes).
--
-- If PREVIEW shows two non-null openstates_id values for the same person, stop and investigate
-- (Plural/Open States duplicate people ids) before running FIX.
-- =============================================================================

-- -----------------------------------------------------------------------------
-- PREVIEW: rows that would be set active = false (rn > 1 within duplicate groups)
-- -----------------------------------------------------------------------------
WITH enriched AS (
  SELECT
    id,
    name,
    chamber,
    district,
    (regexp_match(COALESCE(district, ''), '\d+'))[1]::integer AS district_num,
    active,
    openstates_id,
    legiscan_id,
    lrc_profile_url,
    updated_at,
    lower(trim(regexp_replace(name, '\s+', ' ', 'g'))) AS name_key,
    count(*) OVER (
      PARTITION BY
        chamber,
        (regexp_match(COALESCE(district, ''), '\d+'))[1]::integer,
        lower(trim(regexp_replace(name, '\s+', ' ', 'g')))
    ) AS grp_size,
    row_number() OVER (
      PARTITION BY
        chamber,
        (regexp_match(COALESCE(district, ''), '\d+'))[1]::integer,
        lower(trim(regexp_replace(name, '\s+', ' ', 'g')))
      ORDER BY
        (openstates_id IS NOT NULL AND trim(openstates_id) <> '') DESC,
        (lrc_profile_url IS NOT NULL AND trim(lrc_profile_url) <> '') DESC,
        (legiscan_id IS NOT NULL) DESC,
        (email IS NOT NULL AND trim(email) <> '') DESC,
        (phone IS NOT NULL AND trim(phone) <> '') DESC,
        (district ~* '^(HD-|SD-)') DESC NULLS LAST,
        updated_at DESC NULLS LAST,
        id ASC
    ) AS rn
  FROM ky_legislators
  WHERE active = true
    AND chamber IN ('house', 'senate')
    AND COALESCE(trim(district), '') <> ''
    AND (regexp_match(COALESCE(district, ''), '\d+'))[1] IS NOT NULL
)
SELECT id, name, chamber, district, openstates_id, legiscan_id, lrc_profile_url, rn, grp_size
FROM enriched
WHERE grp_size > 1 AND rn > 1
ORDER BY chamber, district_num, name_key, rn;

-- -----------------------------------------------------------------------------
-- PREVIEW: winners kept (rn = 1) for the same duplicate groups only
-- -----------------------------------------------------------------------------
WITH enriched AS (
  SELECT
    id,
    name,
    chamber,
    district,
    (regexp_match(COALESCE(district, ''), '\d+'))[1]::integer AS district_num,
    openstates_id,
    legiscan_id,
    row_number() OVER (
      PARTITION BY
        chamber,
        (regexp_match(COALESCE(district, ''), '\d+'))[1]::integer,
        lower(trim(regexp_replace(name, '\s+', ' ', 'g')))
      ORDER BY
        (openstates_id IS NOT NULL AND trim(openstates_id) <> '') DESC,
        (lrc_profile_url IS NOT NULL AND trim(lrc_profile_url) <> '') DESC,
        (legiscan_id IS NOT NULL) DESC,
        (email IS NOT NULL AND trim(email) <> '') DESC,
        (phone IS NOT NULL AND trim(phone) <> '') DESC,
        (district ~* '^(HD-|SD-)') DESC NULLS LAST,
        updated_at DESC NULLS LAST,
        id ASC
    ) AS rn,
    count(*) OVER (
      PARTITION BY
        chamber,
        (regexp_match(COALESCE(district, ''), '\d+'))[1]::integer,
        lower(trim(regexp_replace(name, '\s+', ' ', 'g')))
    ) AS grp_size
  FROM ky_legislators
  WHERE active = true
    AND chamber IN ('house', 'senate')
    AND COALESCE(trim(district), '') <> ''
    AND (regexp_match(COALESCE(district, ''), '\d+'))[1] IS NOT NULL
)
SELECT id, name, chamber, district, openstates_id, legiscan_id
FROM enriched
WHERE grp_size > 1 AND rn = 1
ORDER BY chamber, district_num, name;

-- -----------------------------------------------------------------------------
-- PREVIEW: LegiScan id merged onto winners (COALESCE(winner, MAX(group)); losers often hold LegiScan)
-- -----------------------------------------------------------------------------
WITH enriched AS (
  SELECT
    id,
    name,
    chamber,
    district,
    (regexp_match(COALESCE(district, ''), '\d+'))[1]::integer AS district_num,
    legiscan_id,
    lower(trim(regexp_replace(name, '\s+', ' ', 'g'))) AS name_key,
    count(*) OVER (
      PARTITION BY
        chamber,
        (regexp_match(COALESCE(district, ''), '\d+'))[1]::integer,
        lower(trim(regexp_replace(name, '\s+', ' ', 'g')))
    ) AS grp_size,
    row_number() OVER (
      PARTITION BY
        chamber,
        (regexp_match(COALESCE(district, ''), '\d+'))[1]::integer,
        lower(trim(regexp_replace(name, '\s+', ' ', 'g')))
      ORDER BY
        (openstates_id IS NOT NULL AND trim(openstates_id) <> '') DESC,
        (lrc_profile_url IS NOT NULL AND trim(lrc_profile_url) <> '') DESC,
        (legiscan_id IS NOT NULL) DESC,
        (email IS NOT NULL AND trim(email) <> '') DESC,
        (phone IS NOT NULL AND trim(phone) <> '') DESC,
        (district ~* '^(HD-|SD-)') DESC NULLS LAST,
        updated_at DESC NULLS LAST,
        id ASC
    ) AS rn
  FROM ky_legislators
  WHERE active = true
    AND chamber IN ('house', 'senate')
    AND COALESCE(trim(district), '') <> ''
    AND (regexp_match(COALESCE(district, ''), '\d+'))[1] IS NOT NULL
),
grp_legiscan AS (
  SELECT
    chamber,
    district_num,
    name_key,
    MAX(legiscan_id) AS merged_legiscan_id
  FROM enriched
  WHERE grp_size > 1
  GROUP BY chamber, district_num, name_key
)
SELECT
  e.id AS winner_id,
  e.name,
  e.chamber,
  e.district,
  e.legiscan_id AS legiscan_before,
  COALESCE(e.legiscan_id, g.merged_legiscan_id) AS legiscan_after
FROM enriched e
JOIN grp_legiscan g
  ON g.chamber = e.chamber
 AND g.district_num IS NOT DISTINCT FROM e.district_num
 AND g.name_key = e.name_key
WHERE e.grp_size > 1
  AND e.rn = 1
  AND COALESCE(e.legiscan_id, g.merged_legiscan_id) IS DISTINCT FROM e.legiscan_id
ORDER BY e.chamber, e.district_num, e.name;

-- =============================================================================
-- FIX (run after PREVIEW looks correct)
--
-- ky_legislators.legiscan_id is UNIQUE (23505 if you set winner = loser’s id while loser row still holds it).
-- Fix order: snapshot loser UUIDs → snapshot merged ids → NULL legiscan_id on losers → UPDATE winners → deactivate losers.
-- =============================================================================

BEGIN;

DROP TABLE IF EXISTS _ky_dedupe_loser_ids;
CREATE TEMP TABLE _ky_dedupe_loser_ids ON COMMIT DROP AS
WITH enriched AS (
  SELECT
    id,
    legiscan_id,
    chamber,
    district,
    (regexp_match(COALESCE(district, ''), '\d+'))[1]::integer AS district_num,
    lower(trim(regexp_replace(name, '\s+', ' ', 'g'))) AS name_key,
    count(*) OVER (
      PARTITION BY
        chamber,
        (regexp_match(COALESCE(district, ''), '\d+'))[1]::integer,
        lower(trim(regexp_replace(name, '\s+', ' ', 'g')))
    ) AS grp_size,
    row_number() OVER (
      PARTITION BY
        chamber,
        (regexp_match(COALESCE(district, ''), '\d+'))[1]::integer,
        lower(trim(regexp_replace(name, '\s+', ' ', 'g')))
      ORDER BY
        (openstates_id IS NOT NULL AND trim(openstates_id) <> '') DESC,
        (lrc_profile_url IS NOT NULL AND trim(lrc_profile_url) <> '') DESC,
        (legiscan_id IS NOT NULL) DESC,
        (email IS NOT NULL AND trim(email) <> '') DESC,
        (phone IS NOT NULL AND trim(phone) <> '') DESC,
        (district ~* '^(HD-|SD-)') DESC NULLS LAST,
        updated_at DESC NULLS LAST,
        id ASC
    ) AS rn
  FROM ky_legislators
  WHERE active = true
    AND chamber IN ('house', 'senate')
    AND COALESCE(trim(district), '') <> ''
    AND (regexp_match(COALESCE(district, ''), '\d+'))[1] IS NOT NULL
)
SELECT id FROM enriched WHERE grp_size > 1 AND rn > 1;

DROP TABLE IF EXISTS _ky_dedupe_legiscan_merge;
CREATE TEMP TABLE _ky_dedupe_legiscan_merge ON COMMIT DROP AS
WITH enriched AS (
  SELECT
    id,
    legiscan_id,
    chamber,
    district,
    (regexp_match(COALESCE(district, ''), '\d+'))[1]::integer AS district_num,
    lower(trim(regexp_replace(name, '\s+', ' ', 'g'))) AS name_key,
    count(*) OVER (
      PARTITION BY
        chamber,
        (regexp_match(COALESCE(district, ''), '\d+'))[1]::integer,
        lower(trim(regexp_replace(name, '\s+', ' ', 'g')))
    ) AS grp_size,
    row_number() OVER (
      PARTITION BY
        chamber,
        (regexp_match(COALESCE(district, ''), '\d+'))[1]::integer,
        lower(trim(regexp_replace(name, '\s+', ' ', 'g')))
      ORDER BY
        (openstates_id IS NOT NULL AND trim(openstates_id) <> '') DESC,
        (lrc_profile_url IS NOT NULL AND trim(lrc_profile_url) <> '') DESC,
        (legiscan_id IS NOT NULL) DESC,
        (email IS NOT NULL AND trim(email) <> '') DESC,
        (phone IS NOT NULL AND trim(phone) <> '') DESC,
        (district ~* '^(HD-|SD-)') DESC NULLS LAST,
        updated_at DESC NULLS LAST,
        id ASC
    ) AS rn
  FROM ky_legislators
  WHERE active = true
    AND chamber IN ('house', 'senate')
    AND COALESCE(trim(district), '') <> ''
    AND (regexp_match(COALESCE(district, ''), '\d+'))[1] IS NOT NULL
),
grp_legiscan AS (
  SELECT
    chamber,
    district_num,
    name_key,
    MAX(legiscan_id) AS merged_legiscan_id
  FROM enriched
  WHERE grp_size > 1
  GROUP BY chamber, district_num, name_key
)
SELECT
  e.id AS winner_id,
  COALESCE(e.legiscan_id, g.merged_legiscan_id) AS new_legiscan_id
FROM enriched e
JOIN grp_legiscan g
  ON g.chamber = e.chamber
 AND g.district_num IS NOT DISTINCT FROM e.district_num
 AND g.name_key = e.name_key
WHERE e.grp_size > 1
  AND e.rn = 1
  AND COALESCE(e.legiscan_id, g.merged_legiscan_id) IS NOT NULL;

-- 1) Clear LegiScan id on loser rows first (UNIQUE ky_legislators_legiscan_id_key)
UPDATE ky_legislators k
SET legiscan_id = NULL, updated_at = now()
FROM _ky_dedupe_loser_ids l
WHERE k.id = l.id;

-- 2) Copy merged LegiScan id onto winners (snapshot from merge temp)
UPDATE ky_legislators k
SET legiscan_id = t.new_legiscan_id, updated_at = now()
FROM _ky_dedupe_legiscan_merge t
WHERE k.id = t.winner_id
  AND k.legiscan_id IS DISTINCT FROM t.new_legiscan_id;

-- 3) Deactivate losers (same UUIDs as step 1 — do not recompute row_number after updates)
UPDATE ky_legislators k
SET active = false, updated_at = now()
FROM _ky_dedupe_loser_ids l
WHERE k.id = l.id;

COMMIT;
