-- Key/value store for sync cursors (e.g. LegiScan GA backfill position). Service role writes during sync.
CREATE TABLE IF NOT EXISTS ky_sync_state (
  key TEXT PRIMARY KEY,
  payload JSONB NOT NULL DEFAULT '{}'::jsonb,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

COMMENT ON TABLE ky_sync_state IS 'Internal sync cursors; updated by ky-sync-pipeline only';

ALTER TABLE ky_sync_state ENABLE ROW LEVEL SECURITY;
