
-- Laporan
DROP POLICY IF EXISTS laporan_select_all_auth ON public.laporan;
CREATE POLICY laporan_select_owner_or_admin ON public.laporan
  FOR SELECT TO authenticated
  USING (auth.uid() = created_by OR public.is_admin(auth.uid()));

-- Kegiatan
DROP POLICY IF EXISTS kegiatan_select_all ON public.kegiatan;
CREATE POLICY kegiatan_select_owner_or_admin ON public.kegiatan
  FOR SELECT TO authenticated
  USING (auth.uid() = created_by OR public.is_admin(auth.uid()));

-- Arsip
DROP POLICY IF EXISTS arsip_select_all ON public.arsip;
CREATE POLICY arsip_select_owner_or_admin ON public.arsip
  FOR SELECT TO authenticated
  USING (auth.uid() = uploaded_by OR public.is_admin(auth.uid()));

-- Generated reports
DROP POLICY IF EXISTS reports_select_all ON public.generated_reports;
CREATE POLICY reports_select_owner_or_admin ON public.generated_reports
  FOR SELECT TO authenticated
  USING (auth.uid() = created_by OR public.is_admin(auth.uid()));

-- AI Analyses (scoped via owning laporan)
DROP POLICY IF EXISTS ai_analyses_all_auth ON public.ai_analyses;
CREATE POLICY ai_analyses_select_owner_or_admin ON public.ai_analyses
  FOR SELECT TO authenticated
  USING (
    public.is_admin(auth.uid())
    OR EXISTS (
      SELECT 1 FROM public.laporan l
      WHERE l.id = ai_analyses.laporan_id AND l.created_by = auth.uid()
    )
  );

-- User roles: admins can see all
CREATE POLICY user_roles_select_admin ON public.user_roles
  FOR SELECT TO authenticated
  USING (public.is_admin(auth.uid()));

-- User roles: admins can manage all
CREATE POLICY user_roles_insert_admin ON public.user_roles
  FOR INSERT TO authenticated
  WITH CHECK (public.is_admin(auth.uid()));

CREATE POLICY user_roles_update_admin ON public.user_roles
  FOR UPDATE TO authenticated
  USING (public.is_admin(auth.uid()))
  WITH CHECK (public.is_admin(auth.uid()));

CREATE POLICY user_roles_delete_admin ON public.user_roles
  FOR DELETE TO authenticated
  USING (public.is_admin(auth.uid()));

-- Profiles: admins can update / delete any (operators keep own update)
CREATE POLICY profiles_update_admin ON public.profiles
  FOR UPDATE TO authenticated
  USING (public.is_admin(auth.uid()))
  WITH CHECK (public.is_admin(auth.uid()));

CREATE POLICY profiles_delete_admin ON public.profiles
  FOR DELETE TO authenticated
  USING (public.is_admin(auth.uid()));
