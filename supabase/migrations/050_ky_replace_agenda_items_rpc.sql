-- 050_ky_replace_agenda_items_rpc.sql
--
-- Wrap the "replace this meeting's agenda rows" step in a single Postgres
-- transaction so the sync can no longer leave a meeting with a fresh
-- `agenda_content_hash` but zero `ky_committee_agenda_items` rows.
--
-- The prior code path in ky-lrc-calendar-sync did:
--     delete where meeting_id = X
--     insert(rows)
-- as two independent PostgREST calls. A failed insert (network blip,
-- constraint violation on one row) left the delete committed and the meeting
-- silently empty on the committee page. The accuracy audit has been flagging
-- this state as "agenda_content_hash records agenda text but no
-- ky_committee_agenda_items rows are stored". A partial insert also explains
-- the sort_order-gap warnings, since `deriveAgendaItems` always emits a
-- contiguous 0..N-1 sequence.
--
-- This function performs delete + insert in one transaction. If the insert
-- fails, the delete rolls back and the previous agenda stays intact.

CREATE OR REPLACE FUNCTION public.ky_replace_committee_agenda_items(
  p_meeting_id uuid,
  p_rows jsonb
) RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  inserted_count integer;
BEGIN
  DELETE FROM ky_committee_agenda_items WHERE meeting_id = p_meeting_id;

  IF p_rows IS NULL OR jsonb_array_length(p_rows) = 0 THEN
    RETURN 0;
  END IF;

  WITH ins AS (
    INSERT INTO ky_committee_agenda_items (
      meeting_id, sort_order, raw_text, item_kind,
      bill_number, bill_session_label, ky_bill_id, depth
    )
    SELECT
      p_meeting_id,
      (r->>'sort_order')::int,
      r->>'raw_text',
      r->>'item_kind',
      NULLIF(r->>'bill_number', ''),
      NULLIF(r->>'bill_session_label', ''),
      NULLIF(r->>'ky_bill_id', '')::uuid,
      COALESCE((r->>'depth')::int, 0)
    FROM jsonb_array_elements(p_rows) AS r
    RETURNING 1
  )
  SELECT COUNT(*) INTO inserted_count FROM ins;

  RETURN inserted_count;
END;
$$;

-- The sync uses the service-role key, which bypasses RLS; no anon/authenticated
-- grants (the function mutates authoritative data, callers are server-side only).
REVOKE EXECUTE ON FUNCTION public.ky_replace_committee_agenda_items(uuid, jsonb)
  FROM PUBLIC, anon, authenticated;
