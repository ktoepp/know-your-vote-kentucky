-- Per-bill view counts (detail page opens). Used for "most viewed" on the home page.

ALTER TABLE ky_bills
  ADD COLUMN IF NOT EXISTS view_count integer NOT NULL DEFAULT 0;

COMMENT ON COLUMN ky_bills.view_count IS 'Number of times the bill detail page was opened (client increment; approximate).';

CREATE INDEX IF NOT EXISTS idx_bills_view_count_last_action
  ON ky_bills (view_count DESC, last_action_date DESC);

-- Increment without granting broad UPDATE on ky_bills to anon.
CREATE OR REPLACE FUNCTION public.ky_increment_bill_view(p_bill_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF p_bill_id IS NULL THEN
    RETURN;
  END IF;
  UPDATE ky_bills
  SET
    view_count = COALESCE(view_count, 0) + 1,
    updated_at = now()
  WHERE id = p_bill_id;
END;
$$;

REVOKE ALL ON FUNCTION public.ky_increment_bill_view(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.ky_increment_bill_view(uuid) TO anon, authenticated, service_role;
