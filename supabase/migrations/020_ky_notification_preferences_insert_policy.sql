-- Allow authenticated users to insert their own notification preferences row
-- when missing (e.g. race before auth trigger, or legacy DB without backfill).

CREATE POLICY "Users can insert own preferences"
  ON public.ky_notification_preferences
  FOR INSERT
  TO authenticated
  WITH CHECK ((SELECT auth.uid()) = user_id);
