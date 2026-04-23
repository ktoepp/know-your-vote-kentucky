-- Official profile on legislature.ky.gov (from Open States links or parsed website).
ALTER TABLE ky_legislators
  ADD COLUMN IF NOT EXISTS lrc_profile_url TEXT;

COMMENT ON COLUMN ky_legislators.lrc_profile_url IS 'Kentucky LRC / legislature.ky.gov profile URL';
