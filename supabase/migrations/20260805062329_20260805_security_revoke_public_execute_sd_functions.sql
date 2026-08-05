-- REVOKE from PUBLIC (the inherited grant that gives anon access through PUBLIC role)
-- These functions are trigger-only or must not be callable directly via RPC

-- Trigger-only functions: revoke from both public and anon
REVOKE EXECUTE ON FUNCTION public.handle_new_user() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.handle_profile_updated_at() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.sync_client_name_to_profile() FROM PUBLIC, anon, authenticated;

-- Helper functions used in RLS policies (needs authenticated, not anon)
REVOKE EXECUTE ON FUNCTION public.is_admin() FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.is_staff_or_admin() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.is_admin() TO authenticated;
GRANT EXECUTE ON FUNCTION public.is_staff_or_admin() TO authenticated;

-- approve_proposal: clients need to call this via RPC, but not anon
REVOKE EXECUTE ON FUNCTION public.approve_proposal(uuid, text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.approve_proposal(uuid, text) TO authenticated;

-- get_user_client_id: internal helper, only authenticated callers
REVOKE EXECUTE ON FUNCTION public.get_user_client_id() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.get_user_client_id() TO authenticated;
