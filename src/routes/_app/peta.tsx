import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useState, useMemo, useRef, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { PageHeader, Panel, Badge, URGENSI_VARIANT } from "@/components/ui-toc";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { MapPin, AlertTriangle } from "lucide-react";
import mapAsset from "@/assets/indonesia-map.svg.asset.json";

export const Route = createFileRoute("/_app/peta")({ component: PetaPage });

// Province group IDs in the SVG (junwatu/indonesia-map)
const PROVINCE_IDS = [
  "Aceh","Bali","Banten","Bengkulu","Daerah-Istimewa-Yogyakarta","Gorontalo",
  "Jambi","Jawa-Barat","Jawa-Tengah","Jawa-Timur","Kalimantan-Barat",
  "Kalimantan-Selatan","Kalimantan-Tengah","Kalimantan-Utara---Kalimantan-Timur",
  "Kepulauan-Riau","Lampung","Maluku","Maluku-Utara","Nusa-Tenggara-Barat",
  "Nusa-Tenggara-Timur","Papua","Papua-Barat","Riau","Sulawesi-Barat",
  "Sulawesi-Selatan","Sulawesi-Tengah","Sulawesi-Tenggara","Sulawesi-Utara",
  "Sumatera-Barat","Sumatera-Selatan","Sumatera-Utara",
];

function idToName(id: string): string {
  return id.replace(/---/g, " + ").replace(/-/g, " ");
}

function normalize(s: string): string {
  return s.toLowerCase().replace(/^polda\s+/, "").replace(/\s+/g, " ").trim();
}

function matchProvince(polda: string | null, provDisplay: string): boolean {
  if (!polda) return false;
  const p = normalize(polda);
  const pr = normalize(provDisplay);
  if (p === pr) return true;
  // Combined Kaltim + Kaltara polygon
  if (provDisplay.includes("+")) {
    const parts = provDisplay.split("+").map((x) => normalize(x));
    if (parts.includes(p)) return true;
    if (p.includes("kalimantan timur") || p.includes("kalimantan utara") || p === "kaltim" || p === "kaltara") return true;
  }
  const aliases: Record<string, string[]> = {
    "daerah istimewa yogyakarta": ["yogyakarta", "diy", "di yogyakarta"],
    "kepulauan riau": ["kepri"],
    "nusa tenggara barat": ["ntb"],
    "nusa tenggara timur": ["ntt"],
    "sumatera utara": ["sumut"],
    "sumatera barat": ["sumbar"],
    "sumatera selatan": ["sumsel"],
    "kalimantan barat": ["kalbar"],
    "kalimantan tengah": ["kalteng"],
    "kalimantan selatan": ["kalsel"],
    "sulawesi utara": ["sulut"],
    "sulawesi tengah": ["sulteng"],
    "sulawesi selatan": ["sulsel"],
    "sulawesi tenggara": ["sultra"],
    "sulawesi barat": ["sulbar"],
    "maluku utara": ["malut"],
    "jawa barat": ["jabar"],
    "jawa tengah": ["jateng"],
    "jawa timur": ["jatim"],
  };
  for (const [k, vs] of Object.entries(aliases)) {
    if (pr === k && vs.includes(p)) return true;
  }
  return p === pr;
}

