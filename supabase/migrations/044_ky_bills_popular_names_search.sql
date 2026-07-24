-- 044_ky_bills_popular_names_search.sql
-- Normalization-tolerant matching for popular / colloquial names (docs/specs/bill-popular-names.md).
--
-- Full-text search can't retrieve punctuation-heavy names: to_tsvector drops "C.R.O.W.N. Act",
-- "J.E. Jones …", "M.O.L.D Act" into tokens that a plain "crown act" / "je jones" query never
-- matches. We add a generated column that strips EVERY non-alphanumeric (punctuation AND spaces)
-- and lowercases, so both "C.R.O.W.N. Act" → "crownact" and "Phone-Down Kentucky Act" →
-- "phonedownkentuckyact" match a query normalized the same way — space- and punctuation-
-- insensitive by construction. A trigram index over it adds light spelling tolerance.

CREATE EXTENSION IF NOT EXISTS pg_trgm;

-- regexp_replace / lower are IMMUTABLE; ky_immutable_array_to_string (migration 040) wraps the
-- only STABLE piece, so the whole expression is valid in a generated column.
ALTER TABLE public.ky_bills
  ADD COLUMN IF NOT EXISTS popular_names_search text
  GENERATED ALWAYS AS (
    regexp_replace(
      lower(
        coalesce(public.ky_immutable_array_to_string(official_short_titles, ' '), '') || ' ' ||
        coalesce(public.ky_immutable_array_to_string(editorial_popular_names, ' '), '')
      ),
      '[^a-z0-9]', '', 'g'
    )
  ) STORED;

CREATE INDEX IF NOT EXISTS idx_ky_bills_popular_names_trgm
  ON public.ky_bills USING gin (popular_names_search gin_trgm_ops);

-- Retrieval leg for the app: normalize the query the same way, match by substring (exact,
-- punctuation/space-insensitive) OR trigram similarity (misspellings). Empty normalized names
-- (the common case) are skipped via the partial predicate on `<> ''`. The app's client-side
-- scorer re-ranks the merged set, so ordering here only needs to be good enough to cap sanely.
CREATE OR REPLACE FUNCTION public.ky_bills_popular_name_search(search_query text, max_rows int DEFAULT 50)
RETURNS SETOF ky_bills
LANGUAGE sql
STABLE
SET search_path TO pg_catalog, public
AS $$
  WITH norm AS (
    SELECT regexp_replace(lower(coalesce(search_query, '')), '[^a-z0-9]', '', 'g') AS q
  )
  SELECT b.*
  FROM ky_bills b, norm
  WHERE norm.q <> ''
    AND b.popular_names_search <> ''
    AND (b.popular_names_search LIKE '%' || norm.q || '%' OR b.popular_names_search % norm.q)
  ORDER BY similarity(b.popular_names_search, norm.q) DESC, b.session DESC NULLS LAST
  LIMIT LEAST(GREATEST(COALESCE(max_rows, 50), 1), 200);
$$;

COMMENT ON FUNCTION public.ky_bills_popular_name_search(text, int) IS
  'Punctuation/space-insensitive + trigram-fuzzy retrieval over ky_bills popular names (official_short_titles + editorial_popular_names via popular_names_search). Supplements ky_bills_plain_search; app re-ranks.';

GRANT EXECUTE ON FUNCTION public.ky_bills_popular_name_search(text, int) TO anon, authenticated;
