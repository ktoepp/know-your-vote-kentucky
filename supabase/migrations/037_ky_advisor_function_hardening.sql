-- 037_ky_advisor_function_hardening.sql
-- Clears Supabase security advisor warnings (2026-07-04 run):
--
-- 1. function_search_path_mutable — pin search_path on the five functions created
--    without one. Bodies reference public tables unqualified, so pin to `public`
--    (matching ky_increment_bill_view / ky_sync_profile_from_auth_user, which were
--    already pinned at creation).
--
-- 2. anon/authenticated_security_definer_function_executable — revoke RPC EXECUTE on
--    SECURITY DEFINER functions that are not public API:
--    - ky_sync_profile_from_auth_user: fired by triggers on auth.users only; trigger
--      execution does not require the caller to hold EXECUTE, so revoking only closes
--      the /rest/v1/rpc/ path.
--    - rls_auto_enable: event-trigger function (ensure_rls, dashboard-created, not in
--      repo). Returns event_trigger so PostgREST can't genuinely run it; revoke anyway
--      to clear the advisor finding.
--    ky_increment_bill_view stays anon-executable BY DESIGN: the bill detail page
--    increments view_count from the browser client (BillDetailView) and the definer
--    wrapper exists precisely to avoid granting UPDATE on ky_bills to anon.
--
-- (Third advisor item, auth_leaked_password_protection, is a dashboard/Auth setting —
-- not addressable in SQL.)

ALTER FUNCTION public.ky_rate_limit_consume(text, double precision, double precision)
  SET search_path = public;
ALTER FUNCTION public.ky_increment_counter(text, text)
  SET search_path = public;
ALTER FUNCTION public.ky_top_legiscan_subject_names(text, integer)
  SET search_path = public;
ALTER FUNCTION public.ky_user_profiles_touch_updated_at()
  SET search_path = public;
ALTER FUNCTION public.ky_notification_preferences_touch_updated_at()
  SET search_path = public;

REVOKE EXECUTE ON FUNCTION public.ky_sync_profile_from_auth_user()
  FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.rls_auto_enable()
  FROM PUBLIC, anon, authenticated;
