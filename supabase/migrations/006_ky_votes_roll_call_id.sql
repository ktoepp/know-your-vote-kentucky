-- 006_ky_votes_roll_call_id.sql
-- Stop duplicate-row growth in ky_votes by persisting LegiScan's roll_call_id and
-- enforcing composite uniqueness. Additive and safely re-runnable.

-- 1. Persist the LegiScan roll_call_id on each vote row (nullable so pre-existing
--    rows without the id stay valid).
ALTER TABLE ky_votes ADD COLUMN IF NOT EXISTS roll_call_id INTEGER;

-- 2. Collapse pre-existing duplicates created by the old bare-insert writer.
--    Keep the oldest row per natural tuple (bill + date + description + tallies +
--    passed flag); delete the rest. CTE with ROW_NUMBER() makes this rerunnable
--    without dropping data.
WITH ranked AS (
  SELECT
    id,
    ROW_NUMBER() OVER (
      PARTITION BY bill_id, date, description, yea_count, nay_count, passed
      ORDER BY created_at ASC, id ASC
    ) AS rn
  FROM ky_votes
)
DELETE FROM ky_votes
WHERE id IN (SELECT id FROM ranked WHERE rn > 1);

-- 3. Partial unique index on (bill_id, roll_call_id) so new rows with a
--    LegiScan roll_call_id are deduplicated on upsert while legacy rows that
--    still have roll_call_id IS NULL are untouched.
CREATE UNIQUE INDEX IF NOT EXISTS ux_ky_votes_bill_roll_call
  ON ky_votes (bill_id, roll_call_id)
  WHERE roll_call_id IS NOT NULL;

COMMENT ON INDEX ux_ky_votes_bill_roll_call IS
  'Enforces one ky_votes row per (bill_id, LegiScan roll_call_id). Partial so legacy rows with roll_call_id IS NULL are preserved; the votes sync writer (syncKyVotes) skips rows without a roll_call_id to keep this contract.';

