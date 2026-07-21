
CREATE POLICY ai_analyses_update_owner_or_admin ON public.ai_analyses FOR UPDATE TO authenticated
USING (is_admin(auth.uid()) OR EXISTS (SELECT 1 FROM public.laporan l WHERE l.id = ai_analyses.laporan_id AND l.created_by = auth.uid()))
WITH CHECK (is_admin(auth.uid()) OR EXISTS (SELECT 1 FROM public.laporan l WHERE l.id = ai_analyses.laporan_id AND l.created_by = auth.uid()));

CREATE POLICY ai_analyses_delete_owner_or_admin ON public.ai_analyses FOR DELETE TO authenticated
USING (is_admin(auth.uid()) OR EXISTS (SELECT 1 FROM public.laporan l WHERE l.id = ai_analyses.laporan_id AND l.created_by = auth.uid()));

CREATE POLICY personil_update_owner_or_admin ON public.personil FOR UPDATE TO authenticated
USING (is_admin(auth.uid()) OR created_by = auth.uid())
WITH CHECK (is_admin(auth.uid()) OR created_by = auth.uid());

CREATE POLICY personil_delete_owner_or_admin ON public.personil FOR DELETE TO authenticated
USING (is_admin(auth.uid()) OR created_by = auth.uid());
