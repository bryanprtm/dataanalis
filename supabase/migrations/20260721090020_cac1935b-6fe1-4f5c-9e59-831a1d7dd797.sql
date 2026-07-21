
DROP POLICY IF EXISTS personil_update_auth ON public.personil;
DROP POLICY IF EXISTS personil_delete_auth ON public.personil;
DROP POLICY IF EXISTS personil_insert_auth ON public.personil;
DROP POLICY IF EXISTS peralatan_update_auth ON public.peralatan;
DROP POLICY IF EXISTS peralatan_delete_auth ON public.peralatan;
DROP POLICY IF EXISTS peralatan_insert_auth ON public.peralatan;

CREATE POLICY personil_insert_auth ON public.personil FOR INSERT TO authenticated
  WITH CHECK (created_by = auth.uid() OR public.is_admin(auth.uid()));
CREATE POLICY personil_update_auth ON public.personil FOR UPDATE TO authenticated
  USING (created_by = auth.uid() OR public.is_admin(auth.uid()))
  WITH CHECK (created_by = auth.uid() OR public.is_admin(auth.uid()));
CREATE POLICY personil_delete_auth ON public.personil FOR DELETE TO authenticated
  USING (created_by = auth.uid() OR public.is_admin(auth.uid()));

CREATE POLICY peralatan_insert_auth ON public.peralatan FOR INSERT TO authenticated
  WITH CHECK (created_by = auth.uid() OR public.is_admin(auth.uid()));
CREATE POLICY peralatan_update_auth ON public.peralatan FOR UPDATE TO authenticated
  USING (created_by = auth.uid() OR public.is_admin(auth.uid()))
  WITH CHECK (created_by = auth.uid() OR public.is_admin(auth.uid()));
CREATE POLICY peralatan_delete_auth ON public.peralatan FOR DELETE TO authenticated
  USING (created_by = auth.uid() OR public.is_admin(auth.uid()));
