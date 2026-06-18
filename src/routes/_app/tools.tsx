import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { PageHeader, Panel, Badge } from "@/components/ui-toc";
import { ExternalLink, Plus, Shield, Pencil, Trash2 } from "lucide-react";
import { toast } from "sonner";

export const Route = createFileRoute("/_app/tools")({ component: ToolsPage });

type ToolForm = { nama: string; url: string; kategori: string; deskripsi: string };
const emptyForm: ToolForm = { nama: "", url: "", kategori: "Internal", deskripsi: "" };

function ToolsPage() {
  const qc = useQueryClient();
  const [show, setShow] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);
  const [form, setForm] = useState<ToolForm>(emptyForm);

  const { data } = useQuery({
    queryKey: ["tools"],
    queryFn: async () => {
      const { data } = await supabase.from("tools_links").select("*").order("kategori");
      return data ?? [];
    },
  });

  const save = useMutation({
    mutationFn: async () => {
      if (editId) {
        const { error } = await supabase.from("tools_links").update(form as never).eq("id", editId);
        if (error) throw error;
      } else {
        const { error } = await supabase.from("tools_links").insert(form as never);
        if (error) throw error;
      }
    },
    onSuccess: () => {
      toast.success(editId ? "Tool diperbarui" : "Tool ditambahkan");
      setShow(false); setEditId(null); setForm(emptyForm);
      qc.invalidateQueries({ queryKey: ["tools"] });
    },
    onError: (e) => toast.error(e instanceof Error ? e.message : "Hanya admin"),
  });

  const del = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("tools_links").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => { toast.success("Tool dihapus"); qc.invalidateQueries({ queryKey: ["tools"] }); },
    onError: (e) => toast.error(e instanceof Error ? e.message : "Hanya admin"),
  });

  const startEdit = (t: { id: string; nama: string; url: string; kategori: string | null; deskripsi: string | null }) => {
    setEditId(t.id);
    setForm({ nama: t.nama, url: t.url, kategori: t.kategori ?? "Internal", deskripsi: t.deskripsi ?? "" });
    setShow(true);
  };

  const startAdd = () => {
    setEditId(null); setForm(emptyForm); setShow(!show);
  };

  const grouped = (data ?? []).reduce<Record<string, typeof data>>((acc, t) => {
    const k = t.kategori ?? "Lainnya";
    (acc[k] ??= [] as never).push(t as never); return acc;
  }, {});

  return (
    <div>
      <PageHeader code="14" title="Link Tools TOC" subtitle="Kumpulan link internal: VPN, dashboard monitoring, aplikasi pendukung"
        actions={<button onClick={startAdd} className="inline-flex items-center gap-2 px-3 py-2 bg-primary text-primary-foreground text-xs font-mono-display rounded"><Plus className="w-4 h-4" /> TAMBAH</button>} />

      {show && (
        <Panel title={editId ? "Edit Tool" : "Tambah Tool"} className="mb-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <input placeholder="Nama" className="px-3 py-2 bg-input/40 border border-border rounded text-sm font-mono" value={form.nama} onChange={e => setForm({...form, nama: e.target.value})} />
            <input placeholder="URL" className="px-3 py-2 bg-input/40 border border-border rounded text-sm font-mono" value={form.url} onChange={e => setForm({...form, url: e.target.value})} />
            <input placeholder="Kategori (VPN/Internal/Dashboard/External)" className="px-3 py-2 bg-input/40 border border-border rounded text-sm font-mono" value={form.kategori} onChange={e => setForm({...form, kategori: e.target.value})} />
            <input placeholder="Deskripsi" className="px-3 py-2 bg-input/40 border border-border rounded text-sm font-mono" value={form.deskripsi} onChange={e => setForm({...form, deskripsi: e.target.value})} />
          </div>
          <div className="mt-3 flex gap-2">
            <button onClick={() => save.mutate()} disabled={save.isPending} className="px-4 py-2 bg-primary text-primary-foreground text-xs font-mono-display rounded">SIMPAN</button>
            <button onClick={() => { setShow(false); setEditId(null); setForm(emptyForm); }} className="px-4 py-2 bg-muted text-foreground text-xs font-mono-display rounded">BATAL</button>
          </div>
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
              <div key={t.id} className="panel scanline p-3 hover:border-primary transition group relative">
                <div className="flex items-start justify-between mb-2">
                  <Badge variant="cyan">{t.kategori}</Badge>
                  <div className="flex items-center gap-1">
                    <button onClick={() => startEdit(t)} className="p-1 text-muted-foreground hover:text-primary" title="Edit">
                      <Pencil className="w-3.5 h-3.5" />
                    </button>
                    <button onClick={() => { if (confirm(`Hapus "${t.nama}"?`)) del.mutate(t.id); }} className="p-1 text-muted-foreground hover:text-destructive" title="Hapus">
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                    <a href={t.url} target="_blank" rel="noreferrer" className="p-1 text-muted-foreground hover:text-primary" title="Buka">
                      <ExternalLink className="w-3.5 h-3.5" />
                    </a>
                  </div>
                </div>
                <a href={t.url} target="_blank" rel="noreferrer" className="block">
                  <div className="font-semibold text-sm">{t.nama}</div>
                  <div className="text-xs text-muted-foreground line-clamp-2 mt-1">{t.deskripsi}</div>
                  <div className="text-[10px] font-mono text-muted-foreground/60 mt-2 truncate">{t.url}</div>
                </a>
              </div>
            ))}
          </div>
        </Panel>
      ))}
    </div>
  );
}
