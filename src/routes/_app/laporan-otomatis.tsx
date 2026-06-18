import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useServerFn } from "@tanstack/react-start";
import { generateAutoReport } from "@/lib/ai.functions";
import { PageHeader, Panel } from "@/components/ui-toc";
import { FileDown, Loader2, FileText } from "lucide-react";
import { toast } from "sonner";
import jsPDF from "jspdf";

export const Route = createFileRoute("/_app/laporan-otomatis")({ component: LapOtomatis });

function LapOtomatis() {
  const [periode, setPeriode] = useState<"harian"|"mingguan"|"bulanan"|"khusus">("harian");
  const [selected, setSelected] = useState<string | null>(null);
  const [page, setPage] = useState(1);
  const PAGE_SIZE = 6;
  const qc = useQueryClient();
  const gen = useServerFn(generateAutoReport);

  const { data: reports } = useQuery({
    queryKey: ["reports"],
    queryFn: async () => {
      const { data } = await supabase.from("generated_reports").select("*").order("created_at", { ascending: false }).limit(50);
      return data ?? [];
    },
  });

  const run = useMutation({
    mutationFn: () => gen({ data: { periode } }),
    onSuccess: (r) => { toast.success("Laporan dibuat"); setSelected(r.id); qc.invalidateQueries({ queryKey: ["reports"] }); },
    onError: (e) => toast.error(e instanceof Error ? e.message : "Gagal"),
  });

  const sel = reports?.find(r => r.id === selected);

  function exportPDF() {
    if (!sel) return;
    const doc = new jsPDF();
    doc.setFont("helvetica");
    doc.setFontSize(14);
    doc.text(sel.judul, 15, 20);
    doc.setFontSize(10);
    doc.text(`Periode: ${sel.periode}`, 15, 28);
    doc.setFontSize(11);
    const lines = doc.splitTextToSize(sel.konten, 180);
    doc.text(lines, 15, 40);
    doc.save(`${sel.judul.replace(/\s+/g, "_")}.pdf`);
  }

  function exportWhatsApp() {
    if (!sel) return;
    const text = `*${sel.judul}*\n\n${sel.konten.slice(0, 3500)}${sel.konten.length > 3500 ? "\n\n[...lihat aplikasi untuk versi lengkap]" : ""}`;
    window.open(`https://wa.me/?text=${encodeURIComponent(text)}`, "_blank");
  }

  return (
    <div>
      <PageHeader code="05" title="Generate Laporan Otomatis" subtitle="AI menyusun laporan harian, mingguan, bulanan, dan khusus event" />

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <Panel title="Generate Baru">
          <div className="space-y-3">
            <label className="block">
              <span className="text-[10px] font-mono-display tracking-wider text-muted-foreground">PERIODE</span>
              <select value={periode} onChange={(e) => setPeriode(e.target.value as never)}
                className="mt-1 w-full px-3 py-2 bg-input/40 border border-border rounded text-sm font-mono">
                <option value="harian">Harian (24 jam)</option>
                <option value="mingguan">Mingguan (7 hari)</option>
                <option value="bulanan">Bulanan (30 hari)</option>
                <option value="khusus">Khusus Event</option>
              </select>
            </label>
            <button onClick={() => run.mutate()} disabled={run.isPending}
              className="w-full inline-flex items-center justify-center gap-2 py-3 bg-primary text-primary-foreground font-mono-display tracking-wider text-sm rounded hover:opacity-90 disabled:opacity-50">
              {run.isPending ? <><Loader2 className="w-4 h-4 animate-spin" /> AI MENULIS...</> : <><FileText className="w-4 h-4" /> GENERATE LAPORAN</>}
            </button>
            <p className="text-[10px] text-muted-foreground font-mono leading-relaxed">
              Format: Pendahuluan · Sumber Data · Ringkasan · Fakta · Analisis AI · Prediksi · Rekomendasi · Kesimpulan
            </p>
          </div>

          <div className="mt-6 pt-4 border-t border-border space-y-1">
            <div className="text-[10px] font-mono-display tracking-widest text-muted-foreground mb-2">[ RIWAYAT ]</div>
            {reports?.map(r => (
              <button key={r.id} onClick={() => setSelected(r.id)}
                className={`w-full text-left p-2 rounded text-xs ${selected === r.id ? "bg-primary/15 text-primary" : "hover:bg-accent/40"}`}>
                <div className="font-medium truncate">{r.judul}</div>
                <div className="text-[10px] text-muted-foreground font-mono">{r.periode} · {new Date(r.created_at).toLocaleDateString("id-ID")}</div>
              </button>
            ))}
          </div>
        </Panel>

        <Panel className="lg:col-span-2" title={sel?.judul ?? "Preview Laporan"}>
          {!sel && <div className="text-center py-12 text-muted-foreground font-mono text-xs">[ PILIH ATAU GENERATE LAPORAN ]</div>}
          {sel && (
            <>
              <div className="flex gap-2 mb-4">
                <button onClick={exportPDF} className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-mono-display bg-secondary border border-border rounded hover:border-primary">
                  <FileDown className="w-3.5 h-3.5" /> PDF
                </button>
                <button onClick={exportWhatsApp} className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-mono-display bg-secondary border border-border rounded hover:border-primary">
                  <FileDown className="w-3.5 h-3.5" /> WHATSAPP
                </button>
                <button onClick={() => { navigator.clipboard.writeText(sel.konten); toast.success("Disalin"); }} className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-mono-display bg-secondary border border-border rounded hover:border-primary">
                  COPY
                </button>
              </div>
              <pre className="whitespace-pre-wrap text-sm leading-relaxed font-sans max-h-[600px] overflow-y-auto p-4 bg-background/40 rounded border border-border">
                {sel.konten}
              </pre>
            </>
          )}
        </Panel>
      </div>
    </div>
  );
}
