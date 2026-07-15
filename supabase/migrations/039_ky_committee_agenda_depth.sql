-- Add nesting depth to committee agenda items so the display can restore the
-- hierarchy the LRC calendar uses (grandchildren under section headers etc.).
-- Depth is derived from leading TAB count at scrape time; 0 = top-level.

ALTER TABLE ky_committee_agenda_items
  ADD COLUMN IF NOT EXISTS depth SMALLINT NOT NULL DEFAULT 0;

COMMENT ON COLUMN ky_committee_agenda_items.depth IS
  'Nesting depth in the source LRC agenda block (0 = top-level).';
