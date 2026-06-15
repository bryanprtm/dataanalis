import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { PageHeader, Panel, Badge } from "@/components/ui-toc";
import { Users, Plus, Pencil, Trash2, Download, FileText, Search, AlertCircle } from "lucide-react";
import { toast } from "sonner";
import { downloadCSV, downloadPDF } from "@/lib/export-utils";

export const Route = createFileRoute("/_app/personil")({ component: PersonilPage });

type Row = {
  id: string;
  subden: string;
  polda: string | null;
  satuan: string | null;
  dsp: number;
  riil: number;
  pelatihan: string[];
  catatan: string | null;
};

const emptyForm = { subden: "", polda: "", satuan: "Sat Bantek", dsp: 0, riil: 0, pelatihan: "", catatan: "" };

function PersonilPage() {
  const qc = useQueryClient();
  const [show, setShow] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState(emptyForm);
  const [q, setQ] = useState("");
  const [fStatus, setFStatus] = useState("");

  const { data } = useQuery({
    queryKey: ["personil"],
    queryFn: async () => {
      const { data } = await supabase.from("personil" as never).select("*").order("subden", { ascending: true });
      return ((data ?? []) as unknown as Row[]).map(r => ({
        ...r,
        pelatihan: Array.isArray(r.pelatihan) ? r.pelatihan : [],
      }));
    },
  });

  const save = useMutation({
    mutationFn: async () => {
      const pelatihanArr = form.pelatihan.split(",").map(s => s.trim()).filter(Boolean);
      const payload = {
        subden: form.subden,
        polda: form.polda || null,
        satuan: form.satuan || null,
        dsp: Number(form.dsp),
        riil: Number(form.riil),
        pelatihan: pelatihanArr,
        catatan: form.catatan || null,
      };
      if (editingId) {
        const { error } = await supabase.from("personil" as never).update(payload as never).eq("id", editingId);
        if (error) throw error;
      } else {
        const { data: u } = await supabase.auth.getUser();
        const { error } = await supabase.from("personil" as never).insert({ ...payload, created_by: u.user?.id } as never);
        if (error) throw error;
      }
    },
    onSuccess: () => {
      toast.success(editingId ? "Data personil diperbarui" : "Data personil ditambahkan");
      setShow(false); setEditingId(null); setForm(emptyForm);
      qc.invalidateQueries({ queryKey: ["personil"] });
    },
    onError: (e) => toast.error(e instanceof Error ? e.message : "Gagal"),
  });

  const del = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("personil" as never).delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => { toast.success("Data personil dihapus"); qc.invalidateQueries({ queryKey: ["personil"] }); },
    onError: (e) => toast.error(e instanceof Error ? e.message : "Gagal"),
  });

  const startEdit = (r: Row) => {
    setEditingId(r.id);
    setForm({
      subden: r.subden, polda: r.polda ?? "", satuan: r.satuan ?? "Sat Bantek",
      dsp: r.dsp, riil: r.riil, pelatihan: (r.pelatihan ?? []).join(", "), catatan: r.catatan ?? "",
    });
    setShow(true);
  };

  const inp = "w-full px-3 py-2 bg-input/40 border border-border rounded text-sm font-mono";
  const lbl = "block text-[10px] font-mono-display text-muted-foreground mb-1";

  const rows = data ?? [];
  const totals = {
    dsp: rows.reduce((a, r) => a + r.dsp, 0),
    riil: rows.reduce((a, r) => a + r.riil, 0),
    kurang: rows.reduce((a, r) => a + Math.max(0, r.dsp - r.riil), 0),
    unit: rows.length,
  };

  const filtered = rows.filter(r => {
    const kurang = r.dsp - r.riil;
    if (fStatus === "kurang" && kurang <= 0) return false;
    if (fStatus === "cukup" && kurang > 0) return false;
    if (q) {
      const s = q.toLowerCase();
      if (![r.subden, r.polda, r.satuan, r.catatan, (r.pelatihan ?? []).join(" ")].some(v => (v ?? "").toLowerCase().includes(s))) return false;
    }
    return true;
  });

  const headers = ["Subden", "Polda", "Satuan", "DSP", "Riil", "Kurang", "Pelatihan/Keahlian", "Catatan"];
  const exportData = () => filtered.map(r => [
    r.subden, r.polda ?? "", r.satuan ?? "", r.dsp, r.riil, Math.max(0, r.dsp - r.riil),
    (r.pelatihan ?? []).join("; "), r.catatan ?? "",
  ]);

  return (
    <div>
      <PageHeader code="16" title="Data Personil" subtitle="DSP, Riil, Kekurangan & Pelatihan/Keahlian"
        actions={<>
          <button onClick={() => downloadCSV("data-personil", headers, exportData())} className="inline-flex items-center gap-2 px-3 py-2 bg-secondary border border-border text-xs font-mono-display rounded hover:border-primary"><Download className="w-4 h-4" /> CSV</button>
          <button onClick={() => downloadPDF("Data Personil", headers, exportData())} className="inline-flex items-center gap-2 px-3 py-2 bg-secondary border border-border text-xs font-mono-display rounded hover:border-primary"><FileText className="w-4 h-4" /> PDF</button>
          <button onClick={() => { setEditingId(null); setForm(emptyForm); setShow(!show); }} className="inline-flex items-center gap-2 px-3 py-2 bg-primary text-primary-foreground text-xs font-mono-display rounded"><Plus className="w-4 h-4" /> TAMBAH</button>
        </>} />

      <div className="grid grid-cols-2 md:grid-cols-4 gap-2 mb-4">
        <div className="panel p-3"><div className="text-[10px] font-mono-display text-muted-foreground uppercase">Unit Subden</div><div className="text-2xl font-bold font-mono-display text-glow-cyan">{totals.unit}</div></div>
        <div className="panel p-3"><div className="text-[10px] font-mono-display text-muted-foreground uppercase">Total DSP</div><div className="text-2xl font-bold font-mono-display text-glow-cyan">{totals.dsp}</div></div>
        <div className="panel p-3"><div className="text-[10px] font-mono-display text-muted-foreground uppercase">Total Riil</div><div className="text-2xl font-bold font-mono-display text-glow-cyan">{totals.riil}</div></div>
        <div className="panel p-3"><div className="text-[10px] font-mono-display text-muted-foreground uppercase">Kekurangan</div><div className="text-2xl font-bold font-mono-display text-destructive">{totals.kurang}</div></div>
      </div>

      <Panel title="Filter & Pencarian" className="mb-4">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
          <div className="relative">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
            <input value={q} onChange={e => setQ(e.target.value)} placeholder="Cari subden, polda, pelatihan..." className="w-full pl-9 pr-3 py-2 bg-input/40 border border-border rounded text-sm font-mono" />
          </div>
          <select value={fStatus} onChange={e => setFStatus(e.target.value)} className="px-3 py-2 bg-input/40 border border-border rounded text-sm font-mono">
            <option value="">Semua Status</option>
            <option value="kurang">Hanya Kekurangan</option>
            <option value="cukup">Personil Cukup</option>
          </select>
        </div>
        <div className="mt-2 text-[10px] font-mono-display text-muted-foreground">{filtered.length} UNIT DITEMUKAN</div>
      </Panel>

      {show && (
        <Panel title={editingId ? "Edit Data Personil" : "Tambah Data Personil"} className="mb-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            <div><label className={lbl}>SUBDEN</label><input className={inp} value={form.subden} onChange={e => setForm({...form, subden: e.target.value})} /></div>
            <div><label className={lbl}>POLDA</label><input className={inp} value={form.polda} onChange={e => setForm({...form, polda: e.target.value})} /></div>
            <div><label className={lbl}>SATUAN</label><input className={inp} value={form.satuan} onChange={e => setForm({...form, satuan: e.target.value})} /></div>
            <div><label className={lbl}>JUMLAH DSP</label><input type="number" min={0} className={inp} value={form.dsp} onChange={e => setForm({...form, dsp: Number(e.target.value)})} /></div>
            <div><label className={lbl}>JUMLAH RIIL PERSONIL</label><input type="number" min={0} className={inp} value={form.riil} onChange={e => setForm({...form, riil: Number(e.target.value)})} /></div>
            <div><label className={lbl}>KEKURANGAN (otomatis)</label><input disabled className={inp + " opacity-60"} value={Math.max(0, Number(form.dsp) - Number(form.riil))} /></div>
            <div className="md:col-span-3"><label className={lbl}>PELATIHAN / KEAHLIAN (pisahkan koma)</label><input className={inp} placeholder="Contoh: Jibom, Wanteror, SAR, Selam, Cyber" value={form.pelatihan} onChange={e => setForm({...form, pelatihan: e.target.value})} /></div>
            <div className="md:col-span-3"><label className={lbl}>CATATAN</label><textarea className={inp} rows={2} value={form.catatan} onChange={e => setForm({...form, catatan: e.target.value})} /></div>
          </div>
          <div className="mt-3 flex gap-2">
            <button onClick={() => save.mutate()} disabled={save.isPending || !form.subden} className="px-4 py-2 bg-primary text-primary-foreground text-xs font-mono-display rounded disabled:opacity-50">
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
              <th className="py-2 pr-3">SUBDEN</th><th className="py-2 pr-3">POLDA</th>
              <th className="py-2 pr-3 text-right">DSP</th><th className="py-2 pr-3 text-right">RIIL</th><th className="py-2 pr-3 text-right">KURANG</th>
              <th className="py-2 pr-3">PELATIHAN / KEAHLIAN</th><th className="py-2 pr-3">CATATAN</th>
              <th className="py-2 text-right">AKSI</th>
            </tr></thead>
            <tbody>
              {filtered.map(r => {
                const kurang = r.dsp - r.riil;
                return (
                  <tr key={r.id} className="border-b border-border/30 hover:bg-accent/30 align-top">
                    <td className="py-2 pr-3 font-medium"><span className="inline-flex items-center gap-2"><Users className="w-3 h-3 text-primary" />{r.subden}</span></td>
                    <td className="py-2 pr-3 text-muted-foreground">{r.polda ?? "—"}</td>
                    <td className="py-2 pr-3 text-right font-mono">{r.dsp}</td>
                    <td className="py-2 pr-3 text-right font-mono">{r.riil}</td>
                    <td className="py-2 pr-3 text-right">
                      {kurang > 0
                        ? <Badge variant="red">-{kurang}</Badge>
                        : kurang < 0 ? <Badge variant="amber">+{-kurang}</Badge> : <Badge variant="green">0</Badge>}
                    </td>
                    <td className="py-2 pr-3">
                      <div className="flex flex-wrap gap-1 max-w-[280px]">
                        {(r.pelatihan ?? []).length === 0 && <span className="text-muted-foreground">—</span>}
                        {(r.pelatihan ?? []).map((p, i) => <Badge key={i} variant="cyan">{p}</Badge>)}
                      </div>
                    </td>
                    <td className="py-2 pr-3 text-muted-foreground max-w-[200px]">
                      {kurang > 0 && <AlertCircle className="w-3 h-3 inline text-amber-500 mr-1" />}
                      {r.catatan ?? "—"}
                    </td>
                    <td className="py-2 text-right whitespace-nowrap">
                      <button onClick={() => startEdit(r)} className="inline-flex items-center gap-1 px-2 py-1 text-[10px] font-mono-display border border-border rounded hover:bg-accent">
                        <Pencil className="w-3 h-3" /> EDIT
                      </button>
                      <button onClick={() => { if (confirm(`Hapus data ${r.subden}?`)) del.mutate(r.id); }}
                        className="ml-1 inline-flex items-center gap-1 px-2 py-1 text-[10px] font-mono-display border border-destructive/40 text-destructive rounded hover:bg-destructive/10">
                        <Trash2 className="w-3 h-3" /> HAPUS
                      </button>
                    </td>
                  </tr>
                );
              })}
              {filtered.length === 0 && <tr><td colSpan={8} className="py-8 text-center text-muted-foreground font-mono">[ NO_DATA ]</td></tr>}
            </tbody>
          </table>
        </div>
      </Panel>
    </div>
  );
}
