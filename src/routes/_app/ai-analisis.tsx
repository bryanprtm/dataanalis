import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useServerFn } from "@tanstack/react-start";
import { analyzeLaporan } from "@/lib/ai.functions";
import { PageHeader, Panel, Badge, URGENSI_VARIANT } from "@/components/ui-toc";
import { Brain, Zap, Loader2 } from "lucide-react";
import { toast } from "sonner";

export const Route = createFileRoute("/_app/ai-analisis")({ component: AIAnalysisPage });

function AIAnalysisPage() {
  const [selected, setSelected] = useState<string | null>(null);
  const qc = useQueryClient();
  const analyze = useServerFn(analyzeLaporan);

  const { data: laps } = useQuery({
    queryKey: ["analysis-laps"],
    queryFn: async () => {
      const { data } = await supabase.from("laporan").select("id,judul,jenis,urgensi,polda,created_at").order("created_at", { ascending: false }).limit(50);
      return data ?? [];
    },
  });

  const { data: analyses } = useQuery({
    queryKey: ["analysis", selected],
    enabled: !!selected,
    queryFn: async () => {
      const { data } = await supabase.from("ai_analyses").select("*").eq("laporan_id", selected!).order("created_at", { ascending: false });
      return data ?? [];
    },
  });

  const runAI = useMutation({
    mutationFn: () => analyze({ data: { laporanId: selected! } }),
    onSuccess: () => { toast.success("Analisis AI selesai"); qc.invalidateQueries({ queryKey: ["analysis"] }); },
    onError: (e) => toast.error(e instanceof Error ? e.message : "Gagal"),
  });

  const latest = analyses?.[0];

  return (
    <div>
      <PageHeader code="03" title="AI Analisis" subtitle="AI membaca laporan, membuat ringkasan, deteksi kerawanan & rekomendasi taktis" />

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <Panel title="Pilih Laporan" className="lg:col-span-1">
          <div className="space-y-1 max-h-[600px] overflow-y-auto">
            {laps?.map((l) => (
              <button key={l.id} onClick={() => setSelected(l.id)}
                className={`w-full text-left p-2 rounded text-xs transition border-l-2 ${selected === l.id ? "bg-primary/15 border-primary" : "border-transparent hover:bg-accent/40"}`}>
                <div className="flex items-center justify-between mb-1">
                  <Badge variant="cyan">{l.jenis}</Badge>
                  <Badge variant={URGENSI_VARIANT[l.urgensi as keyof typeof URGENSI_VARIANT]}>{l.urgensi}</Badge>
                </div>
                <div className="font-medium truncate">{l.judul}</div>
                <div className="text-[10px] text-muted-foreground font-mono">{l.polda ?? "—"} · {new Date(l.created_at).toLocaleDateString("id-ID")}</div>
              </button>
            ))}
            {(!laps || laps.length === 0) && <p className="text-xs text-muted-foreground font-mono">[ NO_DATA ]</p>}
          </div>
        </Panel>

        <div className="lg:col-span-2 space-y-4">
          {!selected && (
            <Panel>
              <div className="text-center py-12 text-muted-foreground">
                <Brain className="w-12 h-12 mx-auto mb-3 text-primary/40" />
                <p className="font-mono text-sm">[ PILIH LAPORAN UNTUK MEMULAI ANALISIS AI ]</p>
              </div>
            </Panel>
          )}

          {selected && (
            <>
              <Panel>
                <button onClick={() => runAI.mutate()} disabled={runAI.isPending}
                  className="w-full inline-flex items-center justify-center gap-2 py-3 bg-primary text-primary-foreground font-mono-display tracking-wider text-sm rounded hover:opacity-90 disabled:opacity-50">
                  {runAI.isPending ? <><Loader2 className="w-4 h-4 animate-spin" /> AI SEDANG BERPIKIR...</> : <><Zap className="w-4 h-4" /> JALANKAN ANALISIS AI</>}
                </button>
              </Panel>

              {latest && (
                <Panel title={`Hasil AI — ${new Date(latest.created_at).toLocaleString("id-ID")}`} glow>
                  <div className="space-y-4">
                    <div className="flex flex-wrap gap-2">
                      <Badge variant="cyan">Sentimen: {latest.sentimen}</Badge>
                      <Badge variant={URGENSI_VARIANT[latest.risiko as keyof typeof URGENSI_VARIANT]}>Risiko: {latest.risiko}</Badge>
                    </div>
                    <Section label="Ringkasan Situasi" text={latest.ringkasan} />
                    <Section label="Isu Menonjol" text={latest.isu_menonjol} />
                    <Section label="Potensi Kerawanan" text={latest.potensi_kerawanan} accent="amber" />
                    <Section label="Rekomendasi Taktis" text={latest.rekomendasi} accent="cyan" />
                    <Section label="Prediksi Perkembangan" text={latest.prediksi} />
                  </div>
                </Panel>
              )}

              {analyses && analyses.length > 1 && (
                <Panel title="Riwayat Analisis">
                  <div className="space-y-2">
                    {analyses.slice(1).map(a => (
                      <div key={a.id} className="p-2 rounded bg-muted/30 text-xs">
                        <div className="text-[10px] text-muted-foreground font-mono mb-1">{new Date(a.created_at).toLocaleString("id-ID")}</div>
                        <div className="line-clamp-2">{a.ringkasan}</div>
                      </div>
                    ))}
                  </div>
                </Panel>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
}

function Section({ label, text, accent }: { label: string; text: string | null; accent?: "amber" | "cyan" }) {
  if (!text) return null;
  const color = accent === "amber" ? "text-[color:var(--cyber-amber)]" : accent === "cyan" ? "text-primary" : "text-foreground";
  return (
    <div>
      <div className={`text-[10px] font-mono-display tracking-widest mb-1 ${color}`}>[ {label.toUpperCase()} ]</div>
      <p className="text-sm leading-relaxed whitespace-pre-wrap">{text}</p>
    </div>
  );
}
