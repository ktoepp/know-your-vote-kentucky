-- LegiScan official bill subjects from getBill (subject_id + subject_name), for search parity with chips.
ALTER TABLE ky_bills
  ADD COLUMN IF NOT EXISTS legiscan_subjects JSONB NOT NULL DEFAULT '[]'::jsonb;

ALTER TABLE ky_bills
  ADD COLUMN IF NOT EXISTS legiscan_subjects_search TEXT;

COMMENT ON COLUMN ky_bills.legiscan_subjects IS
  'LegiScan getBill subjects JSON array: [{subject_id, subject_name}, …]';

COMMENT ON COLUMN ky_bills.legiscan_subjects_search IS
  'Lowercase unique subject names, newline-separated — case-insensitive ilike search leg';
