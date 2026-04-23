-- Official title from Open States currentRole.title (e.g. State Senator, Commissioner).
ALTER TABLE ky_legislators
  ADD COLUMN IF NOT EXISTS role_title TEXT;

COMMENT ON COLUMN ky_legislators.role_title IS 'Open States currentRole.title; used when chamber is null or for display';
