import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { PageHeader, Panel, Badge } from "@/components/ui-toc";
import { Wrench, Plus, AlertCircle, Pencil, Trash2, X, Download, FileText, Search } from "lucide-react";
import { toast } from "sonner";
import { downloadCSV, downloadPDF } from "@/lib/export-utils";


export const Route = createFileRoute("/_app/peralatan")({ component: PeralatanPage });

type Row = {
  id: string; nama: string; kategori: string | null; serial_number: string | null;
  subden: string | null; lokasi: string | null; kondisi: string; jumlah: number;
  perlu_perawatan: boolean | null; catatan: string | null;
};

const emptyForm = { nama: "", kategori: "", serial_number: "", subden: "", lokasi: "", kondisi: "baik", jumlah: 1, catatan: "" };

function PeralatanPage() {
  const qc = useQueryClient();
  const [show, setShow] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState(emptyForm);
  const [q, setQ] = useState("");
  const [fKondisi, setFKondisi] = useState("");
  const [fSubden, setFSubden] = useState("");
  const [page, setPage] = useState(1);
  const pageSize = 10;

  const { data } = useQuery({
    queryKey: ["peralatan"],
    queryFn: async () => {
      const { data } = await supabase.from("peralatan").select("*").order("created_at", { ascending: false });
      return (data ?? []) as Row[];
    },
  });

  const save = useMutation({
    mutationFn: async () => {
      const payload = { ...form, jumlah: Number(form.jumlah), kondisi: form.kondisi as never };
      if (editingId) {
        const { error } = await supabase.from("peralatan").update(payload).eq("id", editingId);
        if (error) throw error;
      } else {
        const { error } = await supabase.from("peralatan").insert(payload);
        if (error) throw error;
      }
    },
    onSuccess: () => {
      toast.success(editingId ? "Peralatan diperbarui" : "Peralatan ditambahkan");
      setShow(false); setEditingId(null); setForm(emptyForm);
      qc.invalidateQueries({ queryKey: ["peralatan"] });
    },
    onError: (e) => toast.error(e instanceof Error ? e.message : "Gagal"),
  });

  const del = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("peralatan").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => { toast.success("Peralatan dihapus"); qc.invalidateQueries({ queryKey: ["peralatan"] }); },
    onError: (e) => toast.error(e instanceof Error ? e.message : "Gagal"),
  });

  const startEdit = (r: Row) => {
    setEditingId(r.id);
    setForm({
      nama: r.nama, kategori: r.kategori ?? "", serial_number: r.serial_number ?? "",
      subden: r.subden ?? "", lokasi: r.lokasi ?? "", kondisi: r.kondisi,
      jumlah: r.jumlah, catatan: r.catatan ?? "",
    });
    setShow(true);
  };

  const inp = "w-full px-3 py-2 bg-input/40 border border-border rounded text-sm font-mono";
  const lbl = "block text-[10px] font-mono-display text-muted-foreground mb-1";
  const kondisiBadge = { baik: "green", rusak_ringan: "amber", rusak_berat: "red" } as const;

  const stats = {
    total: data?.length ?? 0,
    baik: data?.filter(d => d.kondisi === "baik").length ?? 0,
    rusak_ringan: data?.filter(d => d.kondisi === "rusak_ringan").length ?? 0,
    rusak_berat: data?.filter(d => d.kondisi === "rusak_berat").length ?? 0,
  };

  const filtered = (data ?? []).filter(p => {
    if (fKondisi && p.kondisi !== fKondisi) return false;
    if (fSubden && !(p.subden ?? "").toLowerCase().includes(fSubden.toLowerCase())) return false;
    if (q) {
      const s = q.toLowerCase();
      if (![p.nama, p.kategori, p.serial_number, p.lokasi, p.catatan].some(v => (v ?? "").toLowerCase().includes(s))) return false;
    }
    return true;
  });
  const totalPages = Math.max(1, Math.ceil(filtered.length / pageSize));
  const currentPage = Math.min(page, totalPages);
  const paged = filtered.slice((currentPage - 1) * pageSize, currentPage * pageSize);
  const headers = ["Nama", "Kategori", "Serial", "Polda", "Lokasi", "Jumlah", "Kondisi", "Catatan"];
  const exportData = () => filtered.map(p => [
    p.nama, p.kategori ?? "", p.serial_number ?? "", p.subden ?? "", p.lokasi ?? "",
    p.jumlah, p.kondisi, p.catatan ?? "",
  ]);

  return (
    <div>
      <PageHeader code="08" title="Peralatan & Sarpras" subtitle="Pendataan & monitoring peralatan Polda Bantis"
        actions={<>
          <button onClick={() => downloadCSV("peralatan-sarpras", headers, exportData())} className="inline-flex items-center gap-2 px-3 py-2 bg-secondary border border-border text-xs font-mono-display rounded hover:border-primary"><Download className="w-4 h-4" /> CSV</button>
          <button onClick={() => downloadPDF("Peralatan & Sarpras", headers, exportData())} className="inline-flex items-center gap-2 px-3 py-2 bg-secondary border border-border text-xs font-mono-display rounded hover:border-primary"><FileText className="w-4 h-4" /> PDF</button>
          <button onClick={() => { setEditingId(null); setForm(emptyForm); setShow(!show); }} className="inline-flex items-center gap-2 px-3 py-2 bg-primary text-primary-foreground text-xs font-mono-display rounded"><Plus className="w-4 h-4" /> TAMBAH</button>
        </>} />

      <Panel title="Filter & Pencarian" className="mb-4">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-2">
          <div className="relative">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
            <input value={q} onChange={e => setQ(e.target.value)} placeholder="Kata kunci..." className="w-full pl-9 pr-3 py-2 bg-input/40 border border-border rounded text-sm font-mono" />
          </div>
          <input value={fSubden} onChange={e => { setFSubden(e.target.value); setPage(1); }} placeholder="Polda..." className="px-3 py-2 bg-input/40 border border-border rounded text-sm font-mono" />
          <select value={fKondisi} onChange={e => setFKondisi(e.target.value)} className="px-3 py-2 bg-input/40 border border-border rounded text-sm font-mono">
            <option value="">Semua Kondisi</option>
            <option value="baik">Baik</option><option value="rusak_ringan">Rusak Ringan</option><option value="rusak_berat">Rusak Berat</option>
          </select>
        </div>
        <div className="mt-2 text-[10px] font-mono-display text-muted-foreground">{filtered.length} ITEM DITEMUKAN</div>
      </Panel>

      <div className="grid grid-cols-4 gap-2 mb-4">
        {Object.entries(stats).map(([k, v]) => (
          <div key={k} className="panel p-3">
            <div className="text-[10px] font-mono-display text-muted-foreground uppercase">{k.replace("_"," ")}</div>
            <div className="text-2xl font-bold font-mono-display text-glow-cyan">{v}</div>
          </div>
        ))}
      </div>

      {show && (
        <Panel title={editingId ? "Edit Peralatan" : "Tambah Peralatan"} className="mb-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            <div><label className={lbl}>NAMA</label><input className={inp} value={form.nama} onChange={e => setForm({...form, nama: e.target.value})} /></div>
            <div><label className={lbl}>KATEGORI</label><input className={inp} value={form.kategori} onChange={e => setForm({...form, kategori: e.target.value})} /></div>
            <div><label className={lbl}>SERIAL NUMBER</label><input className={inp} value={form.serial_number} onChange={e => setForm({...form, serial_number: e.target.value})} /></div>
            <div><label className={lbl}>POLDA</label><input className={inp} value={form.subden} onChange={e => setForm({...form, subden: e.target.value})} /></div>
            <div><label className={lbl}>LOKASI</label><input className={inp} value={form.lokasi} onChange={e => setForm({...form, lokasi: e.target.value})} /></div>
            <div><label className={lbl}>JUMLAH</label><input type="number" className={inp} value={form.jumlah} onChange={e => setForm({...form, jumlah: Number(e.target.value)})} /></div>
            <div><label className={lbl}>KONDISI</label>
              <select className={inp} value={form.kondisi} onChange={e => setForm({...form, kondisi: e.target.value})}>
                <option value="baik">Baik</option><option value="rusak_ringan">Rusak Ringan</option><option value="rusak_berat">Rusak Berat</option>
              </select>
            </div>
            <div className="md:col-span-3"><label className={lbl}>CATATAN</label><textarea className={inp} rows={2} value={form.catatan} onChange={e => setForm({...form, catatan: e.target.value})} /></div>
          </div>
          <div className="mt-3 flex gap-2">
            <button onClick={() => save.mutate()} disabled={save.isPending || !form.nama} className="px-4 py-2 bg-primary text-primary-foreground text-xs font-mono-display rounded disabled:opacity-50">
              {editingId ? "SIMPAN" : "TAMBAH"}
            </button>
            <button onClick={() => { setShow(false); setEditingId(null); setForm(emptyForm); }} className="px-4 py-2 border border-border text-xs font-mono-display rounded">BATAL</button>
          </div>
        </Panel>
      )}

      <Panel>
        <div className="overflow-x-auto">
          <table className="w-full text-xs">
            <thead><tr className="text-left text-muted-foreground font-mono-display border-b border-border">
              <th className="py-2 pr-3">NAMA</th><th className="py-2 pr-3">KATEGORI</th><th className="py-2 pr-3">POLDA</th>
              <th className="py-2 pr-3">JML</th><th className="py-2 pr-3">KONDISI</th><th className="py-2 pr-3">CATATAN</th>
              <th className="py-2 text-right">AKSI</th>
            </tr></thead>
            <tbody>
              {filtered.map(p => (
                <tr key={p.id} className="border-b border-border/30 hover:bg-accent/30">
                  <td className="py-2 pr-3 font-medium"><span className="inline-flex items-center gap-2"><Wrench className="w-3 h-3 text-primary" />{p.nama}</span></td>
                  <td className="py-2 pr-3 text-muted-foreground">{p.kategori ?? "—"}</td>
                  <td className="py-2 pr-3 text-muted-foreground">{p.subden ?? "—"}</td>
                  <td className="py-2 pr-3">{p.jumlah}</td>
                  <td className="py-2 pr-3"><Badge variant={kondisiBadge[p.kondisi as keyof typeof kondisiBadge]}>{p.kondisi}</Badge></td>
                  <td className="py-2 pr-3 text-muted-foreground">{p.perlu_perawatan && <AlertCircle className="w-3 h-3 inline text-amber-500" />} {p.catatan ?? "—"}</td>
                  <td className="py-2 text-right whitespace-nowrap">
                    <button onClick={() => startEdit(p)} className="inline-flex items-center gap-1 px-2 py-1 text-[10px] font-mono-display border border-border rounded hover:bg-accent">
                      <Pencil className="w-3 h-3" /> EDIT
                    </button>
                    <button onClick={() => { if (confirm(`Hapus ${p.nama}?`)) del.mutate(p.id); }}
                      className="ml-1 inline-flex items-center gap-1 px-2 py-1 text-[10px] font-mono-display border border-destructive/40 text-destructive rounded hover:bg-destructive/10">
                      <Trash2 className="w-3 h-3" /> HAPUS
                    </button>
                  </td>
                </tr>
              ))}
              {filtered.length === 0 && <tr><td colSpan={7} className="py-8 text-center text-muted-foreground font-mono">[ NO_DATA ]</td></tr>}
            </tbody>
          </table>
        </div>
      </Panel>
    </div>
  );
}
