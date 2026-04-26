-- Roll-call rows where the given LegiScan people_id appears in `roll_call`, optionally for one bill session.

CREATE OR REPLACE FUNCTION get_votes_for_legislator(
  legislator_people_id text,
  p_session text DEFAULT NULL,
  max_rows int DEFAULT 150
)
RETURNS SETOF ky_votes
LANGUAGE sql
STABLE
SECURITY INVOKER
SET search_path = public
AS $$
  SELECT v.*
  FROM ky_votes v
  INNER JOIN ky_bills b ON b.id = v.bill_id
  WHERE (p_session IS NULL OR b.session = p_session)
    AND v.roll_call IS NOT NULL
    AND jsonb_typeof(v.roll_call) = 'array'
    AND EXISTS (
      SELECT 1
      FROM jsonb_array_elements(v.roll_call) AS elem
      WHERE (elem->>'legislator_id') = legislator_people_id
    )
  ORDER BY v.date DESC NULLS LAST, v.id DESC
  LIMIT GREATEST(1, LEAST(COALESCE(max_rows, 150), 500));
$$;

GRANT EXECUTE ON FUNCTION get_votes_for_legislator(text, text, int) TO anon, authenticated;

COMMENT ON FUNCTION get_votes_for_legislator IS
  'Member profile: filter ky_votes rows whose roll_call JSONB array includes this LegiScan people_id in legislator_id.';
