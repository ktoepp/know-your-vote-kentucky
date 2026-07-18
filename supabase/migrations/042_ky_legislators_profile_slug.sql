-- 042_ky_legislators_profile_slug.sql
-- Canonical, collision-safe URL slug for /members/[slug].
--
-- Base slug mirrors memberSlug() in src/lib/ky-member-utils.ts (lowercase, non-alphanumeric
-- runs -> '-', trimmed), so URLs and card anchors are unchanged for every non-colliding name.
-- When the same base slug is used by rows in MORE THAN ONE seat (different chamber/district —
-- i.e. genuinely different people), every row in the group with a district gets a district
-- suffix (e.g. jane-smith-hd-5). Rows for the SAME person/seat (LegiScan-seeded + Open States
-- duplicate rows) intentionally SHARE a slug — profile lookup dedupes and picks the richer row —
-- so the index is non-unique by design.
--
-- App code is fallback-safe before this migration is applied (selects retry without the
-- column; lookup falls back to name matching), so deploy order does not matter. The
-- legislator sync (sync:ky:legislators) maintains the column for current members going
-- forward; this backfill covers historical rows.

ALTER TABLE ky_legislators ADD COLUMN IF NOT EXISTS profile_slug text;

-- 1) Base slug from display name (id as last resort, matching memberSlug(leg.name || leg.id)).
UPDATE ky_legislators
SET profile_slug = NULLIF(
  trim(both '-' from regexp_replace(lower(coalesce(NULLIF(name, ''), id::text)), '[^a-z0-9]+', '-', 'g')),
  ''
);

-- 2) Collision resolution: a base shared across more than one distinct seat gets the
--    district suffix on every districted row in the group.
WITH conflicted AS (
  SELECT profile_slug
  FROM ky_legislators
  WHERE profile_slug IS NOT NULL
  GROUP BY profile_slug
  HAVING count(DISTINCT coalesce(chamber || ':' || district, id::text)) > 1
)
UPDATE ky_legislators l
SET profile_slug = l.profile_slug || '-' ||
  trim(both '-' from regexp_replace(lower(l.district), '[^a-z0-9]+', '-', 'g'))
FROM conflicted c
WHERE l.profile_slug = c.profile_slug
  AND l.district IS NOT NULL
  AND l.district <> '';

CREATE INDEX IF NOT EXISTS idx_ky_legislators_profile_slug
  ON ky_legislators (profile_slug);
