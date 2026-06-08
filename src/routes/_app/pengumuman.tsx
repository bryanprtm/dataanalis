import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useRole } from "@/hooks/useRole";
import { PageHeader, Panel, Badge, URGENSI_VARIANT } from "@/components/ui-toc";
import { Megaphone, Plus, Pencil, Trash2, X } from "lucide-react";
import { toast } from "sonner";

export const Route = createFileRoute("/_app/pengumuman")({ component: PengumumanPage });

type Row = {
  id: string; judul: string; isi: string; prioritas: string;
  target_subden: string | null; created_at: string;
};

const emptyForm = { judul: "", isi: "", prioritas: "sedang", target_subden: "" };

function PengumumanPage() {
  const { user } = useAuth();
  const { isAdmin } = useRole();
  const qc = useQueryClient();
  const [show, setShow] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState(emptyForm);

  const { data } = useQuery({
    queryKey: ["pengumuman"],
    queryFn: async () => {
      const { data } = await supabase.from("pengumuman").select("*").order("created_at", { ascending: false });
      return (data ?? []) as Row[];
    },
  });

  const save = useMutation({
    mutationFn: async () => {
      const payload = {
        judul: form.judul, isi: form.isi, prioritas: form.prioritas as never,
        target_subden: form.target_subden || null,
      };
      if (editingId) {
        const { error } = await supabase.from("pengumuman").update(payload).eq("id", editingId);
        if (error) throw error;
      } else {
        const { error } = await supabase.from("pengumuman").insert({ ...payload, created_by: user!.id });
        if (error) throw error;
      }
    },
    onSuccess: () => {
      toast.success(editingId ? "Pengumuman diperbarui" : "Pengumuman dikirim");
      setShow(false); setEditingId(null); setForm(emptyForm);
      qc.invalidateQueries({ queryKey: ["pengumuman"] });
    },
    onError: (e) => toast.error(e instanceof Error ? e.message : "Hanya admin"),
  });

  const del = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("pengumuman").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => { toast.success("Pengumuman dihapus"); qc.invalidateQueries({ queryKey: ["pengumuman"] }); },
    onError: (e) => toast.error(e instanceof Error ? e.message : "Gagal"),
  });

  const startEdit = (p: Row) => {
    setEditingId(p.id);
    setForm({ judul: p.judul, isi: p.isi, prioritas: p.prioritas, target_subden: p.target_subden ?? "" });
    setShow(true);
  };

  return (
    <div>
      <PageHeader code="09" title="Pengumuman & Informasi Anggota" subtitle={isAdmin ? "Broadcast informasi & arahan pimpinan" : "Informasi & arahan pimpinan"}
        actions={isAdmin ? <button onClick={() => { setEditingId(null); setForm(emptyForm); setShow(!show); }} className="inline-flex items-center gap-2 px-3 py-2 bg-primary text-primary-foreground text-xs font-mono-display rounded"><Plus className="w-4 h-4" /> BROADCAST</button> : null} />

      {isAdmin && show && (
        <Panel title={editingId ? "Edit Pengumuman" : "Buat Pengumuman"} className="mb-4">
          <div className="space-y-3">
            <input placeholder="Judul" className="w-full px-3 py-2 bg-input/40 border border-border rounded text-sm font-mono"
              value={form.judul} onChange={e => setForm({...form, judul: e.target.value})} />
            <textarea placeholder="Isi pengumuman..." rows={5} className="w-full px-3 py-2 bg-input/40 border border-border rounded text-sm font-mono"
              value={form.isi} onChange={e => setForm({...form, isi: e.target.value})} />
            <div className="grid grid-cols-2 gap-3">
              <select className="px-3 py-2 bg-input/40 border border-border rounded text-sm font-mono"
                value={form.prioritas} onChange={e => setForm({...form, prioritas: e.target.value})}>
                <option value="rendah">Prioritas Rendah</option><option value="sedang">Sedang</option><option value="tinggi">Tinggi</option><option value="kritis">Kritis</option>
              </select>
              <input placeholder="Target Subden (kosongkan = semua)" className="px-3 py-2 bg-input/40 border border-border rounded text-sm font-mono"
                value={form.target_subden} onChange={e => setForm({...form, target_subden: e.target.value})} />
            </div>
            <div className="flex gap-2">
              <button onClick={() => save.mutate()} disabled={save.isPending || !form.judul || !form.isi} className="px-4 py-2 bg-primary text-primary-foreground text-xs font-mono-display rounded disabled:opacity-50">
                {editingId ? "SIMPAN" : "KIRIM"}
              </button>
              <button onClick={() => { setShow(false); setEditingId(null); setForm(emptyForm); }} className="px-4 py-2 border border-border text-xs font-mono-display rounded">BATAL</button>
            </div>
          </div>
        </Panel>
      )}

      <div className="space-y-3">
        {data?.map(p => (
          <Panel key={p.id} glow={p.prioritas === "kritis"}>
            <div className="flex items-start gap-3">
              <Megaphone className="w-5 h-5 text-primary shrink-0 mt-1" />
              <div className="flex-1">
                <div className="flex items-center justify-between gap-2 mb-1">
                  <h3 className="font-semibold">{p.judul}</h3>
                  <Badge variant={URGENSI_VARIANT[p.prioritas as keyof typeof URGENSI_VARIANT]}>{p.prioritas}</Badge>
                </div>
                <p className="text-sm whitespace-pre-wrap leading-relaxed">{p.isi}</p>
                <div className="mt-2 flex items-center justify-between gap-2">
                  <div className="text-[10px] font-mono text-muted-foreground">{p.target_subden || "BROADCAST ALL"} · {new Date(p.created_at).toLocaleString("id-ID")}</div>
                  {isAdmin && (
                    <div className="flex gap-1.5">
                      <button onClick={() => startEdit(p)} className="inline-flex items-center gap-1 px-2 py-1 text-[10px] font-mono-display border border-border rounded hover:bg-accent">
                        <Pencil className="w-3 h-3" /> EDIT
                      </button>
                      <button onClick={() => { if (confirm(`Hapus pengumuman "${p.judul}"?`)) del.mutate(p.id); }}
                        className="inline-flex items-center gap-1 px-2 py-1 text-[10px] font-mono-display border border-destructive/40 text-destructive rounded hover:bg-destructive/10">
                        <Trash2 className="w-3 h-3" /> HAPUS
                      </button>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </Panel>
        ))}
        {data?.length === 0 && <div className="text-center py-12 text-muted-foreground font-mono text-xs">[ TIDAK ADA PENGUMUMAN ]</div>}
      </div>
    </div>
  );
}
