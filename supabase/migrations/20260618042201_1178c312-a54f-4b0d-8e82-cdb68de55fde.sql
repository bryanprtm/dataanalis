
CREATE POLICY "arsip read auth" ON storage.objects FOR SELECT TO authenticated USING (bucket_id = 'arsip');
CREATE POLICY "arsip insert auth" ON storage.objects FOR INSERT TO authenticated WITH CHECK (bucket_id = 'arsip' AND owner = auth.uid());
CREATE POLICY "arsip delete own" ON storage.objects FOR DELETE TO authenticated USING (bucket_id = 'arsip' AND (owner = auth.uid() OR public.is_admin(auth.uid())));
