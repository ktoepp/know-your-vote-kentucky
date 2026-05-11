-- 016_ky_user_profiles.sql
-- App profiles keyed to Supabase Auth (Follow Bills M1). Trigger keeps email / verification / signup metadata in sync.

CREATE TABLE public.ky_user_profiles (
  user_id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  display_name TEXT,
  email TEXT NOT NULL,
  email_verified_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_ky_user_profiles_email_lower ON public.ky_user_profiles (lower(email));

ALTER TABLE public.ky_user_profiles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can select own profile"
  ON public.ky_user_profiles
  FOR SELECT
  TO authenticated
  USING ((SELECT auth.uid()) = user_id);

CREATE POLICY "Users can update own profile"
  ON public.ky_user_profiles
  FOR UPDATE
  TO authenticated
  USING ((SELECT auth.uid()) = user_id)
  WITH CHECK ((SELECT auth.uid()) = user_id);

CREATE OR REPLACE FUNCTION public.ky_user_profiles_touch_updated_at()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

CREATE TRIGGER ky_user_profiles_set_updated_at
  BEFORE UPDATE ON public.ky_user_profiles
  FOR EACH ROW
  EXECUTE FUNCTION public.ky_user_profiles_touch_updated_at();

CREATE OR REPLACE FUNCTION public.ky_sync_profile_from_auth_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  meta_name TEXT := NULLIF(TRIM(COALESCE(NEW.raw_user_meta_data->>'full_name', '')), '');
BEGIN
  INSERT INTO public.ky_user_profiles (user_id, display_name, email, email_verified_at)
  VALUES (
    NEW.id,
    meta_name,
    COALESCE(NEW.email, ''),
    NEW.email_confirmed_at
  )
  ON CONFLICT (user_id) DO UPDATE SET
    email = EXCLUDED.email,
    email_verified_at = EXCLUDED.email_verified_at,
    display_name = CASE
      WHEN EXCLUDED.display_name IS NOT NULL AND btrim(EXCLUDED.display_name) <> ''
        THEN EXCLUDED.display_name
      ELSE ky_user_profiles.display_name
    END,
    updated_at = now();
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS on_auth_user_created_sync_ky_profile ON auth.users;
CREATE TRIGGER on_auth_user_created_sync_ky_profile
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.ky_sync_profile_from_auth_user();

DROP TRIGGER IF EXISTS on_auth_user_updated_sync_ky_profile ON auth.users;
CREATE TRIGGER on_auth_user_updated_sync_ky_profile
  AFTER UPDATE ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.ky_sync_profile_from_auth_user();

INSERT INTO public.ky_user_profiles (user_id, display_name, email, email_verified_at)
SELECT
  id,
  NULLIF(TRIM(COALESCE(raw_user_meta_data->>'full_name', '')), ''),
  COALESCE(email, ''),
  email_confirmed_at
FROM auth.users
ON CONFLICT (user_id) DO NOTHING;
