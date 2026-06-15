
-- 1) Allow users to delete their own notifications
CREATE POLICY notif_delete_own ON public.notifikasi
  FOR DELETE TO authenticated
  USING (user_id = auth.uid());

-- 2) Require created_by = auth.uid() on peralatan insert
DROP POLICY IF EXISTS peralatan_insert_auth ON public.peralatan;
CREATE POLICY peralatan_insert_auth ON public.peralatan
  FOR INSERT TO authenticated
  WITH CHECK (created_by = auth.uid());

-- 3) Add WITH CHECK to profiles_update_own
DROP POLICY IF EXISTS profiles_update_own ON public.profiles;
CREATE POLICY profiles_update_own ON public.profiles
  FOR UPDATE TO authenticated
  USING (auth.uid() = id)
  WITH CHECK (auth.uid() = id);

-- 4) Revoke EXECUTE on SECURITY DEFINER has_role from anon
REVOKE EXECUTE ON FUNCTION public.has_role(uuid, public.app_role) FROM anon, PUBLIC;
GRANT EXECUTE ON FUNCTION public.has_role(uuid, public.app_role) TO authenticated, service_role;
