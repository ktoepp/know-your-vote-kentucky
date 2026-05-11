-- 017_search_members_discovery.sql
-- Full-text bill search RPC, LegiScan subject suggestions for discovery chips,
-- and optional committee membership slugs on legislators (Open States roles).

-- Full-text search over bills (natural-language queries via websearch_to_tsquery).
CREATE OR REPLACE FUNCTION public.ky_bills_plain_search(search_query text, max_rows int DEFAULT 500)
RETURNS SETOF ky_bills
LANGUAGE sql
STABLE
AS $$
  SELECT *
  FROM ky_bills
  WHERE length(trim(search_query)) >= 2
    AND to_tsvector(
      'english',
      coalesce(title, '') || ' ' ||
      coalesce(description, '') || ' ' ||
      coalesce(ai_summary, '') || ' ' ||
      coalesce(last_action, '') || ' ' ||
      coalesce(session::text, '') || ' ' ||
      coalesce(array_to_string(topics, ' '), '')
    ) @@ websearch_to_tsquery('english', search_query)
  ORDER BY session DESC NULLS LAST, last_action_date DESC NULLS LAST
  LIMIT LEAST(GREATEST(COALESCE(max_rows, 500), 1), 1000);
$$;

COMMENT ON FUNCTION public.ky_bills_plain_search(text, int) IS
  'Keyword / phrase search over title, description, summary, last_action, session, topics — complements parallel ilike legs in app.';

GRANT EXECUTE ON FUNCTION public.ky_bills_plain_search(text, int) TO anon, authenticated;

-- Top LegiScan subject labels on bills (for search suggestion chips).
CREATE OR REPLACE FUNCTION public.ky_top_legiscan_subject_names(p_session text DEFAULT NULL, p_limit int DEFAULT 20)
RETURNS TABLE(subject_name text, bill_count bigint)
LANGUAGE sql
STABLE
AS $$
  SELECT
    elem->>'subject_name' AS subject_name,
    COUNT(*)::bigint AS bill_count
  FROM ky_bills b,
       jsonb_array_elements(b.legiscan_subjects) AS elem
  WHERE jsonb_array_length(b.legiscan_subjects) > 0
    AND elem ? 'subject_name'
    AND length(trim(elem->>'subject_name')) > 1
    AND (p_session IS NULL OR trim(b.session) = trim(p_session))
  GROUP BY elem->>'subject_name'
  ORDER BY bill_count DESC, subject_name ASC
  LIMIT LEAST(GREATEST(COALESCE(p_limit, 20), 1), 100);
$$;

COMMENT ON FUNCTION public.ky_top_legiscan_subject_names(text, int) IS
  'Distinct LegiScan subject_name values weighted by bill count for discovery chips (optional session filter).';

GRANT EXECUTE ON FUNCTION public.ky_top_legiscan_subject_names(text, int) TO anon, authenticated;

-- Committee assignment slugs (Open States Popolo roles → committeeSlug-style tokens).
ALTER TABLE ky_legislators
  ADD COLUMN IF NOT EXISTS committee_memberships TEXT[] NOT NULL DEFAULT '{}'::text[];

COMMENT ON COLUMN ky_legislators.committee_memberships IS
  'Slug tokens aligned with committeeSlugFromName / browse filters; from Open States roles when present.';

CREATE INDEX IF NOT EXISTS idx_ky_legislators_committee_memberships_gin
  ON ky_legislators USING gin (committee_memberships);
