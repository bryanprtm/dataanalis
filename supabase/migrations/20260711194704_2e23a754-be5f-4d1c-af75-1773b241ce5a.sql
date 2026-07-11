
-- Restrict SELECT policies to owner or admin only

DROP POLICY IF EXISTS peralatan_select_scoped ON public.peralatan;
CREATE POLICY peralatan_select_scoped ON public.peralatan
  FOR SELECT TO authenticated
  USING (is_admin(auth.uid()) OR created_by = auth.uid());

DROP POLICY IF EXISTS personil_select_scoped ON public.personil;
CREATE POLICY personil_select_scoped ON public.personil
  FOR SELECT TO authenticated
  USING (is_admin(auth.uid()) OR created_by = auth.uid());

DROP POLICY IF EXISTS profiles_select_all_auth ON public.profiles;
CREATE POLICY profiles_select_own_or_admin ON public.profiles
  FOR SELECT TO authenticated
  USING (auth.uid() = id OR is_admin(auth.uid()));