function PetaPage() {
  const [selected, setSelected] = useState<string | null>(null);
  const [hover, setHover] = useState<{ name: string; x: number; y: number } | null>(null);
  const wrapRef = useRef<HTMLDivElement>(null);
  const svgHostRef = useRef<HTMLDivElement>(null);
  const [view, setView] = useState({ x: 0, y: 0, k: 1 });
  const panRef = useRef<{ sx: number; sy: number; ox: number; oy: number; moved: boolean } | null>(null);
  const draggedRef = useRef(false);

  // Load SVG markup
  const { data: svgText } = useQuery<string>({
    queryKey: ["indo-svg-junwatu"],
    queryFn: async () => (await fetch(mapAsset.url)).text(),
    staleTime: Infinity,
  });

  // Load laporan
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
    for (const id of PROVINCE_IDS) m[idToName(id)] = 0;
    for (const l of laps ?? []) {
      for (const id of PROVINCE_IDS) {
        const name = idToName(id);
        if (matchProvince(l.polda, name)) { m[name]++; break; }
      }
    }
    return m;
  }, [laps]);

  const maxCount = Math.max(...Object.values(counts), 1);
  const selectedReports = useMemo(
    () => (laps ?? []).filter((l) => selected && matchProvince(l.polda, selected)),
    [laps, selected]
  );

  const fillFor = useCallback((c: number) => {
    if (c === 0) return "oklch(0.28 0.04 200 / 0.55)";
    const intensity = c / maxCount;
    if (intensity > 0.66) return "var(--cyber-red)";
    if (intensity > 0.33) return "var(--cyber-amber)";
    return "var(--cyber-green)";
  }, [maxCount]);

  // Wire SVG: colors, hover, click
  useEffect(() => {
    const host = svgHostRef.current;
    if (!host || !svgText) return;
    const svg = host.querySelector("svg");
    if (!svg) return;
    svg.setAttribute("width", "100%");
    svg.setAttribute("height", "100%");
    svg.style.display = "block";

    // Hide ocean rect, dim outsider
    const lautan = svg.querySelector("#Lautan rect");
    if (lautan) (lautan as SVGElement).setAttribute("style", "fill:transparent;stroke:none;");
    const outsider = svg.querySelector("#Outsider");
    if (outsider) (outsider as SVGElement).setAttribute("opacity", "0.18");

    const cleanups: Array<() => void> = [];

    for (const id of PROVINCE_IDS) {
      const g = svg.querySelector(`#${CSS.escape(id)}`) as SVGGElement | null;
      if (!g) continue;
      const name = idToName(id);
      const c = counts[name] ?? 0;
      const fill = fillFor(c);
      const paths = g.querySelectorAll("path, polygon, rect");
      paths.forEach((p) => {
        (p as SVGElement).setAttribute("fill", fill);
        (p as SVGElement).setAttribute("fill-opacity", c === 0 ? "0.5" : "0.85");
        (p as SVGElement).setAttribute("stroke", selected === name ? "var(--cyber-cyan)" : "oklch(0.82 0.18 175 / 0.55)");
        (p as SVGElement).setAttribute("stroke-width", selected === name ? "1.6" : "0.6");
        (p as SVGElement).setAttribute("vector-effect", "non-scaling-stroke");
      });
      g.style.cursor = "pointer";
      g.style.transition = "fill-opacity 120ms";

      const onEnter = (e: Event) => {
        const ev = e as MouseEvent;
        const r = wrapRef.current!.getBoundingClientRect();
        setHover({ name, x: ev.clientX - r.left, y: ev.clientY - r.top });
        paths.forEach((p) => (p as SVGElement).setAttribute("fill-opacity", "1"));
      };
      const onMove = (e: Event) => {
        const ev = e as MouseEvent;
        const r = wrapRef.current!.getBoundingClientRect();
        setHover({ name, x: ev.clientX - r.left, y: ev.clientY - r.top });
      };
      const onLeave = () => {
        setHover(null);
        paths.forEach((p) => (p as SVGElement).setAttribute("fill-opacity", c === 0 ? "0.5" : "0.85"));
      };
      const onClick = (e: Event) => {
        e.stopPropagation();
        if (!draggedRef.current) setSelected(name);
      };
      g.addEventListener("mouseenter", onEnter);
      g.addEventListener("mousemove", onMove);
      g.addEventListener("mouseleave", onLeave);
      g.addEventListener("click", onClick);
      cleanups.push(() => {
        g.removeEventListener("mouseenter", onEnter);
        g.removeEventListener("mousemove", onMove);
        g.removeEventListener("mouseleave", onLeave);
        g.removeEventListener("click", onClick);
      });
    }
    return () => { cleanups.forEach((fn) => fn()); };
  }, [svgText, counts, selected, fillFor]);

  const zoomAt = (factor: number) => {
    setView((v) => {
      const nk = Math.min(8, Math.max(1, v.k * factor));
      return { x: v.x, y: v.y, k: nk };
    });
  };
  const resetView = () => setView({ x: 0, y: 0, k: 1 });

  return (
    <div>
      <PageHeader code="10" title="Peta Operasional" subtitle="Peta provinsi Indonesia interaktif — sumber SVG: junwatu/indonesia-map" />

      <Panel title="Peta Sebaran Indonesia" glow className="relative">
        <div
          ref={wrapRef}
          className="relative w-full overflow-hidden rounded border border-primary/20"
          style={{ aspectRatio: "2021 / 922", background: "oklch(0.16 0.03 220 / 0.6)", touchAction: "none" }}
          onWheel={(e) => {
            e.preventDefault();
            zoomAt(e.deltaY < 0 ? 1.2 : 1 / 1.2);
          }}
          onPointerDown={(e) => {
            panRef.current = { sx: e.clientX, sy: e.clientY, ox: view.x, oy: view.y, moved: false };
            draggedRef.current = false;
            (e.currentTarget as HTMLDivElement).style.cursor = "grabbing";
          }}
          onPointerMove={(e) => {
            if (!panRef.current) return;
            const dx = e.clientX - panRef.current.sx;
            const dy = e.clientY - panRef.current.sy;
            if (!panRef.current.moved && Math.hypot(dx, dy) < 5) return;
            panRef.current.moved = true;
            draggedRef.current = true;
            setView((v) => ({ k: v.k, x: panRef.current!.ox + dx, y: panRef.current!.oy + dy }));
          }}
          onPointerUp={(e) => {
            panRef.current = null;
            (e.currentTarget as HTMLDivElement).style.cursor = "grab";
            setTimeout(() => { draggedRef.current = false; }, 0);
          }}
          onPointerLeave={(e) => {
            panRef.current = null;
            (e.currentTarget as HTMLDivElement).style.cursor = "grab";
          }}
        >
          {/* Grid backdrop */}
          <svg className="absolute inset-0 w-full h-full pointer-events-none opacity-40">
            <defs>
              <pattern id="cybergrid2" width="32" height="32" patternUnits="userSpaceOnUse">
                <path d="M 32 0 L 0 0 0 32" fill="none" stroke="var(--cyber-grid)" strokeWidth="0.5" />
              </pattern>
            </defs>
            <rect width="100%" height="100%" fill="url(#cybergrid2)" />
          </svg>

          {svgText ? (
            <div
              ref={svgHostRef}
              className="absolute inset-0"
              style={{
                transform: `translate(${view.x}px, ${view.y}px) scale(${view.k})`,
                transformOrigin: "0 0",
                cursor: "grab",
              }}
              dangerouslySetInnerHTML={{ __html: svgText }}
            />
          ) : (
            <div className="absolute inset-0 flex items-center justify-center font-mono-display text-primary/70 text-xs">
              [ LOADING_TACTICAL_MAP... ]
            </div>
          )}

          {/* Zoom controls */}
          <div className="absolute top-2 left-2 flex flex-col gap-1 z-20">
            <button
              onClick={() => zoomAt(1.3)}
              className="w-8 h-8 rounded bg-background/80 border border-primary/40 text-primary font-mono-display text-sm hover:bg-primary/20 transition"
              aria-label="Zoom in"
            >+</button>
            <button
              onClick={() => zoomAt(1 / 1.3)}
              className="w-8 h-8 rounded bg-background/80 border border-primary/40 text-primary font-mono-display text-sm hover:bg-primary/20 transition"
              aria-label="Zoom out"
            >−</button>
            <button
              onClick={resetView}
              className="w-8 h-8 rounded bg-background/80 border border-primary/40 text-primary font-mono-display text-[10px] hover:bg-primary/20 transition"
              aria-label="Reset"
            >⌂</button>
          </div>
          <div className="absolute top-2 right-2 text-[10px] font-mono-display text-muted-foreground bg-background/60 px-2 py-0.5 rounded z-20">
            {(view.k * 100).toFixed(0)}%
          </div>

          {hover && (
            <div
              className="pointer-events-none absolute z-30 font-mono-display text-[10px] bg-background/95 border border-primary/40 px-2 py-1 rounded text-primary whitespace-nowrap"
              style={{ left: hover.x + 12, top: hover.y + 12 }}
            >
              {hover.name} — {counts[hover.name] ?? 0} laporan
            </div>
          )}

          <div className="absolute bottom-1 left-2 text-[10px] font-mono-display text-primary/70 z-20">[ TACTICAL_GRID_LIVE ]</div>
          <div className="absolute bottom-1 right-2 text-[10px] font-mono-display text-muted-foreground z-20">
            {PROVINCE_IDS.length} REGION
          </div>
        </div>

        <div className="mt-3 flex flex-wrap gap-3 text-[10px] font-mono-display text-muted-foreground">
          <span className="flex items-center gap-1"><span className="w-3 h-3 rounded-sm" style={{ background: "oklch(0.28 0.04 200 / 0.55)" }} /> Tidak ada laporan</span>
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
