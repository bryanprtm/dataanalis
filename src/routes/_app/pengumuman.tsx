import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { PageHeader, Panel, Badge, URGENSI_VARIANT } from "@/components/ui-toc";
import { Megaphone, Plus } from "lucide-react";
import { toast } from "sonner";

export const Route = createFileRoute("/_app/pengumuman")({ component: PengumumanPage });

function PengumumanPage() {
  const { user } = useAuth();
  const qc = useQueryClient();
  const [show, setShow] = useState(false);
  const [form, setForm] = useState({ judul: "", isi: "", prioritas: "sedang", target_subden: "" });

  const { data } = useQuery({
    queryKey: ["pengumuman"],
    queryFn: async () => {
      const { data } = await supabase.from("pengumuman").select("*").order("created_at", { ascending: false });
      return data ?? [];
    },
  });

  const add = useMutation({
    mutationFn: async () => {
      const { error } = await supabase.from("pengumuman").insert({ ...form, created_by: user!.id } as never);
      if (error) throw error;
    },
    onSuccess: () => { toast.success("Pengumuman dikirim"); setShow(false); qc.invalidateQueries({ queryKey: ["pengumuman"] }); },
    onError: (e) => toast.error(e instanceof Error ? e.message : "Hanya admin"),
  });

  return (
    <div>
      <PageHeader code="09" title="Pengumuman & Informasi Anggota" subtitle="Broadcast informasi & arahan pimpinan"
        actions={<button onClick={() => setShow(!show)} className="inline-flex items-center gap-2 px-3 py-2 bg-primary text-primary-foreground text-xs font-mono-display rounded"><Plus className="w-4 h-4" /> BROADCAST</button>} />

      {show && (
        <Panel title="Buat Pengumuman" className="mb-4">
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
            <button onClick={() => add.mutate()} disabled={add.isPending} className="px-4 py-2 bg-primary text-primary-foreground text-xs font-mono-display rounded">KIRIM</button>
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
                <div className="mt-2 text-[10px] font-mono text-muted-foreground">{p.target_subden || "BROADCAST ALL"} · {new Date(p.created_at).toLocaleString("id-ID")}</div>
              </div>
            </div>
          </Panel>
        ))}
        {data?.length === 0 && <div className="text-center py-12 text-muted-foreground font-mono text-xs">[ TIDAK ADA PENGUMUMAN ]</div>}
      </div>
    </div>
  );
}
