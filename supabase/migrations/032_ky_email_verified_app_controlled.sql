-- email_verified_at is app-controlled: set when the user completes /auth/verify,
-- not when Supabase auth marks email_confirmed_at (e.g. soft-auth OTP exchange).

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
    NULL
  )
  ON CONFLICT (user_id) DO UPDATE SET
    email = EXCLUDED.email,
    display_name = CASE
      WHEN EXCLUDED.display_name IS NOT NULL AND btrim(EXCLUDED.display_name) <> ''
        THEN EXCLUDED.display_name
      ELSE ky_user_profiles.display_name
    END,
    updated_at = now();

  INSERT INTO public.ky_notification_preferences (user_id)
  VALUES (NEW.id)
  ON CONFLICT (user_id) DO NOTHING;

  RETURN NEW;
END;
$$;
