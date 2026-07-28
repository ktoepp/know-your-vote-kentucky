-- Speed up member voting-record lookups so they finish under the anon 3s statement_timeout.
--
-- Symptom: member profiles (e.g. /members/josh-branscum) rendered
-- "No recorded votes found for this session yet." even though roll-call votes exist.
--
-- Cause: get_votes_for_legislator expanded roll_call JSONB per row
-- (jsonb_array_elements + EXISTS), forcing a full scan of ky_votes that grew to ~4.1s as
-- the table filled out across sessions. PostgREST runs anon requests under
-- statement_timeout=3s, so the RPC was cancelled and the app's error branch returned an
-- empty vote record. The bug scaled with data volume, so it hit long-serving members first.
--
-- Fix: index roll_call with a GIN (jsonb_path_ops) index and match membership with a
-- containment (@>) predicate, turning the per-row scan into an index lookup
-- (~4.1s -> tens of ms warm, well under the timeout). Same rows as before.

CREATE INDEX IF NOT EXISTS ky_votes_roll_call_gin
  ON ky_votes USING gin (roll_call jsonb_path_ops);

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
    -- Containment matches any roll_call array element whose legislator_id equals the given
    -- LegiScan people_id; index-backed by ky_votes_roll_call_gin (jsonb_path_ops). This is
    -- equivalent to the previous jsonb_array_elements + EXISTS test (null / non-array
    -- roll_call values simply fail the containment and are excluded, as before).
    AND v.roll_call @> jsonb_build_array(jsonb_build_object('legislator_id', legislator_people_id))
  ORDER BY v.date DESC NULLS LAST, v.id DESC
  LIMIT GREATEST(1, LEAST(COALESCE(max_rows, 150), 500));
$$;

GRANT EXECUTE ON FUNCTION get_votes_for_legislator(text, text, int) TO anon, authenticated;

COMMENT ON FUNCTION get_votes_for_legislator IS
  'Member profile: filter ky_votes rows whose roll_call JSONB array includes this LegiScan people_id in legislator_id. Index-backed via ky_votes_roll_call_gin.';
