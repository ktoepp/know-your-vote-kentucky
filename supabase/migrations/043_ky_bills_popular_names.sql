-- 043_ky_bills_popular_names.sql
-- Popular / colloquial names for bills. Two classes, kept separate because they carry
-- different provenance and neutrality risk (see docs/specs/bill-popular-names.md):
--   * official_short_titles  — from the LRC "Short Titles and Popular Names" list.
--                              Neutral, official, sourceable (e.g. "Safer Kentucky Act").
--   * editorial_popular_names — human-curated media / advocacy names in no official list
--                              (e.g. "the bathroom bill"). The editorial gate is the
--                              neutrality control; never auto-harvested.
-- Both feed full-text search at weight B (same tier as topics / ai_summary) so users can
-- find a bill by whatever name they know. Display rules differ (official everywhere;
-- editorial only on the bill page + search matching) and live in the app, not the schema.

ALTER TABLE public.ky_bills
  ADD COLUMN IF NOT EXISTS official_short_titles text[],
  ADD COLUMN IF NOT EXISTS editorial_popular_names text[];

COMMENT ON COLUMN public.ky_bills.official_short_titles IS
  'LRC "Short Titles and Popular Names" list values, synced from apps.legislature.ky.gov (source lrc-popular-names). Neutral/official.';
COMMENT ON COLUMN public.ky_bills.editorial_popular_names IS
  'Editor-curated media/advocacy names (scripts/set-bill-popular-name.ts). Matched in search, shown as "Also called" on the bill page only.';

-- search_vector is a generated column referencing these arrays, so it must be dropped and
-- recreated to fold them in (a generated expression cannot be ALTERed in place). Dropping
-- the column also drops its GIN index; both are rebuilt below. Mirrors migration 040.
DROP INDEX IF EXISTS idx_ky_bills_search_vector;
ALTER TABLE public.ky_bills DROP COLUMN IF EXISTS search_vector;

ALTER TABLE public.ky_bills
  ADD COLUMN search_vector tsvector
  GENERATED ALWAYS AS (
    setweight(to_tsvector('english', coalesce(title, '')), 'A') ||
    setweight(to_tsvector('english', coalesce(public.ky_immutable_array_to_string(topics, ' '), '')), 'B') ||
    setweight(to_tsvector('english', coalesce(ai_summary, '')), 'B') ||
    setweight(to_tsvector('english', coalesce(public.ky_immutable_array_to_string(official_short_titles, ' '), '')), 'B') ||
    setweight(to_tsvector('english', coalesce(public.ky_immutable_array_to_string(editorial_popular_names, ' '), '')), 'B') ||
    setweight(to_tsvector('english', coalesce(description, '')), 'C') ||
    setweight(to_tsvector('english', coalesce(legiscan_subjects_search, '')), 'C') ||
    setweight(to_tsvector('english', coalesce(last_action, '') || ' ' || coalesce(session, '')), 'D')
  ) STORED;

CREATE INDEX IF NOT EXISTS idx_ky_bills_search_vector
  ON public.ky_bills USING gin (search_vector);
