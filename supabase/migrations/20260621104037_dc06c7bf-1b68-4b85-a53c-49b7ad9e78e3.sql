DROP POLICY IF EXISTS personil_update_owner_or_admin ON public.personil;
DROP POLICY IF EXISTS personil_delete_owner_or_admin ON public.personil;

CREATE POLICY personil_update_owner_or_admin ON public.personil
  FOR UPDATE TO authenticated
  USING (public.is_admin(auth.uid()) OR (created_by = auth.uid()))
  WITH CHECK (public.is_admin(auth.uid()) OR (created_by = auth.uid()));

CREATE POLICY personil_delete_owner_or_admin ON public.personil
  FOR DELETE TO authenticated
  USING (public.is_admin(auth.uid()) OR (created_by = auth.uid()));