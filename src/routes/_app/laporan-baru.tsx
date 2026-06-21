import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { PageHeader, Panel } from "@/components/ui-toc";
import { toast } from "sonner";
import { Save, Upload, X, Image as ImageIcon } from "lucide-react";

export const Route = createFileRoute("/_app/laporan-baru")({ component: LaporanBaru });

type Img = { path: string; name: string; url: string };

function LaporanBaru() {
  const { user } = useAuth();
  const nav = useNavigate();
  const [form, setForm] = useState({
    judul: "", jenis: "intelijen", isi: "",
    polda: "", subden: "", wilayah: "", lokasi: "",
    urgensi: "sedang", tanggal_kejadian: "", sumber: "",
  });
  const [busy, setBusy] = useState(false);
  const [images, setImages] = useState<Img[]>([]);
  const [uploading, setUploading] = useState(false);

  async function handleFiles(e: React.ChangeEvent<HTMLInputElement>) {
    const files = Array.from(e.target.files ?? []);
    e.target.value = "";
    if (!files.length || !user) return;
    const slots = 5 - images.length;
    if (slots <= 0) { toast.error("Maksimal 5 gambar"); return; }
    setUploading(true);
    const next: Img[] = [];
    for (const f of files.slice(0, slots)) {
      if (!f.type.startsWith("image/")) { toast.error(`${f.name} bukan gambar`); continue; }
      const path = `${user.id}/${Date.now()}_${f.name}`;
      const { error } = await supabase.storage.from("laporan-images").upload(path, f);
      if (error) { toast.error(error.message); continue; }
      const { data: signed } = await supabase.storage.from("laporan-images").createSignedUrl(path, 3600);
      next.push({ path, name: f.name, url: signed?.signedUrl ?? "" });
    }
    setImages([...images, ...next]);
    setUploading(false);
  }

  async function removeImage(i: number) {
    const img = images[i];
    await supabase.storage.from("laporan-images").remove([img.path]);
    setImages(images.filter((_, idx) => idx !== i));
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    const { error } = await supabase.from("laporan").insert({
      ...form,
      created_by: user!.id,
      status: "terkirim",
      tanggal_kejadian: form.tanggal_kejadian || null,
      attachments: images.map(i => ({ path: i.path, name: i.name })),
    } as never).select().single();
    setBusy(false);
    if (error) { toast.error(error.message); return; }
    toast.success("Laporan terkirim");
    nav({ to: "/big-data" });
  }

  const set = (k: keyof typeof form) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) =>
    setForm({ ...form, [k]: e.target.value });

  const inp = "w-full px-3 py-2 bg-input/40 border border-border rounded text-sm font-mono focus:outline-none focus:border-primary";
  const lbl = "block text-[10px] font-mono-display tracking-wider text-muted-foreground mb-1";


  return (
    <div>
      <PageHeader code="04" title="Input Laporan" subtitle="Form input laporan intelijen, cyber, dan kejadian wilayah" />
      <form onSubmit={submit} className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <Panel title="Detail Laporan" className="lg:col-span-2">
          <div className="space-y-3">
            <div>
              <label className={lbl}>JUDUL LAPORAN</label>
              <input required value={form.judul} onChange={set("judul")} className={inp} />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className={lbl}>JENIS</label>
                <select value={form.jenis} onChange={set("jenis")} className={inp}>
                  <option value="intelijen">Intelijen</option>
                  <option value="cyber">Cyber</option>
                  <option value="kejadian">Kejadian Wilayah</option>
                  <option value="kamtibmas">Kamtibmas</option>
                </select>
              </div>
              <div>
                <label className={lbl}>URGENSI</label>
                <select value={form.urgensi} onChange={set("urgensi")} className={inp}>
                  <option value="rendah">Rendah</option>
                  <option value="sedang">Sedang</option>
                  <option value="tinggi">Tinggi</option>
                  <option value="kritis">Kritis</option>
                </select>
              </div>
            </div>
            <div>
              <label className={lbl}>ISI LAPORAN</label>
              <textarea required value={form.isi} onChange={set("isi")} rows={10} className={inp} placeholder="Tuliskan fakta-fakta, kronologi, analisa awal..." />
            </div>
            <div>
              <label className={lbl}>SUMBER</label>
              <input value={form.sumber} onChange={set("sumber")} className={inp} placeholder="Petugas / OSINT / Media..." />
            </div>
          </div>
        </Panel>

        <Panel title="Lokasi & Waktu">
          <div className="space-y-3">
            <div>
              <label className={lbl}>POLDA</label>
              <input value={form.polda} onChange={set("polda")} className={inp} placeholder="Metro Jaya" />
            </div>
            <div>
              <label className={lbl}>SUBDEN</label>
              <input value={form.subden} onChange={set("subden")} className={inp} placeholder="Subden 1" />
            </div>
            <div>
              <label className={lbl}>WILAYAH</label>
              <input value={form.wilayah} onChange={set("wilayah")} className={inp} placeholder="Jakarta Pusat" />
            </div>
            <div>
              <label className={lbl}>LOKASI DETAIL</label>
              <input value={form.lokasi} onChange={set("lokasi")} className={inp} />
            </div>
            <div>
              <label className={lbl}>TANGGAL KEJADIAN</label>
              <input type="datetime-local" value={form.tanggal_kejadian} onChange={set("tanggal_kejadian")} className={inp} />
            </div>
            <button type="submit" disabled={busy}
              className="w-full mt-4 inline-flex items-center justify-center gap-2 py-3 bg-primary text-primary-foreground font-mono-display tracking-wider text-sm rounded hover:opacity-90 disabled:opacity-50">
              <Save className="w-4 h-4" /> {busy ? "MENGIRIM..." : "KIRIM LAPORAN"}
            </button>
          </div>
        </Panel>
      </form>
    </div>
  );
}
