import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useRole } from "@/hooks/useRole";
import { PageHeader, Panel, Badge, URGENSI_VARIANT } from "@/components/ui-toc";
import { Calendar as CalIcon, Plus, Pencil, Trash2, X, Download, FileText, Search, Upload, Image as ImageIcon } from "lucide-react";
import { toast } from "sonner";
import { downloadCSV, downloadPDF } from "@/lib/export-utils";

export const Route = createFileRoute("/_app/kalender")({ component: KalenderPage });

type ImgRef = { path: string; name: string };
type Item = {
  id: string; judul: string; deskripsi: string | null; lokasi: string | null; wilayah: string | null;
  mulai: string; selesai: string | null; kategori: string | null; urgensi: string | null;
  created_by: string | null; images: ImgRef[] | null;
};

const emptyForm = { judul: "", deskripsi: "", lokasi: "", wilayah: "", mulai: "", selesai: "", kategori: "", urgensi: "sedang", images: [] as ImgRef[] };

function KalenderPage() {
  const { user } = useAuth();
  const { isAdmin } = useRole();
  const qc = useQueryClient();
  const [show, setShow] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState(emptyForm);
  const [q, setQ] = useState("");
  const [fUrg, setFUrg] = useState("");
  const [fKat, setFKat] = useState("");

  const { data: items } = useQuery({
    queryKey: ["kegiatan"],
    queryFn: async () => {
      const { data } = await supabase.from("kegiatan").select("*").order("mulai", { ascending: true });
      return (data ?? []) as Item[];
    },
  });

  const save = useMutation({
    mutationFn: async () => {
      if (editingId) {
        const { error } = await supabase.from("kegiatan").update({
          judul: form.judul, deskripsi: form.deskripsi, lokasi: form.lokasi, wilayah: form.wilayah,
          mulai: form.mulai, selesai: form.selesai || null, kategori: form.kategori, urgensi: form.urgensi as never,
          images: form.images,
        } as never).eq("id", editingId);
        if (error) throw error;
      } else {
        const { error } = await supabase.from("kegiatan").insert({ ...form, selesai: form.selesai || null, created_by: user!.id } as never);
        if (error) throw error;
      }
    },
    onSuccess: () => {
      toast.success(editingId ? "Kegiatan diperbarui" : "Kegiatan ditambahkan");
      setShow(false); setEditingId(null); setForm(emptyForm);
      qc.invalidateQueries({ queryKey: ["kegiatan"] });
    },
    onError: (e) => toast.error(e instanceof Error ? e.message : "Gagal"),
  });

  const del = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("kegiatan").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => { toast.success("Kegiatan dihapus"); qc.invalidateQueries({ queryKey: ["kegiatan"] }); },
    onError: (e) => toast.error(e instanceof Error ? e.message : "Gagal"),
  });

  const canEdit = (k: Item) => isAdmin || k.created_by === user?.id;
  const startEdit = (k: Item) => {
    setEditingId(k.id);
    setForm({
      judul: k.judul, deskripsi: k.deskripsi ?? "", lokasi: k.lokasi ?? "", wilayah: k.wilayah ?? "",
      mulai: k.mulai?.slice(0, 16) ?? "", selesai: k.selesai?.slice(0, 16) ?? "",
      kategori: k.kategori ?? "", urgensi: k.urgensi ?? "sedang",
      images: Array.isArray(k.images) ? k.images : [],
    });
    setShow(true);
  };

  const [uploading, setUploading] = useState(false);
  const [thumbs, setThumbs] = useState<Record<string, string>>({});

  async function signThumb(path: string) {
    if (thumbs[path]) return thumbs[path];
    const { data } = await supabase.storage.from("laporan-images").createSignedUrl(path, 3600);
    if (data?.signedUrl) setThumbs(t => ({ ...t, [path]: data.signedUrl }));
    return data?.signedUrl ?? "";
  }

  async function handleFiles(e: React.ChangeEvent<HTMLInputElement>) {
    const files = Array.from(e.target.files ?? []);
    e.target.value = "";
    if (!files.length || !user) return;
    setUploading(true);
    const next: ImgRef[] = [];
    for (const f of files) {
      if (!f.type.startsWith("image/")) continue;
      const path = `${user.id}/${Date.now()}_${f.name}`;
      const { error } = await supabase.storage.from("laporan-images").upload(path, f);
      if (error) { toast.error(error.message); continue; }
      next.push({ path, name: f.name });
      await signThumb(path);
    }
    setForm(fm => ({ ...fm, images: [...fm.images, ...next] }));
    setUploading(false);
  }

  async function removeFormImage(i: number) {
    const img = form.images[i];
    await supabase.storage.from("laporan-images").remove([img.path]);
    setForm(fm => ({ ...fm, images: fm.images.filter((_, idx) => idx !== i) }));
  }

  const inp = "w-full px-3 py-2 bg-input/40 border border-border rounded text-sm font-mono";
  const lbl = "block text-[10px] font-mono-display tracking-wider text-muted-foreground mb-1";

  const filtered = (items ?? []).filter(k => {
    if (fUrg && (k.urgensi ?? "") !== fUrg) return false;
    if (fKat && !(k.kategori ?? "").toLowerCase().includes(fKat.toLowerCase())) return false;
    if (q) {
      const s = q.toLowerCase();
      if (![k.judul, k.deskripsi, k.wilayah, k.lokasi].some(v => (v ?? "").toLowerCase().includes(s))) return false;
    }
    return true;
  });

  const headers = ["Judul", "Kategori", "Wilayah", "Lokasi", "Mulai", "Selesai", "Urgensi", "Deskripsi"];
  const exportData = () => filtered.map(k => [
    k.judul, k.kategori ?? "", k.wilayah ?? "", k.lokasi ?? "",
    new Date(k.mulai).toLocaleString("id-ID"), k.selesai ? new Date(k.selesai).toLocaleString("id-ID") : "",
    k.urgensi ?? "", k.deskripsi ?? "",
  ]);

  return (
    <div>
      <PageHeader code="06" title="Kalender Kamtibmas" subtitle="Agenda nasional, wilayah, dan event rawan kamtibmas"
        actions={<>
          <button onClick={() => downloadCSV("kalender-kamtibmas", headers, exportData())} className="inline-flex items-center gap-2 px-3 py-2 bg-secondary border border-border text-xs font-mono-display rounded hover:border-primary"><Download className="w-4 h-4" /> CSV</button>
          <button onClick={() => downloadPDF("Kalender Kamtibmas", headers, exportData())} className="inline-flex items-center gap-2 px-3 py-2 bg-secondary border border-border text-xs font-mono-display rounded hover:border-primary"><FileText className="w-4 h-4" /> PDF</button>
          <button onClick={() => { setEditingId(null); setForm(emptyForm); setShow(!show); }} className="inline-flex items-center gap-2 px-3 py-2 bg-primary text-primary-foreground text-xs font-mono-display rounded"><Plus className="w-4 h-4" /> TAMBAH</button>
        </>} />

      <Panel title="Filter & Pencarian" className="mb-4">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-2">
          <div className="relative">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
            <input value={q} onChange={e => setQ(e.target.value)} placeholder="Kata kunci..." className="w-full pl-9 pr-3 py-2 bg-input/40 border border-border rounded text-sm font-mono" />
          </div>
          <input value={fKat} onChange={e => setFKat(e.target.value)} placeholder="Kategori..." className="px-3 py-2 bg-input/40 border border-border rounded text-sm font-mono" />
          <select value={fUrg} onChange={e => setFUrg(e.target.value)} className="px-3 py-2 bg-input/40 border border-border rounded text-sm font-mono">
            <option value="">Semua Urgensi</option>
            <option value="rendah">Rendah</option><option value="sedang">Sedang</option>
            <option value="tinggi">Tinggi</option><option value="kritis">Kritis</option>
          </select>
        </div>
        <div className="mt-2 text-[10px] font-mono-display text-muted-foreground">{filtered.length} AGENDA DITEMUKAN</div>
      </Panel>

      {show && (
        <Panel title={editingId ? "Edit Kegiatan" : "Tambah Kegiatan"} className="mb-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <div><label className={lbl}>JUDUL</label><input className={inp} value={form.judul} onChange={e => setForm({ ...form, judul: e.target.value })} /></div>
            <div><label className={lbl}>KATEGORI</label><input className={inp} value={form.kategori} onChange={e => setForm({ ...form, kategori: e.target.value })} placeholder="Demo / Pemilu / Konser..." /></div>
            <div><label className={lbl}>MULAI</label><input type="datetime-local" className={inp} value={form.mulai} onChange={e => setForm({ ...form, mulai: e.target.value })} /></div>
            <div><label className={lbl}>SELESAI</label><input type="datetime-local" className={inp} value={form.selesai} onChange={e => setForm({ ...form, selesai: e.target.value })} /></div>
            <div><label className={lbl}>WILAYAH</label><input className={inp} value={form.wilayah} onChange={e => setForm({ ...form, wilayah: e.target.value })} /></div>
            <div><label className={lbl}>LOKASI</label><input className={inp} value={form.lokasi} onChange={e => setForm({ ...form, lokasi: e.target.value })} /></div>
            <div className="md:col-span-2"><label className={lbl}>DESKRIPSI</label><textarea className={inp} rows={3} value={form.deskripsi} onChange={e => setForm({ ...form, deskripsi: e.target.value })} /></div>
            <div><label className={lbl}>URGENSI</label>
              <select className={inp} value={form.urgensi} onChange={e => setForm({ ...form, urgensi: e.target.value })}>
                <option value="rendah">Rendah</option><option value="sedang">Sedang</option><option value="tinggi">Tinggi</option><option value="kritis">Kritis</option>
              </select>
            </div>
          </div>
          <div className="mt-3 flex gap-2">
            <button onClick={() => save.mutate()} disabled={save.isPending || !form.judul || !form.mulai}
              className="px-4 py-2 bg-primary text-primary-foreground text-xs font-mono-display rounded disabled:opacity-50">{editingId ? "SIMPAN" : "TAMBAH"}</button>
            <button onClick={() => { setShow(false); setEditingId(null); setForm(emptyForm); }} className="px-4 py-2 border border-border text-xs font-mono-display rounded">BATAL</button>
          </div>
        </Panel>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
        {filtered.map(k => (
          <div key={k.id} className="panel scanline p-4">
            <div className="flex items-start justify-between gap-2 mb-2">
              <CalIcon className="w-4 h-4 text-primary" />
              <Badge variant={URGENSI_VARIANT[(k.urgensi ?? "sedang") as keyof typeof URGENSI_VARIANT]}>{k.urgensi ?? "sedang"}</Badge>
            </div>
            <h3 className="font-semibold text-sm mb-1">{k.judul}</h3>
            <p className="text-xs text-muted-foreground line-clamp-2 mb-2">{k.deskripsi}</p>
            <div className="text-[10px] font-mono-display text-muted-foreground space-y-0.5">
              <div>📍 {k.wilayah ?? "—"} · {k.lokasi ?? "—"}</div>
              <div>⏰ {new Date(k.mulai).toLocaleString("id-ID")}</div>
              {k.kategori && <div>🏷️ {k.kategori}</div>}
            </div>
            {canEdit(k) && (
              <div className="mt-3 pt-2 border-t border-border/30 flex gap-1.5">
                <button onClick={() => startEdit(k)} className="flex-1 inline-flex items-center justify-center gap-1 px-2 py-1 text-[10px] font-mono-display border border-border rounded hover:bg-accent">
                  <Pencil className="w-3 h-3" /> EDIT
                </button>
                <button onClick={() => { if (confirm(`Hapus "${k.judul}"?`)) del.mutate(k.id); }}
                  className="flex-1 inline-flex items-center justify-center gap-1 px-2 py-1 text-[10px] font-mono-display border border-destructive/40 text-destructive rounded hover:bg-destructive/10">
                  <Trash2 className="w-3 h-3" /> HAPUS
                </button>
              </div>
            )}
          </div>
        ))}
        {filtered.length === 0 && <div className="col-span-full text-center py-12 text-muted-foreground font-mono text-xs">[ TIDAK ADA AGENDA ]</div>}
      </div>
    </div>
  );
}
