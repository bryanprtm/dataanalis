
-- Fix storage SELECT bypass: match arsip table ownership semantics
DROP POLICY IF EXISTS "arsip read auth" ON storage.objects;
CREATE POLICY "arsip read owner or admin"
  ON storage.objects FOR SELECT
  TO authenticated
  USING (
    bucket_id = 'arsip'
    AND (owner = auth.uid() OR public.is_admin(auth.uid()))
  );

-- Fix storage SELECT bypass: match laporan table ownership semantics
DROP POLICY IF EXISTS "auth read laporan-images" ON storage.objects;
CREATE POLICY "laporan-images read owner or admin"
  ON storage.objects FOR SELECT
  TO authenticated
  USING (
    bucket_id = 'laporan-images'
    AND (owner = auth.uid() OR public.is_admin(auth.uid()))
  );

-- Restrict personil policies to authenticated only (drop public role exposure)
DROP POLICY IF EXISTS personil_select_scoped ON public.personil;
CREATE POLICY personil_select_scoped
  ON public.personil FOR SELECT
  TO authenticated
  USING (
    public.is_admin(auth.uid())
    OR public.has_role(auth.uid(), 'operator')
    OR auth.uid() IS NOT NULL
  );

DROP POLICY IF EXISTS personil_insert_auth ON public.personil;
CREATE POLICY personil_insert_auth
  ON public.personil FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() IS NOT NULL);

-- Restrict peralatan SELECT policy to authenticated only
DROP POLICY IF EXISTS peralatan_select_scoped ON public.peralatan;
CREATE POLICY peralatan_select_scoped
  ON public.peralatan FOR SELECT
  TO authenticated
  USING (
    public.is_admin(auth.uid())
    OR public.has_role(auth.uid(), 'operator')
    OR auth.uid() IS NOT NULL
  );
