import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { PageHeader, Panel, Badge } from "@/components/ui-toc";
import { Archive as ArchiveIcon, Search } from "lucide-react";

export const Route = createFileRoute("/_app/arsip")({ component: ArsipPage });

function ArsipPage() {
  const [q, setQ] = useState("");
  const [kat, setKat] = useState("");
  const { data } = useQuery({
    queryKey: ["arsip", q, kat],
    queryFn: async () => {
      let qb = supabase.from("arsip").select("*").order("created_at", { ascending: false });
      if (kat) qb = qb.eq("kategori", kat as never);
      if (q) qb = qb.or(`judul.ilike.%${q}%,nomor.ilike.%${q}%`);
      const { data } = await qb;
      return data ?? [];
    },
  });

  return (
    <div>
      <PageHeader code="07" title="Data Arsip" subtitle="Penyimpanan dan pencarian arsip digital" />
      <Panel className="mb-4">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
          <div className="relative">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
            <input value={q} onChange={e => setQ(e.target.value)} placeholder="Cari nomor / judul..." className="w-full pl-9 pr-3 py-2 bg-input/40 border border-border rounded text-sm font-mono" />
          </div>
          <select value={kat} onChange={e => setKat(e.target.value)} className="px-3 py-2 bg-input/40 border border-border rounded text-sm font-mono">
            <option value="">Semua Kategori</option>
            <option value="laporan">Laporan</option><option value="surat">Surat</option>
            <option value="dokumentasi">Dokumentasi</option><option value="intelijen">Intelijen</option>
            <option value="cyber">Cyber</option><option value="peralatan">Peralatan</option>
          </select>
        </div>
      </Panel>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
        {data?.map(a => (
          <div key={a.id} className="panel scanline p-4">
            <div className="flex items-start justify-between mb-2">
              <ArchiveIcon className="w-4 h-4 text-primary" />
              <Badge variant="cyan">{a.kategori}</Badge>
            </div>
            <div className="text-[10px] font-mono text-muted-foreground">{a.nomor ?? "—"}</div>
            <h3 className="font-semibold text-sm mt-1 line-clamp-2">{a.judul}</h3>
            <p className="text-xs text-muted-foreground line-clamp-2 mt-1">{a.deskripsi}</p>
            <div className="mt-2 text-[10px] font-mono text-muted-foreground">{a.wilayah ?? "—"} · {a.tanggal ?? "—"}</div>
          </div>
        ))}
        {data?.length === 0 && <div className="col-span-full text-center py-12 text-muted-foreground font-mono text-xs">[ ARSIP KOSONG ]</div>}
      </div>
    </div>
  );
}
