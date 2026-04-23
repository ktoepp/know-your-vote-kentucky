-- 007_ky_legiscan_hashes.sql
-- Additive schema for quota-aware LegiScan sync. See LegiScan plan §4.1
-- (workspace note: plan-create/know-your-vote-kentucky) for the full rationale.
-- No writers target these columns yet; subsequent tasks (2c.2, 2c.3) will wire
-- them in. Re-runnable: every statement uses IF NOT EXISTS.

-- 1. Per-bill change tracking so the sync pipeline can skip unchanged bills
--    instead of burning LegiScan quota on getBill calls.
ALTER TABLE ky_bills ADD COLUMN IF NOT EXISTS change_hash TEXT;
ALTER TABLE ky_bills ADD COLUMN IF NOT EXISTS legiscan_session_id INTEGER;
ALTER TABLE ky_bills ADD COLUMN IF NOT EXISTS updated_from_legiscan_at TIMESTAMPTZ;

-- 2. Dataset-hash ledger so we only re-import a LegiScan session dataset when
--    its hash changes. Service-role only; no public policy.
CREATE TABLE IF NOT EXISTS ky_legiscan_datasets (
  session_id INTEGER PRIMARY KEY,
  dataset_hash TEXT NOT NULL,
  access_key TEXT,
  last_imported_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE ky_legiscan_datasets ENABLE ROW LEVEL SECURITY;

-- 3. Lookup index for the hash-diff path in the sync pipeline.
CREATE INDEX IF NOT EXISTS idx_ky_bills_change_hash
  ON ky_bills (legiscan_id, change_hash);

