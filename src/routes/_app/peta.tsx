import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useState, useMemo, useRef, useEffect } from "react";
import { geoMercator, geoPath, type GeoProjection } from "d3-geo";
import { supabase } from "@/integrations/supabase/client";
import { PageHeader, Panel, Badge, URGENSI_VARIANT } from "@/components/ui-toc";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { MapPin, AlertTriangle } from "lucide-react";
import geoAsset from "@/assets/indonesia-provinces.geojson.asset.json";

export const Route = createFileRoute("/_app/peta")({ component: PetaPage });

type FC = { type: "FeatureCollection"; features: any[] };

function matchProvince(polda: string | null, prov: string): boolean {
  if (!polda) return false;
  const p = polda.toLowerCase().replace(/^polda\s+/, "").replace(/\s+/g, " ").trim();
  const pr = prov.toLowerCase().replace(/\s+/g, " ").trim();
  if (p === pr) return true;
  // common aliases
  const aliases: Record<string, string[]> = {
    "dki jakarta": ["jakarta", "metro jaya"],
    "di yogyakarta": ["yogyakarta", "diy"],
    "kepulauan riau": ["kepri"],
    "kepulauan bangka belitung": ["bangka belitung", "babel"],
    "nusa tenggara barat": ["ntb"],
    "nusa tenggara timur": ["ntt"],
  };
  for (const [k, vs] of Object.entries(aliases)) {
    if (pr === k && vs.includes(p)) return true;
    if (p === k && vs.includes(pr)) return true;
  }
  return p.includes(pr) || pr.includes(p);
}

