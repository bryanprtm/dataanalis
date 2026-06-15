
CREATE TABLE public.personil (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  subden TEXT NOT NULL,
  polda TEXT,
  satuan TEXT DEFAULT 'Sat Bantek',
  dsp INTEGER NOT NULL DEFAULT 0,
  riil INTEGER NOT NULL DEFAULT 0,
  pelatihan JSONB NOT NULL DEFAULT '[]'::jsonb,
  catatan TEXT,
  created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.personil TO authenticated;
GRANT ALL ON public.personil TO service_role;

ALTER TABLE public.personil ENABLE ROW LEVEL SECURITY;

CREATE POLICY "personil_select_auth" ON public.personil FOR SELECT TO authenticated USING (true);
CREATE POLICY "personil_insert_admin" ON public.personil FOR INSERT TO authenticated WITH CHECK (public.is_admin(auth.uid()));
CREATE POLICY "personil_update_admin" ON public.personil FOR UPDATE TO authenticated USING (public.is_admin(auth.uid())) WITH CHECK (public.is_admin(auth.uid()));
CREATE POLICY "personil_delete_admin" ON public.personil FOR DELETE TO authenticated USING (public.is_admin(auth.uid()));

CREATE TRIGGER personil_touch_updated_at BEFORE UPDATE ON public.personil
FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();
