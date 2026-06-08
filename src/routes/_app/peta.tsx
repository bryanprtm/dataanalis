import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useState, useMemo } from "react";
import { supabase } from "@/integrations/supabase/client";
import { PageHeader, Panel, Badge, URGENSI_VARIANT } from "@/components/ui-toc";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { MapPin, AlertTriangle } from "lucide-react";
import petaAsset from "@/assets/peta-indonesia.png.asset.json";

export const Route = createFileRoute("/_app/peta")({ component: PetaPage });

// Approximate label-center coordinates (% of image width/height)
const PROVINCES: { name: string; x: number; y: number }[] = [
  { name: "Aceh", x: 4.5, y: 19 },
  { name: "Sumatra Utara", x: 7.5, y: 29 },
  { name: "Riau", x: 11, y: 35 },
  { name: "Kepulauan Riau", x: 16.5, y: 32 },
  { name: "Sumatra Barat", x: 9, y: 41 },
  { name: "Jambi", x: 12.5, y: 45 },
  { name: "Bengkulu", x: 11.5, y: 54 },
  { name: "Sumatra Selatan", x: 15.5, y: 52 },
  { name: "Kepulauan Bangka Belitung", x: 19.5, y: 51 },
  { name: "Lampung", x: 16.5, y: 62 },
  { name: "Banten", x: 19.5, y: 70 },
  { name: "Jakarta", x: 22, y: 69 },
  { name: "Jawa Barat", x: 24, y: 73 },
  { name: "Jawa Tengah", x: 27.5, y: 73 },
  { name: "Yogyakarta", x: 29, y: 77 },
  { name: "Jawa Timur", x: 31.5, y: 74 },
  { name: "Bali", x: 36.5, y: 77 },
  { name: "Nusa Tenggara Barat", x: 40, y: 78 },
  { name: "Nusa Tenggara Timur", x: 46, y: 82 },
  { name: "Kalimantan Barat", x: 30, y: 40 },
  { name: "Kalimantan Tengah", x: 35, y: 48 },
  { name: "Kalimantan Selatan", x: 40, y: 53 },
  { name: "Kalimantan Timur", x: 40, y: 35 },
  { name: "Kalimantan Utara", x: 42, y: 25 },
  { name: "Sulawesi Utara", x: 54, y: 30 },
  { name: "Gorontalo", x: 51, y: 35 },
  { name: "Sulawesi Tengah", x: 52, y: 43 },
  { name: "Sulawesi Barat", x: 49.5, y: 52 },
  { name: "Sulawesi Selatan", x: 52, y: 60 },
  { name: "Sulawesi Tenggara", x: 55.5, y: 55 },
  { name: "Maluku Utara", x: 66, y: 32 },
  { name: "Maluku", x: 69, y: 56 },
  { name: "Papua Barat Daya", x: 73, y: 41 },
  { name: "Papua Barat", x: 77.5, y: 47 },
  { name: "Papua Tengah", x: 84, y: 53 },
  { name: "Papua Pegunungan", x: 87, y: 50 },
  { name: "Papua", x: 90, y: 46 },
  { name: "Papua Selatan", x: 87, y: 62 },
];

function matchProvince(polda: string | null, prov: string): boolean {
  if (!polda) return false;
  const p = polda.toLowerCase().replace(/^polda\s+/, "").trim();
  const pr = prov.toLowerCase();
  return p === pr || p.includes(pr) || pr.includes(p);
}

