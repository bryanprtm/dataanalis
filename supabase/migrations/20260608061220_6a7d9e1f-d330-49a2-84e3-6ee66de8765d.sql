
-- 1) Add ownership column to peralatan
ALTER TABLE public.peralatan
  ADD COLUMN IF NOT EXISTS created_by uuid DEFAULT auth.uid();

-- 2) Replace permissive peralatan write/delete policies
DROP POLICY IF EXISTS peralatan_insert_auth ON public.peralatan;
DROP POLICY IF EXISTS peralatan_update_auth ON public.peralatan;
DROP POLICY IF EXISTS peralatan_delete_auth ON public.peralatan;

CREATE POLICY peralatan_insert_auth ON public.peralatan
  FOR INSERT TO authenticated
  WITH CHECK (auth.uid() IS NOT NULL AND (created_by IS NULL OR created_by = auth.uid()));

CREATE POLICY peralatan_update_owner_or_admin ON public.peralatan
  FOR UPDATE TO authenticated
  USING (created_by = auth.uid() OR is_admin(auth.uid()))
  WITH CHECK (created_by = auth.uid() OR is_admin(auth.uid()));

CREATE POLICY peralatan_delete_owner_or_admin ON public.peralatan
  FOR DELETE TO authenticated
  USING (created_by = auth.uid() OR is_admin(auth.uid()));

-- 3) Restrict is_admin execution: anon cannot call it; authenticated retained for RLS use
REVOKE EXECUTE ON FUNCTION public.is_admin(uuid) FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.is_admin(uuid) FROM anon;
GRANT EXECUTE ON FUNCTION public.is_admin(uuid) TO authenticated;
