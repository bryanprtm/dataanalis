DROP POLICY IF EXISTS personil_update_owner_or_admin ON public.personil;
DROP POLICY IF EXISTS personil_delete_owner_or_admin ON public.personil;

CREATE POLICY personil_update_auth ON public.personil
  FOR UPDATE TO authenticated
  USING (auth.uid() IS NOT NULL)
  WITH CHECK (auth.uid() IS NOT NULL);

CREATE POLICY personil_delete_auth ON public.personil
  FOR DELETE TO authenticated
  USING (auth.uid() IS NOT NULL);