
-- ============ ENUMS ============
CREATE TYPE public.app_role AS ENUM ('super_admin','admin_sat','admin_subden','operator','viewer');
CREATE TYPE public.laporan_jenis AS ENUM ('intelijen','cyber','kejadian','kamtibmas');
CREATE TYPE public.laporan_status AS ENUM ('draft','terkirim','diverifikasi','ditindaklanjuti','selesai');
CREATE TYPE public.urgensi_level AS ENUM ('rendah','sedang','tinggi','kritis');
CREATE TYPE public.sentimen AS ENUM ('positif','netral','negatif');
CREATE TYPE public.kondisi_alat AS ENUM ('baik','rusak_ringan','rusak_berat');
CREATE TYPE public.arsip_kategori AS ENUM ('laporan','surat','dokumentasi','intelijen','cyber','peralatan');

-- ============ PROFILES ============
CREATE TABLE public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  nama TEXT NOT NULL,
  pangkat TEXT,
  nrp TEXT,
  satuan TEXT,
  subden TEXT,
  polda TEXT,
  avatar_url TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE ON public.profiles TO authenticated;
GRANT ALL ON public.profiles TO service_role;
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
CREATE POLICY "profiles_select_all_auth" ON public.profiles FOR SELECT TO authenticated USING (true);
CREATE POLICY "profiles_update_own" ON public.profiles FOR UPDATE TO authenticated USING (auth.uid() = id);
CREATE POLICY "profiles_insert_own" ON public.profiles FOR INSERT TO authenticated WITH CHECK (auth.uid() = id);

-- ============ USER ROLES ============
CREATE TABLE public.user_roles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role app_role NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(user_id, role)
);
GRANT SELECT ON public.user_roles TO authenticated;
GRANT ALL ON public.user_roles TO service_role;
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;
CREATE POLICY "user_roles_select_own" ON public.user_roles FOR SELECT TO authenticated USING (auth.uid() = user_id);

CREATE OR REPLACE FUNCTION public.has_role(_user_id UUID, _role app_role)
RETURNS BOOLEAN LANGUAGE SQL STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = _user_id AND role = _role)
$$;

CREATE OR REPLACE FUNCTION public.is_admin(_user_id UUID)
RETURNS BOOLEAN LANGUAGE SQL STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = _user_id AND role IN ('super_admin','admin_sat','admin_subden'))
$$;

-- ============ AUTO PROFILE + DEFAULT ROLE ON SIGNUP ============
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  INSERT INTO public.profiles (id, nama, pangkat, nrp, satuan, subden, polda)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'nama', NEW.email),
    NEW.raw_user_meta_data->>'pangkat',
    NEW.raw_user_meta_data->>'nrp',
    COALESCE(NEW.raw_user_meta_data->>'satuan','Sat Bantek'),
    NEW.raw_user_meta_data->>'subden',
    NEW.raw_user_meta_data->>'polda'
  );
  INSERT INTO public.user_roles (user_id, role) VALUES (NEW.id, 'operator');
  RETURN NEW;
END;
$$;
CREATE TRIGGER on_auth_user_created AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- ============ TIMESTAMP TRIGGER ============
CREATE OR REPLACE FUNCTION public.touch_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql SET search_path = public AS $$
BEGIN NEW.updated_at = now(); RETURN NEW; END; $$;

CREATE TRIGGER trg_profiles_updated BEFORE UPDATE ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();

