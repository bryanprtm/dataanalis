import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { PageHeader, Panel, Badge, URGENSI_VARIANT } from "@/components/ui-toc";
import { MapPin } from "lucide-react";

export const Route = createFileRoute("/_app/peta")({ component: PetaPage });

function PetaPage() {
  const { data: laps } = useQuery({
    queryKey: ["peta-laps"],
    queryFn: async () => {
      const { data } = await supabase.from("laporan").select("id,judul,polda,urgensi,wilayah,lat,lng,created_at").order("created_at", { ascending: false }).limit(200);
      return data ?? [];
    },
  });

  // group by polda
  const byPolda = (laps ?? []).reduce<Record<string, typeof laps>>((acc, l) => {
    const k = l.polda ?? "Tidak Diketahui";
    (acc[k] ??= [] as never).push(l as never);
    return acc;
  }, {});
  const heatmap = Object.entries(byPolda).map(([k, v]) => ({ polda: k, count: (v as never as typeof laps)!.length })).sort((a, b) => b.count - a.count);
  const maxCount = Math.max(...heatmap.map(h => h.count), 1);

  return (
    <div>
      <PageHeader code="10" title="Peta Operasional" subtitle="Sebaran kejadian, titik rawan, dan heatmap laporan" />

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <Panel title="Peta Sebaran Indonesia" glow className="lg:col-span-2 min-h-[500px] relative overflow-hidden">
          {/* Stylized tactical map placeholder */}
          <div className="absolute inset-5 rounded border border-primary/30 overflow-hidden">
            <div className="absolute inset-0" style={{
              background: `
                radial-gradient(circle at 20% 40%, var(--cyber-cyan) 0, transparent 8%),
                radial-gradient(circle at 35% 45%, var(--cyber-cyan) 0, transparent 10%),
                radial-gradient(circle at 50% 50%, var(--cyber-green) 0, transparent 12%),
                radial-gradient(circle at 65% 55%, var(--cyber-amber) 0, transparent 10%),
                radial-gradient(circle at 75% 60%, var(--cyber-red) 0, transparent 8%),
                radial-gradient(circle at 85% 65%, var(--cyber-cyan) 0, transparent 6%)
              `,
              opacity: 0.5,
            }} />
            <svg className="absolute inset-0 w-full h-full" viewBox="0 0 800 400" preserveAspectRatio="xMidYMid slice">
              <defs>
                <pattern id="grid" width="40" height="40" patternUnits="userSpaceOnUse">
                  <path d="M 40 0 L 0 0 0 40" fill="none" stroke="var(--cyber-cyan)" strokeOpacity="0.15" strokeWidth="0.5" />
                </pattern>
              </defs>
              <rect width="100%" height="100%" fill="url(#grid)" />
              {heatmap.slice(0, 20).map((h, i) => {
                const x = 80 + (i * 35) % 700;
                const y = 80 + Math.floor((i * 35) / 700) * 70 + (i % 3) * 30;
                const r = 6 + (h.count / maxCount) * 20;
                return (
                  <g key={h.polda}>
                    <circle cx={x} cy={y} r={r} fill="var(--cyber-cyan)" fillOpacity="0.15" stroke="var(--cyber-cyan)" strokeWidth="1">
                      <animate attributeName="r" values={`${r};${r + 6};${r}`} dur="2s" repeatCount="indefinite" />
                    </circle>
                    <circle cx={x} cy={y} r="2" fill="var(--cyber-cyan)" />
                    <text x={x + r + 4} y={y + 3} fill="var(--cyber-cyan)" fontSize="9" fontFamily="monospace">{h.polda.slice(0, 10)} ({h.count})</text>
                  </g>
                );
              })}
            </svg>
            <div className="absolute bottom-2 left-2 text-[10px] font-mono-display text-primary/70">[ TACTICAL_GRID_LIVE ]</div>
            <div className="absolute top-2 right-2 text-[10px] font-mono-display text-muted-foreground">SCALE: 1:NATIONAL</div>
          </div>
        </Panel>

        <Panel title="Heatmap per Polda">
          <div className="space-y-1 max-h-[460px] overflow-y-auto">
            {heatmap.map(h => (
              <div key={h.polda} className="p-2 rounded bg-muted/20">
                <div className="flex items-center justify-between text-xs mb-1">
                  <span className="font-medium truncate"><MapPin className="w-3 h-3 inline text-primary" /> {h.polda}</span>
                  <span className="font-mono text-primary">{h.count}</span>
                </div>
                <div className="h-1.5 bg-background rounded overflow-hidden">
                  <div className="h-full bg-primary" style={{ width: `${(h.count / maxCount) * 100}%`, boxShadow: "0 0 8px var(--cyber-cyan)" }} />
                </div>
              </div>
            ))}
            {heatmap.length === 0 && <p className="text-xs text-muted-foreground font-mono">[ NO_DATA ]</p>}
          </div>
        </Panel>
      </div>

      <Panel title="Daftar Titik Kejadian" className="mt-4">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-2">
          {laps?.slice(0, 24).map(l => (
            <div key={l.id} className="p-2 rounded bg-muted/20 border-l-2" style={{ borderColor: l.urgensi === "kritis" ? "var(--cyber-red)" : l.urgensi === "tinggi" ? "var(--cyber-amber)" : "var(--cyber-cyan)" }}>
              <div className="flex items-center justify-between mb-1">
                <span className="text-[10px] font-mono text-muted-foreground">{l.polda ?? "—"}</span>
                <Badge variant={URGENSI_VARIANT[l.urgensi as keyof typeof URGENSI_VARIANT]}>{l.urgensi}</Badge>
              </div>
              <div className="text-xs font-medium line-clamp-1">{l.judul}</div>
              <div className="text-[10px] font-mono text-muted-foreground">{l.wilayah ?? "—"}</div>
            </div>
          ))}
        </div>
      </Panel>
    </div>
  );
}