function PetaPage() {
  const [selected, setSelected] = useState<string | null>(null);

  const { data: laps } = useQuery({
    queryKey: ["peta-laps"],
    queryFn: async () => {
      const { data } = await supabase
        .from("laporan")
        .select("id,judul,polda,urgensi,wilayah,isi,created_at")
        .order("created_at", { ascending: false })
        .limit(500);
      return data ?? [];
    },
  });

  const counts = useMemo(() => {
    const m: Record<string, number> = {};
    for (const p of PROVINCES) m[p.name] = 0;
    for (const l of laps ?? []) {
      for (const p of PROVINCES) {
        if (matchProvince(l.polda, p.name)) { m[p.name]++; break; }
      }
    }
    return m;
  }, [laps]);

  const maxCount = Math.max(...Object.values(counts), 1);
  const selectedReports = useMemo(
    () => (laps ?? []).filter(l => selected && matchProvince(l.polda, selected)),
    [laps, selected]
  );

  return (
    <div>
      <PageHeader code="10" title="Peta Operasional" subtitle="Klik provinsi untuk melihat laporan wilayah" />

      <Panel title="Peta Sebaran Indonesia" glow className="relative">
        <div className="relative w-full" style={{ aspectRatio: "1920 / 900" }}>
          <img
            src={petaAsset.url}
            alt="Peta Provinsi Indonesia"
            className="absolute inset-0 w-full h-full object-contain select-none pointer-events-none"
            draggable={false}
            style={{ filter: "saturate(0.85) brightness(0.95) contrast(1.05)" }}
          />
          {/* Hotspots */}
          {PROVINCES.map((p) => {
            const c = counts[p.name] ?? 0;
            const intensity = c / maxCount;
            const size = 14 + intensity * 24;
            const color = c === 0
              ? "var(--cyber-cyan)"
              : intensity > 0.66 ? "var(--cyber-red)"
              : intensity > 0.33 ? "var(--cyber-amber)"
              : "var(--cyber-green)";
            return (
              <button
                key={p.name}
                onClick={() => setSelected(p.name)}
                className="absolute -translate-x-1/2 -translate-y-1/2 group focus:outline-none"
                style={{ left: `${p.x}%`, top: `${p.y}%` }}
                title={`${p.name} — ${c} laporan`}
              >
                <span
                  className="block rounded-full transition-transform group-hover:scale-125"
                  style={{
                    width: size, height: size,
                    background: `radial-gradient(circle, ${color} 0%, transparent 70%)`,
                    boxShadow: c > 0 ? `0 0 12px ${color}` : "none",
                  }}
                />
                <span
                  className="block absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 rounded-full border"
                  style={{ width: 6, height: 6, background: color, borderColor: color, boxShadow: `0 0 8px ${color}` }}
                />
                {c > 0 && (
                  <span
                    className="absolute left-1/2 -translate-x-1/2 top-full mt-0.5 text-[9px] font-mono-display font-bold px-1 rounded"
                    style={{ color, background: "rgba(0,0,0,0.6)" }}
                  >
                    {c}
                  </span>
                )}
                <span className="opacity-0 group-hover:opacity-100 transition-opacity absolute left-1/2 -translate-x-1/2 -top-6 whitespace-nowrap text-[10px] font-mono-display bg-background/90 border border-primary/40 px-1.5 py-0.5 rounded text-primary">
                  {p.name}
                </span>
              </button>
            );
          })}
          <div className="absolute bottom-1 left-2 text-[10px] font-mono-display text-primary/70">[ TACTICAL_GRID_LIVE ]</div>
          <div className="absolute top-1 right-2 text-[10px] font-mono-display text-muted-foreground">38 PROVINSI</div>
        </div>

        {/* Legend */}
        <div className="mt-3 flex flex-wrap gap-3 text-[10px] font-mono-display text-muted-foreground">
          <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full" style={{ background: "var(--cyber-cyan)" }} /> Tidak ada laporan</span>
          <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full" style={{ background: "var(--cyber-green)" }} /> Rendah</span>
          <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full" style={{ background: "var(--cyber-amber)" }} /> Sedang</span>
          <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full" style={{ background: "var(--cyber-red)" }} /> Tinggi</span>
        </div>
      </Panel>

      <Dialog open={!!selected} onOpenChange={(o) => !o && setSelected(null)}>
        <DialogContent className="max-w-2xl panel scanline border-primary/40">
          <DialogHeader>
            <DialogTitle className="font-mono-display text-glow-cyan flex items-center gap-2">
              <MapPin className="w-4 h-4 text-primary" /> {selected}
            </DialogTitle>
            <DialogDescription className="font-mono-display text-xs">
              [ {selectedReports.length} LAPORAN_TERCATAT ]
            </DialogDescription>
          </DialogHeader>
          <div className="max-h-[60vh] overflow-y-auto space-y-2">
            {selectedReports.length === 0 && (
              <div className="text-center py-8 text-xs font-mono-display text-muted-foreground">
                [ NO_REPORTS_IN_SECTOR ]
              </div>
            )}
            {selectedReports.map((l) => (
              <div
                key={l.id}
                className="p-3 rounded bg-muted/20 border-l-2"
                style={{ borderColor: l.urgensi === "kritis" ? "var(--cyber-red)" : l.urgensi === "tinggi" ? "var(--cyber-amber)" : "var(--cyber-cyan)" }}
              >
                <div className="flex items-center justify-between mb-1">
                  <span className="text-[10px] font-mono text-muted-foreground">
                    {new Date(l.created_at).toLocaleString("id-ID")}
                  </span>
                  <Badge variant={URGENSI_VARIANT[l.urgensi as keyof typeof URGENSI_VARIANT]}>
                    {l.urgensi === "kritis" && <AlertTriangle className="w-3 h-3" />}
                    {l.urgensi}
                  </Badge>
                </div>
                <div className="text-sm font-semibold">{l.judul}</div>
                {l.wilayah && <div className="text-[11px] font-mono text-muted-foreground mt-0.5">📍 {l.wilayah}</div>}
                {l.isi && <div className="text-xs text-muted-foreground mt-1 line-clamp-3">{l.isi}</div>}
              </div>
            ))}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