-- ============ LAPORAN ============
CREATE TABLE public.laporan (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  judul TEXT NOT NULL,
  jenis laporan_jenis NOT NULL,
  isi TEXT NOT NULL,
  polda TEXT,
  subden TEXT,
  wilayah TEXT,
  lokasi TEXT,
  lat DOUBLE PRECISION,
  lng DOUBLE PRECISION,
  urgensi urgensi_level NOT NULL DEFAULT 'sedang',
  status laporan_status NOT NULL DEFAULT 'draft',
  tanggal_kejadian TIMESTAMPTZ,
  sumber TEXT,
  tags TEXT[],
  attachments JSONB DEFAULT '[]'::jsonb,
  created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  verified_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  verified_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX laporan_jenis_idx ON public.laporan(jenis);
CREATE INDEX laporan_urgensi_idx ON public.laporan(urgensi);
CREATE INDEX laporan_polda_idx ON public.laporan(polda);
CREATE INDEX laporan_created_at_idx ON public.laporan(created_at DESC);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.laporan TO authenticated;
GRANT ALL ON public.laporan TO service_role;
ALTER TABLE public.laporan ENABLE ROW LEVEL SECURITY;
CREATE POLICY "laporan_select_all_auth" ON public.laporan FOR SELECT TO authenticated USING (true);
CREATE POLICY "laporan_insert_auth" ON public.laporan FOR INSERT TO authenticated WITH CHECK (auth.uid() = created_by);
CREATE POLICY "laporan_update_owner_or_admin" ON public.laporan FOR UPDATE TO authenticated
  USING (auth.uid() = created_by OR public.is_admin(auth.uid()));
CREATE POLICY "laporan_delete_admin" ON public.laporan FOR DELETE TO authenticated USING (public.is_admin(auth.uid()));
CREATE TRIGGER trg_laporan_updated BEFORE UPDATE ON public.laporan FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();

-- ============ AI ANALYSES ============
CREATE TABLE public.ai_analyses (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  laporan_id UUID REFERENCES public.laporan(id) ON DELETE CASCADE,
  ringkasan TEXT,
  isu_menonjol TEXT,
  potensi_kerawanan TEXT,
  rekomendasi TEXT,
  prediksi TEXT,
  sentimen sentimen,
  risiko urgensi_level,
  raw_json JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.ai_analyses TO authenticated;
GRANT ALL ON public.ai_analyses TO service_role;
ALTER TABLE public.ai_analyses ENABLE ROW LEVEL SECURITY;
CREATE POLICY "ai_analyses_all_auth" ON public.ai_analyses FOR SELECT TO authenticated USING (true);
CREATE POLICY "ai_analyses_insert_auth" ON public.ai_analyses FOR INSERT TO authenticated WITH CHECK (true);

-- ============ KEGIATAN ============
CREATE TABLE public.kegiatan (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  judul TEXT NOT NULL,
  deskripsi TEXT,
  lokasi TEXT,
  wilayah TEXT,
  mulai TIMESTAMPTZ NOT NULL,
  selesai TIMESTAMPTZ,
  kategori TEXT,
  urgensi urgensi_level DEFAULT 'sedang',
  prediksi_ai TEXT,
  created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.kegiatan TO authenticated;
GRANT ALL ON public.kegiatan TO service_role;
ALTER TABLE public.kegiatan ENABLE ROW LEVEL SECURITY;
CREATE POLICY "kegiatan_select_all" ON public.kegiatan FOR SELECT TO authenticated USING (true);
CREATE POLICY "kegiatan_write_auth" ON public.kegiatan FOR INSERT TO authenticated WITH CHECK (auth.uid() = created_by);
CREATE POLICY "kegiatan_update_owner_admin" ON public.kegiatan FOR UPDATE TO authenticated
  USING (auth.uid() = created_by OR public.is_admin(auth.uid()));
CREATE POLICY "kegiatan_delete_admin" ON public.kegiatan FOR DELETE TO authenticated USING (public.is_admin(auth.uid()));
CREATE TRIGGER trg_kegiatan_updated BEFORE UPDATE ON public.kegiatan FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();

-- ============ PERALATAN ============
CREATE TABLE public.peralatan (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  nama TEXT NOT NULL,
  kategori TEXT,
  serial_number TEXT,
  subden TEXT,
  lokasi TEXT,
  kondisi kondisi_alat NOT NULL DEFAULT 'baik',
  jumlah INTEGER NOT NULL DEFAULT 1,
  riwayat_pemeliharaan JSONB DEFAULT '[]'::jsonb,
  perlu_perawatan BOOLEAN DEFAULT false,
  catatan TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.peralatan TO authenticated;
GRANT ALL ON public.peralatan TO service_role;
ALTER TABLE public.peralatan ENABLE ROW LEVEL SECURITY;
CREATE POLICY "peralatan_select_all" ON public.peralatan FOR SELECT TO authenticated USING (true);
CREATE POLICY "peralatan_write_admin" ON public.peralatan FOR INSERT TO authenticated WITH CHECK (public.is_admin(auth.uid()));
CREATE POLICY "peralatan_update_admin" ON public.peralatan FOR UPDATE TO authenticated USING (public.is_admin(auth.uid()));
CREATE POLICY "peralatan_delete_admin" ON public.peralatan FOR DELETE TO authenticated USING (public.is_admin(auth.uid()));
CREATE TRIGGER trg_peralatan_updated BEFORE UPDATE ON public.peralatan FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();

-- ============ ARSIP ============
CREATE TABLE public.arsip (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  nomor TEXT,
  judul TEXT NOT NULL,
  kategori arsip_kategori NOT NULL,
  deskripsi TEXT,
  wilayah TEXT,
  tanggal DATE,
  file_url TEXT,
  file_name TEXT,
  uploaded_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.arsip TO authenticated;
GRANT ALL ON public.arsip TO service_role;
ALTER TABLE public.arsip ENABLE ROW LEVEL SECURITY;
CREATE POLICY "arsip_select_all" ON public.arsip FOR SELECT TO authenticated USING (true);
CREATE POLICY "arsip_insert_auth" ON public.arsip FOR INSERT TO authenticated WITH CHECK (auth.uid() = uploaded_by);
CREATE POLICY "arsip_update_admin" ON public.arsip FOR UPDATE TO authenticated USING (public.is_admin(auth.uid()) OR auth.uid() = uploaded_by);
CREATE POLICY "arsip_delete_admin" ON public.arsip FOR DELETE TO authenticated USING (public.is_admin(auth.uid()));

-- ============ PENGUMUMAN ============
CREATE TABLE public.pengumuman (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  judul TEXT NOT NULL,
  isi TEXT NOT NULL,
  prioritas urgensi_level DEFAULT 'sedang',
  target_subden TEXT,
  created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.pengumuman TO authenticated;
GRANT ALL ON public.pengumuman TO service_role;
ALTER TABLE public.pengumuman ENABLE ROW LEVEL SECURITY;
CREATE POLICY "pengumuman_select_all" ON public.pengumuman FOR SELECT TO authenticated USING (true);
CREATE POLICY "pengumuman_write_admin" ON public.pengumuman FOR INSERT TO authenticated WITH CHECK (public.is_admin(auth.uid()));
CREATE POLICY "pengumuman_update_admin" ON public.pengumuman FOR UPDATE TO authenticated USING (public.is_admin(auth.uid()));
CREATE POLICY "pengumuman_delete_admin" ON public.pengumuman FOR DELETE TO authenticated USING (public.is_admin(auth.uid()));

-- ============ AI CHAT ============
CREATE TABLE public.ai_chat_messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role TEXT NOT NULL CHECK (role IN ('user','assistant','system')),
  content TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX ai_chat_user_idx ON public.ai_chat_messages(user_id, created_at);
GRANT SELECT, INSERT, DELETE ON public.ai_chat_messages TO authenticated;
GRANT ALL ON public.ai_chat_messages TO service_role;
ALTER TABLE public.ai_chat_messages ENABLE ROW LEVEL SECURITY;
CREATE POLICY "chat_select_own" ON public.ai_chat_messages FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "chat_insert_own" ON public.ai_chat_messages FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "chat_delete_own" ON public.ai_chat_messages FOR DELETE TO authenticated USING (auth.uid() = user_id);

-- ============ TOOLS LINKS ============
CREATE TABLE public.tools_links (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  nama TEXT NOT NULL,
  url TEXT NOT NULL,
  kategori TEXT,
  deskripsi TEXT,
  ikon TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.tools_links TO authenticated;
GRANT ALL ON public.tools_links TO service_role;
ALTER TABLE public.tools_links ENABLE ROW LEVEL SECURITY;
CREATE POLICY "tools_select_all" ON public.tools_links FOR SELECT TO authenticated USING (true);
CREATE POLICY "tools_write_admin" ON public.tools_links FOR INSERT TO authenticated WITH CHECK (public.is_admin(auth.uid()));
CREATE POLICY "tools_update_admin" ON public.tools_links FOR UPDATE TO authenticated USING (public.is_admin(auth.uid()));
CREATE POLICY "tools_delete_admin" ON public.tools_links FOR DELETE TO authenticated USING (public.is_admin(auth.uid()));

-- ============ NOTIFIKASI ============
CREATE TABLE public.notifikasi (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  judul TEXT NOT NULL,
  pesan TEXT NOT NULL,
  jenis TEXT DEFAULT 'info',
  link TEXT,
  dibaca BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.notifikasi TO authenticated;
GRANT ALL ON public.notifikasi TO service_role;
ALTER TABLE public.notifikasi ENABLE ROW LEVEL SECURITY;
CREATE POLICY "notif_select_own_or_broadcast" ON public.notifikasi FOR SELECT TO authenticated USING (user_id IS NULL OR user_id = auth.uid());
CREATE POLICY "notif_update_own" ON public.notifikasi FOR UPDATE TO authenticated USING (user_id = auth.uid());
CREATE POLICY "notif_insert_admin" ON public.notifikasi FOR INSERT TO authenticated WITH CHECK (public.is_admin(auth.uid()));

-- ============ GENERATED REPORTS ============
CREATE TABLE public.generated_reports (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  judul TEXT NOT NULL,
  periode TEXT NOT NULL,
  tanggal_mulai DATE,
  tanggal_selesai DATE,
  konten TEXT NOT NULL,
  ringkasan TEXT,
  metadata JSONB,
  created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.generated_reports TO authenticated;
GRANT ALL ON public.generated_reports TO service_role;
ALTER TABLE public.generated_reports ENABLE ROW LEVEL SECURITY;
CREATE POLICY "reports_select_all" ON public.generated_reports FOR SELECT TO authenticated USING (true);
CREATE POLICY "reports_insert_auth" ON public.generated_reports FOR INSERT TO authenticated WITH CHECK (auth.uid() = created_by);
CREATE POLICY "reports_update_owner_admin" ON public.generated_reports FOR UPDATE TO authenticated USING (auth.uid() = created_by OR public.is_admin(auth.uid()));
CREATE POLICY "reports_delete_admin" ON public.generated_reports FOR DELETE TO authenticated USING (public.is_admin(auth.uid()));
