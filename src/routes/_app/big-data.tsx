import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { PageHeader, Panel, Badge, URGENSI_VARIANT } from "@/components/ui-toc";
import { Search, Filter, Plus } from "lucide-react";

export const Route = createFileRoute("/_app/big-data")({ component: BigDataPage });

function BigDataPage() {
  const [q, setQ] = useState("");
  const [jenis, setJenis] = useState<string>("");
  const [urgensi, setUrgensi] = useState<string>("");
  const [polda, setPolda] = useState<string>("");

  const { data: rows } = useQuery({
    queryKey: ["bigdata", q, jenis, urgensi, polda],
    queryFn: async () => {
      let qb = supabase.from("laporan").select("*").order("created_at", { ascending: false }).limit(500);
      if (jenis) qb = qb.eq("jenis", jenis as never);
      if (urgensi) qb = qb.eq("urgensi", urgensi as never);
      if (polda) qb = qb.ilike("polda", `%${polda}%`);
      if (q) qb = qb.or(`judul.ilike.%${q}%,isi.ilike.%${q}%`);
      const { data } = await qb;
      return data ?? [];
    },
  });

  return (
    <div>
      <PageHeader code="02" title="Big Data Informasi" subtitle="Bank data informasi dari seluruh Subden Bantis"
        actions={<Link to="/laporan-baru" className="inline-flex items-center gap-2 px-3 py-2 bg-primary text-primary-foreground text-xs font-mono-display rounded"><Plus className="w-4 h-4" /> INPUT BARU</Link>} />

      <Panel title="Filter & Pencarian" className="mb-4">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-2">
          <div className="relative">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
            <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Kata kunci..."
              className="w-full pl-9 pr-3 py-2 bg-input/40 border border-border rounded-md text-sm font-mono" />
          </div>
          <select value={jenis} onChange={(e) => setJenis(e.target.value)} className="px-3 py-2 bg-input/40 border border-border rounded-md text-sm font-mono">
            <option value="">Semua Jenis</option>
            <option value="intelijen">Intelijen</option>
            <option value="cyber">Cyber</option>
            <option value="kejadian">Kejadian</option>
            <option value="kamtibmas">Kamtibmas</option>
          </select>
          <select value={urgensi} onChange={(e) => setUrgensi(e.target.value)} className="px-3 py-2 bg-input/40 border border-border rounded-md text-sm font-mono">
            <option value="">Semua Urgensi</option>
            <option value="rendah">Rendah</option>
            <option value="sedang">Sedang</option>
            <option value="tinggi">Tinggi</option>
            <option value="kritis">Kritis</option>
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
          <div key={r.id} className="panel scanline p-4">
            <div className="flex items-start justify-between gap-2 mb-2">
              <Badge variant="cyan">{r.jenis}</Badge>
              <Badge variant={URGENSI_VARIANT[r.urgensi as keyof typeof URGENSI_VARIANT]}>{r.urgensi}</Badge>
            </div>
            <h3 className="font-semibold text-sm mb-1 line-clamp-2">{r.judul}</h3>
            <p className="text-xs text-muted-foreground line-clamp-3">{r.isi}</p>
            <div className="mt-3 pt-3 border-t border-border/30 flex items-center justify-between text-[10px] font-mono-display text-muted-foreground">
              <span>{r.polda ?? "—"}</span>
              <span>{new Date(r.created_at).toLocaleDateString("id-ID")}</span>
            </div>
          </div>
        ))}
        {rows?.length === 0 && (
          <div className="col-span-full text-center py-12 text-muted-foreground font-mono text-xs">[ NO_DATA ]</div>
        )}
      </div>
    </div>
  );
}
