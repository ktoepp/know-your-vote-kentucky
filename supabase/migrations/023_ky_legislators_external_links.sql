-- 023_ky_legislators_external_links.sql
-- Full-fidelity Open States `links[]` storage on ky_legislators.
--
-- Each entry preserves the canonical URL, the original Open States `note`,
-- a derived `category` (official | social | other), and the URL host so the
-- frontend can group + label without parsing every render. The existing
-- `lrc_profile_url` and `website` columns remain the primary "official"
-- surface in MemberCard; `external_links` powers grouped Social / Other
-- sections in the profile view.

ALTER TABLE public.ky_legislators
  ADD COLUMN IF NOT EXISTS external_links JSONB NOT NULL DEFAULT '[]'::jsonb;

COMMENT ON COLUMN public.ky_legislators.external_links IS
  'Array<{ url, note?, category: official|social|other, host }> sourced from Open States.';
