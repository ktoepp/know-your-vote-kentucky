-- 010_ky_votes_unique_constraint.sql
-- Replace the partial unique index on ky_votes with a non-partial one so that
-- Postgres accepts ON CONFLICT (bill_id, roll_call_id) in upsert statements.
--
-- Why safe: PostgreSQL treats NULLs as distinct in unique indexes, so rows with
-- roll_call_id IS NULL can coexist without violating uniqueness — the same
-- semantics the partial index was enforcing, just compatible with ON CONFLICT.

DROP INDEX IF EXISTS ux_ky_votes_bill_roll_call;

CREATE UNIQUE INDEX IF NOT EXISTS ux_ky_votes_bill_roll_call
  ON ky_votes (bill_id, roll_call_id);

COMMENT ON INDEX ux_ky_votes_bill_roll_call IS
  'Enforces one ky_votes row per (bill_id, roll_call_id). NULLs are distinct so '
  'legacy rows without a roll_call_id coexist safely. Non-partial so ON CONFLICT '
  '(bill_id, roll_call_id) works in upsert writers.';
