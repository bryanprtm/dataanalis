
ALTER TABLE public.kegiatan ADD COLUMN IF NOT EXISTS images jsonb DEFAULT '[]'::jsonb;

CREATE POLICY "auth read laporan-images" ON storage.objects FOR SELECT TO authenticated USING (bucket_id = 'laporan-images');
CREATE POLICY "auth upload laporan-images" ON storage.objects FOR INSERT TO authenticated WITH CHECK (bucket_id = 'laporan-images' AND owner = auth.uid());
CREATE POLICY "auth delete own laporan-images" ON storage.objects FOR DELETE TO authenticated USING (bucket_id = 'laporan-images' AND (owner = auth.uid() OR public.is_admin(auth.uid())));
