
-- PERALATAN: restrict SELECT for operator to own rows
DROP POLICY IF EXISTS peralatan_select_all ON public.peralatan;
CREATE POLICY peralatan_select_scoped ON public.peralatan FOR SELECT
USING (
  public.is_admin(auth.uid())
  OR (public.has_role(auth.uid(), 'operator') AND created_by = auth.uid())
  OR (NOT public.has_role(auth.uid(), 'operator') AND auth.uid() IS NOT NULL)
);

-- PERSONIL: ensure created_by exists for ownership scoping
ALTER TABLE public.personil ADD COLUMN IF NOT EXISTS created_by uuid REFERENCES auth.users(id);

-- Replace SELECT policy
DROP POLICY IF EXISTS personil_select_auth ON public.personil;
CREATE POLICY personil_select_scoped ON public.personil FOR SELECT
USING (
  public.is_admin(auth.uid())
  OR (public.has_role(auth.uid(), 'operator') AND created_by = auth.uid())
  OR (NOT public.has_role(auth.uid(), 'operator') AND auth.uid() IS NOT NULL)
);

-- Allow operator to insert their own personil rows
DROP POLICY IF EXISTS personil_insert_admin ON public.personil;
CREATE POLICY personil_insert_auth ON public.personil FOR INSERT
WITH CHECK (
  auth.uid() IS NOT NULL
  AND (public.is_admin(auth.uid()) OR created_by = auth.uid())
);

-- Allow operator to update/delete own rows; admin all
DROP POLICY IF EXISTS personil_update_admin ON public.personil;
CREATE POLICY personil_update_owner_or_admin ON public.personil FOR UPDATE
USING (public.is_admin(auth.uid()) OR created_by = auth.uid())
WITH CHECK (public.is_admin(auth.uid()) OR created_by = auth.uid());

DROP POLICY IF EXISTS personil_delete_admin ON public.personil;
CREATE POLICY personil_delete_owner_or_admin ON public.personil FOR DELETE
USING (public.is_admin(auth.uid()) OR created_by = auth.uid());
