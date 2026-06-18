import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useRole } from "@/hooks/useRole";
import { PageHeader, Panel, Badge, URGENSI_VARIANT } from "@/components/ui-toc";
import { Search, Filter, Plus, Pencil, Trash2, X, Download, FileText, FileDown } from "lucide-react";
import { toast } from "sonner";
import { downloadCSV, downloadPDF, downloadSinglePDF } from "@/lib/export-utils";

export const Route = createFileRoute("/_app/big-data")({ component: BigDataPage });

type Row = {
  id: string; judul: string; isi: string; jenis: string; urgensi: string;
  polda: string | null; created_at: string; created_by: string | null;
};

function BigDataPage() {
  const { user } = useAuth();
  const { isAdmin } = useRole();
  const qc = useQueryClient();
  const [q, setQ] = useState("");
  const [jenis, setJenis] = useState<string>("");
  const [urgensi, setUrgensi] = useState<string>("");
  const [polda, setPolda] = useState<string>("");
  const [editing, setEditing] = useState<Row | null>(null);

  const { data: rows } = useQuery({
    queryKey: ["bigdata", q, jenis, urgensi, polda],
    queryFn: async () => {
      let qb = supabase.from("laporan").select("*").order("created_at", { ascending: false }).limit(500);
      if (jenis) qb = qb.eq("jenis", jenis as never);
      if (urgensi) qb = qb.eq("urgensi", urgensi as never);
      if (polda) qb = qb.ilike("polda", `%${polda}%`);
      if (q) qb = qb.or(`judul.ilike.%${q}%,isi.ilike.%${q}%`);
      const { data } = await qb;
      return (data ?? []) as Row[];
    },
  });

  const del = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("laporan").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => { toast.success("Laporan dihapus"); qc.invalidateQueries({ queryKey: ["bigdata"] }); },
    onError: (e) => toast.error(e instanceof Error ? e.message : "Gagal"),
  });

  const upd = useMutation({
    mutationFn: async () => {
      if (!editing) return;
      const { error } = await supabase.from("laporan").update({
        judul: editing.judul, isi: editing.isi, urgensi: editing.urgensi as never,
        polda: editing.polda,
      }).eq("id", editing.id);
      if (error) throw error;
    },
    onSuccess: () => { toast.success("Laporan diperbarui"); setEditing(null); qc.invalidateQueries({ queryKey: ["bigdata"] }); },
    onError: (e) => toast.error(e instanceof Error ? e.message : "Gagal"),
  });

  const canEdit = (r: Row) => isAdmin || r.created_by === user?.id;

  const exportData = () => (rows ?? []).map(r => [
    r.judul, r.jenis, r.urgensi, r.polda ?? "", new Date(r.created_at).toLocaleString("id-ID"), r.isi,
  ]);
  const headers = ["Judul", "Jenis", "Urgensi", "Polda", "Tanggal", "Isi"];

  return (
    <div>
      <PageHeader code="02" title="Big Data Informasi" subtitle="Bank data informasi dari seluruh Subden Bantis"
        actions={<>
          <button onClick={() => downloadCSV("big-data-informasi", headers, exportData())} className="inline-flex items-center gap-2 px-3 py-2 bg-secondary border border-border text-xs font-mono-display rounded hover:border-primary"><Download className="w-4 h-4" /> CSV</button>
          <button onClick={() => downloadPDF("Big Data Informasi", headers, exportData())} className="inline-flex items-center gap-2 px-3 py-2 bg-secondary border border-border text-xs font-mono-display rounded hover:border-primary"><FileText className="w-4 h-4" /> PDF</button>
          <Link to="/laporan-baru" className="inline-flex items-center gap-2 px-3 py-2 bg-primary text-primary-foreground text-xs font-mono-display rounded"><Plus className="w-4 h-4" /> INPUT BARU</Link>
        </>} />

      <Panel title="Filter & Pencarian" className="mb-4">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-2">
          <div className="relative">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
            <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Kata kunci..."
              className="w-full pl-9 pr-3 py-2 bg-input/40 border border-border rounded-md text-sm font-mono" />
          </div>
          <select value={jenis} onChange={(e) => setJenis(e.target.value)} className="px-3 py-2 bg-input/40 border border-border rounded-md text-sm font-mono">
            <option value="">Semua Jenis</option>
            <option value="intelijen">Intelijen</option><option value="cyber">Cyber</option>
            <option value="kejadian">Kejadian</option><option value="kamtibmas">Kamtibmas</option>
          </select>
          <select value={urgensi} onChange={(e) => setUrgensi(e.target.value)} className="px-3 py-2 bg-input/40 border border-border rounded-md text-sm font-mono">
            <option value="">Semua Urgensi</option>
            <option value="rendah">Rendah</option><option value="sedang">Sedang</option>
            <option value="tinggi">Tinggi</option><option value="kritis">Kritis</option>
          </select>
          <input value={polda} onChange={(e) => setPolda(e.target.value)} placeholder="Polda..."
            className="px-3 py-2 bg-input/40 border border-border rounded-md text-sm font-mono" />
        </div>
        <div className="mt-2 text-[10px] font-mono-display text-muted-foreground flex items-center gap-1.5">
          <Filter className="w-3 h-3" /> {rows?.length ?? 0} HASIL DITEMUKAN
        </div>
      </Panel>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
        {rows?.map((r) => (
          <div key={r.id} className="panel scanline p-4 flex flex-col">
            <div className="flex items-start justify-between gap-2 mb-2">
              <Badge variant="cyan">{r.jenis}</Badge>
              <Badge variant={URGENSI_VARIANT[r.urgensi as keyof typeof URGENSI_VARIANT]}>{r.urgensi}</Badge>
            </div>
            <h3 className="font-semibold text-sm mb-1 line-clamp-2">{r.judul}</h3>
            <p className="text-xs text-muted-foreground line-clamp-3 flex-1">{r.isi}</p>
            <div className="mt-3 pt-3 border-t border-border/30 flex items-center justify-between text-[10px] font-mono-display text-muted-foreground">
              <span>{r.polda ?? "—"}</span>
              <span>{new Date(r.created_at).toLocaleDateString("id-ID")}</span>
            </div>
            <div className="mt-2 flex gap-1.5">
              <button
                onClick={() => downloadSinglePDF(
                  `Laporan_${r.judul.slice(0, 40)}`,
                  r.judul,
                  r.isi,
                  {
                    Jenis: r.jenis,
                    Urgensi: r.urgensi,
                    Polda: r.polda ?? "—",
                    Tanggal: new Date(r.created_at).toLocaleDateString("id-ID"),
                  }
                )}
                className="flex-1 inline-flex items-center justify-center gap-1 px-2 py-1 text-[10px] font-mono-display border border-border rounded hover:bg-accent"
              >
                <FileDown className="w-3 h-3" /> PDF
              </button>
              {canEdit(r) && (
                <>
                  <button onClick={() => setEditing(r)} className="flex-1 inline-flex items-center justify-center gap-1 px-2 py-1 text-[10px] font-mono-display border border-border rounded hover:bg-accent">
                    <Pencil className="w-3 h-3" /> EDIT
                  </button>
                  <button
                    onClick={() => { if (confirm(`Hapus "${r.judul}"?`)) del.mutate(r.id); }}
                    className="flex-1 inline-flex items-center justify-center gap-1 px-2 py-1 text-[10px] font-mono-display border border-destructive/40 text-destructive rounded hover:bg-destructive/10"
                  >
                    <Trash2 className="w-3 h-3" /> HAPUS
                  </button>
                </>
              )}
            </div>
          </div>
        ))}
        {rows?.length === 0 && (
          <div className="col-span-full text-center py-12 text-muted-foreground font-mono text-xs">[ NO_DATA ]</div>
        )}
      </div>

      {editing && (
        <div className="fixed inset-0 z-50 bg-black/70 flex items-center justify-center p-4" onClick={() => setEditing(null)}>
          <div className="panel p-6 w-full max-w-lg" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-4">
              <h2 className="font-mono-display text-sm tracking-widest text-primary">[ EDIT_LAPORAN ]</h2>
              <button onClick={() => setEditing(null)}><X className="w-4 h-4" /></button>
            </div>
            <form onSubmit={(e) => { e.preventDefault(); upd.mutate(); }} className="space-y-3">
              <input className="w-full px-3 py-2 bg-input/40 border border-border rounded text-sm font-mono"
                value={editing.judul} onChange={(e) => setEditing({ ...editing, judul: e.target.value })} placeholder="Judul" required />
              <textarea rows={5} className="w-full px-3 py-2 bg-input/40 border border-border rounded text-sm font-mono"
                value={editing.isi} onChange={(e) => setEditing({ ...editing, isi: e.target.value })} placeholder="Isi" required />
              <div className="grid grid-cols-2 gap-3">
                <input className="px-3 py-2 bg-input/40 border border-border rounded text-sm font-mono"
                  value={editing.polda ?? ""} onChange={(e) => setEditing({ ...editing, polda: e.target.value })} placeholder="Polda" />
                <select className="px-3 py-2 bg-input/40 border border-border rounded text-sm font-mono"
                  value={editing.urgensi} onChange={(e) => setEditing({ ...editing, urgensi: e.target.value })}>
                  <option value="rendah">Rendah</option><option value="sedang">Sedang</option>
                  <option value="tinggi">Tinggi</option><option value="kritis">Kritis</option>
                </select>
              </div>
              <button type="submit" disabled={upd.isPending} className="w-full py-2 bg-primary text-primary-foreground font-mono-display text-xs rounded disabled:opacity-50">
                {upd.isPending ? "[ MENYIMPAN... ]" : "[ SIMPAN ]"}
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
