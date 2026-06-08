
-- laporan: allow owner delete
DROP POLICY IF EXISTS laporan_delete_admin ON public.laporan;
CREATE POLICY laporan_delete_owner_or_admin ON public.laporan FOR DELETE TO authenticated
  USING ((auth.uid() = created_by) OR public.is_admin(auth.uid()));

-- kegiatan: allow owner delete
DROP POLICY IF EXISTS kegiatan_delete_admin ON public.kegiatan;
CREATE POLICY kegiatan_delete_owner_or_admin ON public.kegiatan FOR DELETE TO authenticated
  USING ((auth.uid() = created_by) OR public.is_admin(auth.uid()));

-- arsip: allow owner delete
DROP POLICY IF EXISTS arsip_delete_admin ON public.arsip;
CREATE POLICY arsip_delete_owner_or_admin ON public.arsip FOR DELETE TO authenticated
  USING ((auth.uid() = uploaded_by) OR public.is_admin(auth.uid()));

-- peralatan: allow all authenticated users full CRUD
DROP POLICY IF EXISTS peralatan_write_admin ON public.peralatan;
DROP POLICY IF EXISTS peralatan_update_admin ON public.peralatan;
DROP POLICY IF EXISTS peralatan_delete_admin ON public.peralatan;
CREATE POLICY peralatan_insert_auth ON public.peralatan FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY peralatan_update_auth ON public.peralatan FOR UPDATE TO authenticated USING (true);
CREATE POLICY peralatan_delete_auth ON public.peralatan FOR DELETE TO authenticated USING (true);
