-- Primary committee from LegiScan getBill (per-bill, not a full committee directory).

ALTER TABLE ky_bills ADD COLUMN IF NOT EXISTS committee_legiscan_id INTEGER;
ALTER TABLE ky_bills ADD COLUMN IF NOT EXISTS committee_name TEXT;

CREATE INDEX IF NOT EXISTS idx_ky_bills_committee_name_lower
  ON ky_bills (lower(committee_name))
  WHERE committee_name IS NOT NULL;

COMMENT ON COLUMN ky_bills.committee_legiscan_id IS 'LegiScan committee_id from getBill when present.';
COMMENT ON COLUMN ky_bills.committee_name IS 'LegiScan primary committee name from getBill.';

-- Distinct committee labels for search/browse filter dropdowns (cheap; row count ~ session scale).
CREATE OR REPLACE FUNCTION ky_distinct_bill_committees()
RETURNS SETOF TEXT
LANGUAGE sql
STABLE
SECURITY INVOKER
SET search_path = public
AS $$
  SELECT DISTINCT TRIM(b.committee_name)::text
  FROM ky_bills b
  WHERE b.committee_name IS NOT NULL AND TRIM(b.committee_name) <> ''
  ORDER BY 1;
$$;

GRANT EXECUTE ON FUNCTION ky_distinct_bill_committees() TO anon, authenticated;

COMMENT ON FUNCTION ky_distinct_bill_committees IS
  'Returns sorted distinct committee_name values on ky_bills for filter UIs.';
