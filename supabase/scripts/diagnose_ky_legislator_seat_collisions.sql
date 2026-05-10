-- =============================================================================
-- KY legislators: duplicate ACTIVE rows claiming the same chamber + seat
-- Mirrors app logic (first integer in `district` = seat number). Run in Supabase SQL Editor.
--
-- If a name search shows two rows for ONE person with districts `42` vs `HD-042`,
-- that is still ONE seat (42). Queries (1) and (2) group those as house / district_num 42.
-- =============================================================================

-- 1) Summary: seats where more than one ACTIVE legislator shares chamber + district number
WITH seat_norm AS (
  SELECT
    id,
    name,
    first_name,
    last_name,
    chamber,
    district,
    (regexp_match(COALESCE(district, ''), '\d+'))[1]::integer AS district_num,
    active,
    openstates_id,
    legiscan_id,
    lrc_profile_url,
    website
  FROM ky_legislators
  WHERE active = true
    AND chamber IN ('house', 'senate')
    AND COALESCE(trim(district), '') <> ''
)
SELECT
  chamber,
  district_num,
  COUNT(*) AS active_member_count,
  array_agg(name ORDER BY name) AS names,
  array_agg(id::text ORDER BY name) AS ids
FROM seat_norm
WHERE district_num IS NOT NULL
GROUP BY chamber, district_num
HAVING COUNT(*) > 1
ORDER BY chamber, district_num;

-- -----------------------------------------------------------------------------
-- 2) Full rows for every ACTIVE member in a conflicting seat (join back for cleanup)
-- -----------------------------------------------------------------------------
WITH seat_norm AS (
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
    website,
    party,
    role_title,
    updated_at
  FROM ky_legislators
  WHERE active = true
    AND chamber IN ('house', 'senate')
    AND COALESCE(trim(district), '') <> ''
),
collisions AS (
  SELECT chamber, district_num
  FROM seat_norm
  WHERE district_num IS NOT NULL
  GROUP BY chamber, district_num
  HAVING COUNT(*) > 1
)
SELECT s.*
FROM seat_norm s
JOIN collisions c
  ON c.chamber = s.chamber AND c.district_num = s.district_num
ORDER BY s.chamber, s.district_num, s.name;

-- -----------------------------------------------------------------------------
-- 3) Quick lookup by name — edit ILIKE (e.g. '%watkins%', '%atkins%').
-- -----------------------------------------------------------------------------
SELECT
  id,
  name,
  chamber,
  district,
  active,
  openstates_id,
  legiscan_id,
  lrc_profile_url,
  website,
  updated_at
FROM ky_legislators
WHERE name ILIKE '%watkins%'
ORDER BY active DESC, name;

-- -----------------------------------------------------------------------------
-- 4) Same display-name AND same chamber + numeric seat (duplicate UUIDs for one legislator)
-- -----------------------------------------------------------------------------
WITH seat_norm AS (
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
    updated_at
  FROM ky_legislators
  WHERE active = true
    AND chamber IN ('house', 'senate')
    AND COALESCE(trim(district), '') <> ''
)
SELECT *
FROM seat_norm s
WHERE EXISTS (
  SELECT 1
  FROM seat_norm o
  WHERE o.chamber = s.chamber
    AND o.district_num IS NOT DISTINCT FROM s.district_num
    AND o.id <> s.id
    AND lower(trim(regexp_replace(o.name, '\s+', ' ', 'g'))) = lower(trim(regexp_replace(s.name, '\s+', ' ', 'g')))
)
ORDER BY lower(trim(name)), chamber, district_num;

-- =============================================================================
-- FIX — Joshua Watkins example (House seat 42): compare UUIDs, keep Open States row.
-- Uncomment SELECT; then uncomment UPDATE for the stale id only.
-- =============================================================================
-- SELECT id, district, openstates_id, legiscan_id, lrc_profile_url, updated_at
-- FROM ky_legislators
-- WHERE id IN (
--   'e1881df3-47e7-43b1-a295-ec0a94f29ae0'::uuid,
--   'a15572d6-bc6c-43d7-bd6f-1010f4800035'::uuid
-- );

/*
UPDATE ky_legislators
SET active = false, updated_at = now()
WHERE id = '<paste-stale-uuid>'::uuid;
*/

-- -----------------------------------------------------------------------------
-- Many duplicates (same name + seat, "98" vs "HD-098") → bulk deactivate losers:
--   supabase/scripts/dedupe_ky_legislators_active.sql
-- -----------------------------------------------------------------------------
