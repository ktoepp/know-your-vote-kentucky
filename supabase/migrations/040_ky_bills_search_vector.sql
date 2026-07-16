-- 040_ky_bills_search_vector.sql
-- ICP review F1/F2: multi-word searches timed out because ky_bills_plain_search computed
-- to_tsvector over six columns per row on every call. The only FTS index (idx_bills_fts,
-- title+description) never matched that expression, so the planner could not use it and
-- every search sequential-scanned the corpus. Store the vector once per row (generated
-- column), GIN-index it, and point the RPC at it. ai_summary and LegiScan subjects are
-- now part of the indexed vector, so summary-only phrasing ("school cell phones") matches.

-- array_to_string(text[], text) is only STABLE, so it can't appear in a generated-column
-- expression. With a text[] input and constant delimiter it is deterministic — safe to
-- wrap as IMMUTABLE.
CREATE OR REPLACE FUNCTION public.ky_immutable_array_to_string(arr text[], sep text)
RETURNS text
LANGUAGE sql
IMMUTABLE
PARALLEL SAFE
AS $$ SELECT array_to_string(arr, sep) $$;

ALTER TABLE public.ky_bills
  ADD COLUMN IF NOT EXISTS search_vector tsvector
  GENERATED ALWAYS AS (
    setweight(to_tsvector('english', coalesce(title, '')), 'A') ||
    setweight(to_tsvector('english', coalesce(public.ky_immutable_array_to_string(topics, ' '), '')), 'B') ||
    setweight(to_tsvector('english', coalesce(ai_summary, '')), 'B') ||
    setweight(to_tsvector('english', coalesce(description, '')), 'C') ||
    setweight(to_tsvector('english', coalesce(legiscan_subjects_search, '')), 'C') ||
    setweight(to_tsvector('english', coalesce(last_action, '') || ' ' || coalesce(session, '')), 'D')
  ) STORED;

CREATE INDEX IF NOT EXISTS idx_ky_bills_search_vector
  ON public.ky_bills USING gin (search_vector);

-- Superseded: its expression (title+description only) never matched the RPC's, so no
-- query could use it. The new GIN index above covers everything it did and more.
DROP INDEX IF EXISTS idx_bills_fts;

-- Same contract as 018 (websearch → plainto fallback, capped rows), but matching against
-- the stored vector and ranking by ts_rank instead of scanning + session ordering.
-- Backstop for pathological queries remains the platform statement_timeout on the
-- anon/authenticated roles plus the client-side 25s withTimeout on /search.
CREATE OR REPLACE FUNCTION public.ky_bills_plain_search(search_query text, max_rows int DEFAULT 500)
RETURNS SETOF ky_bills
LANGUAGE plpgsql
STABLE
SET search_path TO pg_catalog, public
AS $$
DECLARE
  trimmed text := trim(coalesce(search_query, ''));
  cap int := LEAST(GREATEST(COALESCE(max_rows, 500), 1), 1000);
  q tsquery;
  q_any tsquery;
  tok text;
  tq tsquery;
  strict_rows int := 0;
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

  -- Stopword-only input parses to an empty tsquery, which can never match.
  IF q <> ''::tsquery THEN
    RETURN QUERY
    SELECT *
    FROM ky_bills
    WHERE search_vector @@ q
    ORDER BY ts_rank(search_vector, q) DESC, session DESC NULLS LAST, last_action_date DESC NULLS LAST
    LIMIT cap;
    GET DIAGNOSTICS strict_rows = ROW_COUNT;
  END IF;

  -- All-words matching misses vocabulary gaps ("school cell phones" vs a summary that says
  -- "smartphones during the school day"). When strict matching leaves headroom, backfill with
  -- any-word matches, best-ranked first; the app's client-side scorer re-ranks the merged set
  -- with multi-token substring overlap, so partial matches surface without drowning strict hits.
  IF strict_rows >= LEAST(cap, 25) THEN
    RETURN;
  END IF;

  FOREACH tok IN ARRAY regexp_split_to_array(trimmed, '\s+') LOOP
    BEGIN
      tq := plainto_tsquery('english', tok);
    EXCEPTION WHEN OTHERS THEN
      CONTINUE;
    END;
    IF tq <> ''::tsquery THEN
      q_any := CASE WHEN q_any IS NULL THEN tq ELSE q_any || tq END;
    END IF;
  END LOOP;

  IF q_any IS NULL OR q_any = ''::tsquery OR q_any = q THEN
    RETURN;
  END IF;

  -- Rank on a narrow projection, then join back for the full rows: any-word queries can
  -- match thousands of rows, and top-N sorting ids is far cheaper than sorting whole rows.
  -- 150 candidates is plenty — the client-side scorer picks the winners from the merge.
  RETURN QUERY
  SELECT b.*
  FROM ky_bills b
  JOIN (
    SELECT id
    FROM ky_bills
    WHERE search_vector @@ q_any AND NOT (search_vector @@ q)
    ORDER BY ts_rank(search_vector, q_any) DESC, session DESC NULLS LAST, last_action_date DESC NULLS LAST
    LIMIT LEAST(GREATEST(cap - strict_rows, 0), 150)
  ) top USING (id);
END;
$$;

COMMENT ON FUNCTION public.ky_bills_plain_search(text, int) IS
  'Indexed FTS over ky_bills.search_vector (title A, topics/ai_summary B, description/LegiScan subjects C, last_action/session D): strict all-words matches ranked by ts_rank, then any-word backfill when strict results are sparse — complements parallel ilike legs in app.';

GRANT EXECUTE ON FUNCTION public.ky_bills_plain_search(text, int) TO anon, authenticated;
