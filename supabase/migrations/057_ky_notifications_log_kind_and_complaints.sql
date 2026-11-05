-- WS7-07b: separate email kinds, record complaints.
--
-- 1. delivery_status gains 'complained' (Resend email.complained events were
--    stored as 'bounced' before this migration; existing rows are not
--    backfilled, so 'complained' exists only from deploy onward).
-- 2. kind tells the bill digest apart from the planned weekly
--    "my legislators" email, so the digest's window logic only reads its own rows.
--
-- Idempotent: safe to run more than once (scripts/apply-migration-sql.ts does
-- not track applied migrations).

DO $$
DECLARE
  con RECORD;
BEGIN
  -- Migration 019 declared the delivery_status CHECK inline, so its name was
  -- generated. Drop every CHECK on the table that mentions delivery_status,
  -- whatever it is called, then add the named four-value constraint.
  FOR con IN
    SELECT c.conname
    FROM pg_constraint c
    WHERE c.conrelid = 'public.ky_notifications_log'::regclass
      AND c.contype = 'c'
      AND pg_get_constraintdef(c.oid) ILIKE '%delivery_status%'
  LOOP
    EXECUTE format('ALTER TABLE public.ky_notifications_log DROP CONSTRAINT IF EXISTS %I', con.conname);
  END LOOP;

  ALTER TABLE public.ky_notifications_log
    ADD CONSTRAINT ky_notifications_log_delivery_status_check
    CHECK (delivery_status IN ('sent', 'failed', 'bounced', 'complained'));
END
$$;

ALTER TABLE public.ky_notifications_log
  ADD COLUMN IF NOT EXISTS kind TEXT NOT NULL DEFAULT 'bill_digest'
  CHECK (kind IN ('bill_digest', 'my_legislators'));
