import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useRole } from "@/hooks/useRole";
import { PageHeader, Panel, Badge } from "@/components/ui-toc";
import { Archive as ArchiveIcon, Search, Plus, Pencil, Trash2, X, Upload, Download } from "lucide-react";
import { toast } from "sonner";

export const Route = createFileRoute("/_app/arsip")({ component: ArsipPage });

type Row = {
  id: string; nomor: string | null; judul: string; kategori: string;
  deskripsi: string | null; wilayah: string | null; tanggal: string | null;
  uploaded_by: string | null;
};

const KATEGORI = ["laporan", "surat", "dokumentasi", "intelijen", "cyber", "peralatan"] as const;
const emptyForm = { nomor: "", judul: "", kategori: "laporan", deskripsi: "", wilayah: "", tanggal: "" };

function ArsipPage() {
  const { user } = useAuth();
  const { isAdmin } = useRole();
  const qc = useQueryClient();
  const [q, setQ] = useState("");
  const [kat, setKat] = useState("");
  const [show, setShow] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState(emptyForm);

  const { data } = useQuery({
    queryKey: ["arsip", q, kat],
    queryFn: async () => {
      let qb = supabase.from("arsip").select("*").order("created_at", { ascending: false });
      if (kat) qb = qb.eq("kategori", kat as never);
      if (q) qb = qb.or(`judul.ilike.%${q}%,nomor.ilike.%${q}%`);
      const { data } = await qb;
      return (data ?? []) as Row[];
    },
  });

  const save = useMutation({
    mutationFn: async () => {
      const payload = {
        nomor: form.nomor || null, judul: form.judul, kategori: form.kategori as never,
        deskripsi: form.deskripsi || null, wilayah: form.wilayah || null, tanggal: form.tanggal || null,
      };
      if (editingId) {
        const { error } = await supabase.from("arsip").update(payload).eq("id", editingId);
        if (error) throw error;
      } else {
        const { error } = await supabase.from("arsip").insert({ ...payload, uploaded_by: user!.id });
        if (error) throw error;
      }
    },
    onSuccess: () => {
      toast.success(editingId ? "Arsip diperbarui" : "Arsip ditambahkan");
      setShow(false); setEditingId(null); setForm(emptyForm);
      qc.invalidateQueries({ queryKey: ["arsip"] });
    },
    onError: (e) => toast.error(e instanceof Error ? e.message : "Gagal"),
  });

  const del = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("arsip").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => { toast.success("Arsip dihapus"); qc.invalidateQueries({ queryKey: ["arsip"] }); },
    onError: (e) => toast.error(e instanceof Error ? e.message : "Gagal"),
  });

  const canEdit = (r: Row) => isAdmin || r.uploaded_by === user?.id;
  const startEdit = (r: Row) => {
    setEditingId(r.id);
    setForm({
      nomor: r.nomor ?? "", judul: r.judul, kategori: r.kategori,
      deskripsi: r.deskripsi ?? "", wilayah: r.wilayah ?? "", tanggal: r.tanggal ?? "",
    });
    setShow(true);
  };

  const inp = "w-full px-3 py-2 bg-input/40 border border-border rounded text-sm font-mono";
  const lbl = "block text-[10px] font-mono-display tracking-wider text-muted-foreground mb-1";

  return (
    <div>
      <PageHeader code="07" title="Data Arsip" subtitle="Penyimpanan dan pencarian arsip digital"
        actions={<button onClick={() => { setEditingId(null); setForm(emptyForm); setShow(true); }} className="inline-flex items-center gap-2 px-3 py-2 bg-primary text-primary-foreground text-xs font-mono-display rounded"><Plus className="w-4 h-4" /> TAMBAH ARSIP</button>} />

      <Panel className="mb-4">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
          <div className="relative">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
            <input value={q} onChange={e => setQ(e.target.value)} placeholder="Cari nomor / judul..." className="w-full pl-9 pr-3 py-2 bg-input/40 border border-border rounded text-sm font-mono" />
          </div>
          <select value={kat} onChange={e => setKat(e.target.value)} className="px-3 py-2 bg-input/40 border border-border rounded text-sm font-mono">
            <option value="">Semua Kategori</option>
            {KATEGORI.map(k => <option key={k} value={k}>{k}</option>)}
          </select>
        </div>
      </Panel>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
        {data?.map(a => (
          <div key={a.id} className="panel scanline p-4 flex flex-col">
            <div className="flex items-start justify-between mb-2">
              <ArchiveIcon className="w-4 h-4 text-primary" />
              <Badge variant="cyan">{a.kategori}</Badge>
            </div>
            <div className="text-[10px] font-mono text-muted-foreground">{a.nomor ?? "—"}</div>
            <h3 className="font-semibold text-sm mt-1 line-clamp-2">{a.judul}</h3>
            <p className="text-xs text-muted-foreground line-clamp-2 mt-1 flex-1">{a.deskripsi}</p>
            <div className="mt-2 text-[10px] font-mono text-muted-foreground">{a.wilayah ?? "—"} · {a.tanggal ?? "—"}</div>
            {canEdit(a) && (
              <div className="mt-3 pt-2 border-t border-border/30 flex gap-1.5">
                <button onClick={() => startEdit(a)} className="flex-1 inline-flex items-center justify-center gap-1 px-2 py-1 text-[10px] font-mono-display border border-border rounded hover:bg-accent">
                  <Pencil className="w-3 h-3" /> EDIT
                </button>
                <button onClick={() => { if (confirm(`Hapus arsip "${a.judul}"?`)) del.mutate(a.id); }}
                  className="flex-1 inline-flex items-center justify-center gap-1 px-2 py-1 text-[10px] font-mono-display border border-destructive/40 text-destructive rounded hover:bg-destructive/10">
                  <Trash2 className="w-3 h-3" /> HAPUS
                </button>
              </div>
            )}
          </div>
        ))}
        {data?.length === 0 && <div className="col-span-full text-center py-12 text-muted-foreground font-mono text-xs">[ ARSIP KOSONG ]</div>}
      </div>

      {show && (
        <div className="fixed inset-0 z-50 bg-black/70 flex items-center justify-center p-4" onClick={() => { setShow(false); setEditingId(null); }}>
          <div className="panel p-6 w-full max-w-lg" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-4">
              <h2 className="font-mono-display text-sm tracking-widest text-primary">[ {editingId ? "EDIT_ARSIP" : "NEW_ARSIP"} ]</h2>
              <button onClick={() => { setShow(false); setEditingId(null); }}><X className="w-4 h-4" /></button>
            </div>
            <form onSubmit={(e) => { e.preventDefault(); save.mutate(); }} className="space-y-3">
              <div className="grid grid-cols-2 gap-3">
                <div><label className={lbl}>NOMOR</label><input className={inp} value={form.nomor} onChange={(e) => setForm({ ...form, nomor: e.target.value })} /></div>
                <div><label className={lbl}>KATEGORI</label>
                  <select className={inp} value={form.kategori} onChange={(e) => setForm({ ...form, kategori: e.target.value })}>
                    {KATEGORI.map(k => <option key={k} value={k}>{k}</option>)}
                  </select>
                </div>
              </div>
              <div><label className={lbl}>JUDUL</label><input required className={inp} value={form.judul} onChange={(e) => setForm({ ...form, judul: e.target.value })} /></div>
              <div><label className={lbl}>DESKRIPSI</label><textarea rows={3} className={inp} value={form.deskripsi} onChange={(e) => setForm({ ...form, deskripsi: e.target.value })} /></div>
              <div className="grid grid-cols-2 gap-3">
                <div><label className={lbl}>WILAYAH</label><input className={inp} value={form.wilayah} onChange={(e) => setForm({ ...form, wilayah: e.target.value })} /></div>
                <div><label className={lbl}>TANGGAL</label><input type="date" className={inp} value={form.tanggal} onChange={(e) => setForm({ ...form, tanggal: e.target.value })} /></div>
              </div>
              <button type="submit" disabled={save.isPending} className="w-full py-2 bg-primary text-primary-foreground font-mono-display text-xs rounded disabled:opacity-50">
                {save.isPending ? "[ MENYIMPAN... ]" : editingId ? "[ SIMPAN ]" : "[ TAMBAH ]"}
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
