-- Add Ballotpedia slug and LegiScan image URL to legislators table.
-- ballotpedia: populated by syncKyLegislatorBios via LegiScan getPerson.
-- legiscan_image_url: photo fallback when OpenStates photo_url is null.
ALTER TABLE ky_legislators
  ADD COLUMN IF NOT EXISTS ballotpedia text,
  ADD COLUMN IF NOT EXISTS legiscan_image_url text;
