import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { PageHeader, Panel, Badge } from "@/components/ui-toc";
import { ExternalLink, Plus, Shield } from "lucide-react";
import { toast } from "sonner";

export const Route = createFileRoute("/_app/tools")({ component: ToolsPage });

function ToolsPage() {
  const qc = useQueryClient();
  const [show, setShow] = useState(false);
  const [form, setForm] = useState({ nama: "", url: "", kategori: "Internal", deskripsi: "" });

  const { data } = useQuery({
    queryKey: ["tools"],
    queryFn: async () => {
      const { data } = await supabase.from("tools_links").select("*").order("kategori");
      return data ?? [];
    },
  });

  const add = useMutation({
    mutationFn: async () => {
      const { error } = await supabase.from("tools_links").insert(form as never);
      if (error) throw error;
    },
    onSuccess: () => { toast.success("Tool ditambahkan"); setShow(false); qc.invalidateQueries({ queryKey: ["tools"] }); },
    onError: (e) => toast.error(e instanceof Error ? e.message : "Hanya admin"),
  });

  const grouped = (data ?? []).reduce<Record<string, typeof data>>((acc, t) => {
    const k = t.kategori ?? "Lainnya";
    (acc[k] ??= [] as never).push(t as never); return acc;
  }, {});

  return (
    <div>
      <PageHeader code="14" title="Link Tools TOC" subtitle="Kumpulan link internal: VPN, dashboard monitoring, aplikasi pendukung"
        actions={<button onClick={() => setShow(!show)} className="inline-flex items-center gap-2 px-3 py-2 bg-primary text-primary-foreground text-xs font-mono-display rounded"><Plus className="w-4 h-4" /> TAMBAH</button>} />

      {show && (
        <Panel title="Tambah Tool" className="mb-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <input placeholder="Nama" className="px-3 py-2 bg-input/40 border border-border rounded text-sm font-mono" value={form.nama} onChange={e => setForm({...form, nama: e.target.value})} />
            <input placeholder="URL" className="px-3 py-2 bg-input/40 border border-border rounded text-sm font-mono" value={form.url} onChange={e => setForm({...form, url: e.target.value})} />
            <input placeholder="Kategori (VPN/Internal/Dashboard/External)" className="px-3 py-2 bg-input/40 border border-border rounded text-sm font-mono" value={form.kategori} onChange={e => setForm({...form, kategori: e.target.value})} />
            <input placeholder="Deskripsi" className="px-3 py-2 bg-input/40 border border-border rounded text-sm font-mono" value={form.deskripsi} onChange={e => setForm({...form, deskripsi: e.target.value})} />
          </div>
          <button onClick={() => add.mutate()} disabled={add.isPending} className="mt-3 px-4 py-2 bg-primary text-primary-foreground text-xs font-mono-display rounded">SIMPAN</button>
        </Panel>
      )}

      {Object.keys(grouped).length === 0 && (
        <Panel>
          <div className="text-center py-12 text-muted-foreground font-mono text-xs">
            <Shield className="w-12 h-12 mx-auto mb-3 opacity-30" />
            [ BELUM ADA TOOL ]
            <p className="mt-2 normal-case font-sans">Contoh: VPN Polri, Dashboard Monitoring, INTRA, e-MP, dll.</p>
          </div>
        </Panel>
      )}

      {Object.entries(grouped).map(([kat, items]) => (
        <Panel key={kat} title={kat} className="mb-4">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
            {(items as never as typeof data)!.map(t => (
              <a key={t.id} href={t.url} target="_blank" rel="noreferrer"
                className="panel scanline p-3 hover:border-primary transition group">
                <div className="flex items-start justify-between mb-2">
                  <Badge variant="cyan">{t.kategori}</Badge>
                  <ExternalLink className="w-4 h-4 text-muted-foreground group-hover:text-primary" />
                </div>
                <div className="font-semibold text-sm">{t.nama}</div>
                <div className="text-xs text-muted-foreground line-clamp-2 mt-1">{t.deskripsi}</div>
                <div className="text-[10px] font-mono text-muted-foreground/60 mt-2 truncate">{t.url}</div>
              </a>
            ))}
          </div>
        </Panel>
      ))}
    </div>
  );
}
