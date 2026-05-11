-- 018_ky_bills_plain_search_hardening.sql
-- ky_bills_plain_search used LANGUAGE sql with websearch_to_tsquery directly in the WHERE clause.
-- Odd inputs (quotes/operators the websearch parser rejects, edge UTF-8, etc.) raise in Postgres and
-- PostgREST returns HTTP 500. Parse in PL/pgSQL with plainto_tsquery fallback so the RPC stays stable.

CREATE OR REPLACE FUNCTION public.ky_bills_plain_search(search_query text, max_rows int DEFAULT 500)
RETURNS SETOF ky_bills
LANGUAGE plpgsql
STABLE
SET search_path TO pg_catalog, public
AS $$
DECLARE
  trimmed text := trim(coalesce(search_query, ''));
  q tsquery;
BEGIN
  IF length(trimmed) < 2 THEN
    RETURN;
  END IF;

  BEGIN
    q := websearch_to_tsquery('english', trimmed);
  EXCEPTION WHEN OTHERS THEN
    BEGIN
      q := plainto_tsquery('english', trimmed);
    EXCEPTION WHEN OTHERS THEN
      RETURN;
    END;
  END;

  RETURN QUERY
  SELECT *
  FROM ky_bills
  WHERE to_tsvector(
      'english',
      coalesce(title, '') || ' ' ||
      coalesce(description, '') || ' ' ||
      coalesce(ai_summary, '') || ' ' ||
      coalesce(last_action, '') || ' ' ||
      coalesce(session::text, '') || ' ' ||
      coalesce(array_to_string(topics, ' '), '')
    ) @@ q
  ORDER BY session DESC NULLS LAST, last_action_date DESC NULLS LAST
  LIMIT LEAST(GREATEST(COALESCE(max_rows, 500), 1), 1000);
END;
$$;

COMMENT ON FUNCTION public.ky_bills_plain_search(text, int) IS
  'Keyword / phrase search over title, description, summary, last_action, session, topics — complements parallel ilike legs in app.';

GRANT EXECUTE ON FUNCTION public.ky_bills_plain_search(text, int) TO anon, authenticated;
