import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { PageHeader, Panel, Badge } from "@/components/ui-toc";
import { Wrench, Plus, AlertCircle } from "lucide-react";
import { toast } from "sonner";

export const Route = createFileRoute("/_app/peralatan")({ component: PeralatanPage });

function PeralatanPage() {
  const qc = useQueryClient();
  const [show, setShow] = useState(false);
  const [form, setForm] = useState({ nama: "", kategori: "", serial_number: "", subden: "", lokasi: "", kondisi: "baik", jumlah: 1, catatan: "" });

  const { data } = useQuery({
    queryKey: ["peralatan"],
    queryFn: async () => {
      const { data } = await supabase.from("peralatan").select("*").order("created_at", { ascending: false });
      return data ?? [];
    },
  });

  const add = useMutation({
    mutationFn: async () => {
      const { error } = await supabase.from("peralatan").insert({ ...form, jumlah: Number(form.jumlah) } as never);
      if (error) throw error;
    },
    onSuccess: () => { toast.success("Peralatan ditambahkan"); setShow(false); qc.invalidateQueries({ queryKey: ["peralatan"] }); },
    onError: (e) => toast.error(e instanceof Error ? e.message : "Hanya admin yang dapat menambah"),
  });

  const inp = "w-full px-3 py-2 bg-input/40 border border-border rounded text-sm font-mono";
  const lbl = "block text-[10px] font-mono-display text-muted-foreground mb-1";

  const kondisiBadge = { baik: "green", rusak_ringan: "amber", rusak_berat: "red" } as const;

  const stats = {
    total: data?.length ?? 0,
    baik: data?.filter(d => d.kondisi === "baik").length ?? 0,
    rusak_ringan: data?.filter(d => d.kondisi === "rusak_ringan").length ?? 0,
    rusak_berat: data?.filter(d => d.kondisi === "rusak_berat").length ?? 0,
  };

  return (
    <div>
      <PageHeader code="08" title="Peralatan & Sarpras" subtitle="Pendataan & monitoring peralatan Subden Bantis"
        actions={<button onClick={() => setShow(!show)} className="inline-flex items-center gap-2 px-3 py-2 bg-primary text-primary-foreground text-xs font-mono-display rounded"><Plus className="w-4 h-4" /> TAMBAH</button>} />

      <div className="grid grid-cols-4 gap-2 mb-4">
        {Object.entries(stats).map(([k, v]) => (
          <div key={k} className="panel p-3">
            <div className="text-[10px] font-mono-display text-muted-foreground uppercase">{k.replace("_"," ")}</div>
            <div className="text-2xl font-bold font-mono-display text-glow-cyan">{v}</div>
          </div>
        ))}
      </div>

      {show && (
        <Panel title="Tambah Peralatan" className="mb-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            <div><label className={lbl}>NAMA</label><input className={inp} value={form.nama} onChange={e => setForm({...form, nama: e.target.value})} /></div>
            <div><label className={lbl}>KATEGORI</label><input className={inp} value={form.kategori} onChange={e => setForm({...form, kategori: e.target.value})} /></div>
            <div><label className={lbl}>SERIAL NUMBER</label><input className={inp} value={form.serial_number} onChange={e => setForm({...form, serial_number: e.target.value})} /></div>
            <div><label className={lbl}>SUBDEN</label><input className={inp} value={form.subden} onChange={e => setForm({...form, subden: e.target.value})} /></div>
            <div><label className={lbl}>LOKASI</label><input className={inp} value={form.lokasi} onChange={e => setForm({...form, lokasi: e.target.value})} /></div>
            <div><label className={lbl}>JUMLAH</label><input type="number" className={inp} value={form.jumlah} onChange={e => setForm({...form, jumlah: Number(e.target.value)})} /></div>
            <div><label className={lbl}>KONDISI</label>
              <select className={inp} value={form.kondisi} onChange={e => setForm({...form, kondisi: e.target.value})}>
                <option value="baik">Baik</option><option value="rusak_ringan">Rusak Ringan</option><option value="rusak_berat">Rusak Berat</option>
              </select>
            </div>
            <div className="md:col-span-3"><label className={lbl}>CATATAN</label><textarea className={inp} rows={2} value={form.catatan} onChange={e => setForm({...form, catatan: e.target.value})} /></div>
          </div>
          <button onClick={() => add.mutate()} disabled={add.isPending} className="mt-3 px-4 py-2 bg-primary text-primary-foreground text-xs font-mono-display rounded">SIMPAN</button>
        </Panel>
      )}

      <Panel>
        <div className="overflow-x-auto">
          <table className="w-full text-xs">
            <thead><tr className="text-left text-muted-foreground font-mono-display border-b border-border">
              <th className="py-2 pr-3">NAMA</th><th className="py-2 pr-3">KATEGORI</th><th className="py-2 pr-3">SUBDEN</th>
              <th className="py-2 pr-3">JML</th><th className="py-2 pr-3">KONDISI</th><th className="py-2">CATATAN</th>
            </tr></thead>
            <tbody>
              {data?.map(p => (
                <tr key={p.id} className="border-b border-border/30 hover:bg-accent/30">
                  <td className="py-2 pr-3 font-medium flex items-center gap-2"><Wrench className="w-3 h-3 text-primary" />{p.nama}</td>
                  <td className="py-2 pr-3 text-muted-foreground">{p.kategori ?? "—"}</td>
                  <td className="py-2 pr-3 text-muted-foreground">{p.subden ?? "—"}</td>
                  <td className="py-2 pr-3">{p.jumlah}</td>
                  <td className="py-2 pr-3"><Badge variant={kondisiBadge[p.kondisi as keyof typeof kondisiBadge]}>{p.kondisi}</Badge></td>
                  <td className="py-2 text-muted-foreground">{p.perlu_perawatan && <AlertCircle className="w-3 h-3 inline text-amber-500" />} {p.catatan ?? "—"}</td>
                </tr>
              ))}
              {data?.length === 0 && <tr><td colSpan={6} className="py-8 text-center text-muted-foreground font-mono">[ NO_DATA ]</td></tr>}
            </tbody>
          </table>
        </div>
      </Panel>
    </div>
  );
}