function PetaPage() {
  const [selected, setSelected] = useState<string | null>(null);
  const [hover, setHover] = useState<{ name: string; x: number; y: number } | null>(null);
  const wrapRef = useRef<HTMLDivElement>(null);
  const [size, setSize] = useState({ w: 1000, h: 460 });

  useEffect(() => {
    const el = wrapRef.current;
    if (!el) return;
    const obs = new ResizeObserver(() => {
      const w = el.clientWidth;
      setSize({ w, h: Math.round(w * 0.46) });
    });
    obs.observe(el);
    return () => obs.disconnect();
  }, []);

  const { data: geo } = useQuery<FC>({
    queryKey: ["idn-geojson"],
    queryFn: async () => (await fetch(geoAsset.url)).json(),
    staleTime: Infinity,
  });

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

  const { projection, pathGen } = useMemo(() => {
    if (!geo) return { projection: null as GeoProjection | null, pathGen: null as ReturnType<typeof geoPath> | null };
    const proj = geoMercator().fitSize([size.w, size.h], geo as any);
    return { projection: proj, pathGen: geoPath(proj) };
  }, [geo, size]);

  const counts = useMemo(() => {
    const m: Record<string, number> = {};
    if (!geo) return m;
    for (const f of geo.features) m[f.properties.state] = 0;
    for (const l of laps ?? []) {
      for (const f of geo.features) {
        if (matchProvince(l.polda, f.properties.state)) { m[f.properties.state]++; break; }
      }
    }
    return m;
  }, [geo, laps]);

  const maxCount = Math.max(...Object.values(counts), 1);
  const selectedReports = useMemo(
    () => (laps ?? []).filter(l => selected && matchProvince(l.polda, selected)),
    [laps, selected]
  );

  function fillFor(c: number) {
    if (c === 0) return "oklch(0.28 0.04 200 / 0.4)";
    const intensity = c / maxCount;
    if (intensity > 0.66) return "var(--cyber-red)";
    if (intensity > 0.33) return "var(--cyber-amber)";
    return "var(--cyber-green)";
  }

  return (
    <div>
      <PageHeader code="10" title="Peta Operasional" subtitle="Peta provinsi interaktif — sumber data: cahyadsn/wilayah" />

      <Panel title="Peta Sebaran Indonesia" glow className="relative">
        <div ref={wrapRef} className="relative w-full">
          {geo && pathGen ? (
            <svg
              width={size.w}
              height={size.h}
              viewBox={`0 0 ${size.w} ${size.h}`}
              className="block w-full"
              style={{ background: "transparent" }}
            >
              {/* Grid backdrop */}
              <defs>
                <pattern id="cybergrid" width="32" height="32" patternUnits="userSpaceOnUse">
                  <path d="M 32 0 L 0 0 0 32" fill="none" stroke="var(--cyber-grid)" strokeWidth="0.5" />
                </pattern>
                <filter id="glow"><feGaussianBlur stdDeviation="2" /></filter>
              </defs>
              <rect width={size.w} height={size.h} fill="url(#cybergrid)" />

              {geo.features.map((f, i) => {
                const name = f.properties.state as string;
                const c = counts[name] ?? 0;
                const d = pathGen(f as any) ?? "";
                const isSel = selected === name;
                return (
                  <path
                    key={i}
                    d={d}
                    fill={fillFor(c)}
                    fillOpacity={c === 0 ? 0.35 : 0.7}
                    stroke={isSel ? "var(--cyber-cyan)" : "oklch(0.82 0.18 175 / 0.5)"}
                    strokeWidth={isSel ? 1.6 : 0.6}
                    style={{ cursor: "pointer", transition: "fill-opacity 120ms" }}
                    onMouseEnter={(e) => {
                      const r = wrapRef.current!.getBoundingClientRect();
                      setHover({ name, x: e.clientX - r.left, y: e.clientY - r.top });
                    }}
                    onMouseMove={(e) => {
                      const r = wrapRef.current!.getBoundingClientRect();
                      setHover({ name, x: e.clientX - r.left, y: e.clientY - r.top });
                    }}
                    onMouseLeave={() => setHover(null)}
                    onClick={() => setSelected(name)}
                  />
                );
              })}

              {/* Count labels on provinces with reports */}
              {geo.features.map((f, i) => {
                const name = f.properties.state as string;
                const c = counts[name] ?? 0;
                if (c === 0 || !projection) return null;
                const centroid = pathGen!.centroid(f as any);
                if (!isFinite(centroid[0])) return null;
                return (
                  <g key={`l-${i}`} pointerEvents="none">
                    <circle cx={centroid[0]} cy={centroid[1]} r={9} fill="rgba(0,0,0,0.65)" stroke={fillFor(c)} strokeWidth={1} />
                    <text x={centroid[0]} y={centroid[1] + 3} textAnchor="middle" fontSize={10} fontFamily="JetBrains Mono, monospace" fill={fillFor(c)} fontWeight={700}>
                      {c}
                    </text>
                  </g>
                );
              })}
            </svg>
          ) : (
            <div className="aspect-[1000/460] flex items-center justify-center font-mono-display text-primary/70 text-xs">
              [ LOADING_TACTICAL_MAP... ]
            </div>
          )}

          {hover && (
            <div
              className="pointer-events-none absolute z-10 font-mono-display text-[10px] bg-background/95 border border-primary/40 px-2 py-1 rounded text-primary whitespace-nowrap"
              style={{ left: hover.x + 12, top: hover.y + 12 }}
            >
              {hover.name} — {counts[hover.name] ?? 0} laporan
            </div>
          )}

          <div className="absolute bottom-1 left-2 text-[10px] font-mono-display text-primary/70">[ TACTICAL_GRID_LIVE ]</div>
          <div className="absolute top-1 right-2 text-[10px] font-mono-display text-muted-foreground">
            {geo ? `${geo.features.length} PROVINSI` : "—"}
          </div>
        </div>

        <div className="mt-3 flex flex-wrap gap-3 text-[10px] font-mono-display text-muted-foreground">
          <span className="flex items-center gap-1"><span className="w-3 h-3 rounded-sm" style={{ background: "oklch(0.28 0.04 200 / 0.4)" }} /> Tidak ada laporan</span>
          <span className="flex items-center gap-1"><span className="w-3 h-3 rounded-sm" style={{ background: "var(--cyber-green)" }} /> Rendah</span>
          <span className="flex items-center gap-1"><span className="w-3 h-3 rounded-sm" style={{ background: "var(--cyber-amber)" }} /> Sedang</span>
          <span className="flex items-center gap-1"><span className="w-3 h-3 rounded-sm" style={{ background: "var(--cyber-red)" }} /> Tinggi</span>
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
