import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useMemo, useRef, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { PageHeader, Panel, Badge, URGENSI_VARIANT } from "@/components/ui-toc";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { MapPin, AlertTriangle } from "lucide-react";
import mapAsset from "@/assets/indonesia-provinces.geojson.asset.json";

export const Route = createFileRoute("/_app/peta")({ component: PetaPage });

const MAP_WIDTH = 2021;
const MAP_HEIGHT = 922;

type GeoFeature = {
  type: "Feature";
  id?: string | number;
  properties?: Record<string, unknown>;
  geometry: { type: string; coordinates: unknown };
};

type GeoCollection = {
  type: "FeatureCollection";
  features: GeoFeature[];
};

type LonLat = [number, number];
type Bounds = { minLon: number; maxLon: number; minLat: number; maxLat: number };

function collectLonLat(input: unknown, output: LonLat[] = []): LonLat[] {
  if (!Array.isArray(input)) return output;
  if (typeof input[0] === "number" && typeof input[1] === "number") {
    const lon = input[0];
    const lat = input[1];
    if (lon >= 90 && lon <= 145 && lat >= -15 && lat <= 10) output.push([lon, lat]);
    return output;
  }
  for (const item of input) collectLonLat(item, output);
  return output;
}

function boundsFor(features: GeoFeature[]): Bounds | null {
  const points = features.flatMap((feature) => collectLonLat(feature.geometry.coordinates));
  if (points.length === 0) return null;
  return points.reduce(
    (bounds, [lon, lat]) => ({
      minLon: Math.min(bounds.minLon, lon),
      maxLon: Math.max(bounds.maxLon, lon),
      minLat: Math.min(bounds.minLat, lat),
      maxLat: Math.max(bounds.maxLat, lat),
    }),
    { minLon: Infinity, maxLon: -Infinity, minLat: Infinity, maxLat: -Infinity },
  );
}

function createProject(bounds: Bounds) {
  const paddingX = 68;
  const paddingY = 44;
  const spanLon = Math.max(bounds.maxLon - bounds.minLon, 1);
  const spanLat = Math.max(bounds.maxLat - bounds.minLat, 1);
  const scale = Math.min(
    (MAP_WIDTH - paddingX * 2) / spanLon,
    (MAP_HEIGHT - paddingY * 2) / spanLat,
  );
  const offsetX = (MAP_WIDTH - spanLon * scale) / 2;
  const offsetY = (MAP_HEIGHT - spanLat * scale) / 2;

  return ([lon, lat]: LonLat) => [
    (lon - bounds.minLon) * scale + offsetX,
    (bounds.maxLat - lat) * scale + offsetY,
  ];
}

function isLonLat(value: unknown): value is LonLat {
  return (
    Array.isArray(value) &&
    typeof value[0] === "number" &&
    typeof value[1] === "number" &&
    value[0] >= 90 &&
    value[0] <= 145 &&
    value[1] >= -15 &&
    value[1] <= 10
  );
}

function ringPath(ring: unknown, project: (point: LonLat) => number[]): string {
  if (!Array.isArray(ring)) return "";
  const points = ring.filter(isLonLat).map(project);
  if (points.length < 3) return "";
  return `${points.map(([x, y], index) => `${index === 0 ? "M" : "L"}${x.toFixed(2)},${y.toFixed(2)}`).join(" ")}Z`;
}

function featurePath(feature: GeoFeature, project: (point: LonLat) => number[]): string {
  const coordinates = feature.geometry.coordinates;
  if (!Array.isArray(coordinates)) return "";
  const polygons = feature.geometry.type === "MultiPolygon" ? coordinates.flat() : coordinates;
  return polygons.map((ring) => ringPath(ring, project)).join(" ");
}

function normalize(value: string): string {
  return value
    .toLowerCase()
    .replace(/^polda\s+/, "")
    .replace(/kep\./g, "kepulauan")
    .replace(/d\.i\./g, "daerah istimewa")
    .replace(/[^a-z0-9\s]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function titleCase(value: string): string {
  return value
    .toLowerCase()
    .split(/\s+/)
    .filter(Boolean)
    .map((part) => (part.length <= 3 ? part.toUpperCase() : part[0].toUpperCase() + part.slice(1)))
    .join(" ")
    .replace("Dki", "DKI")
    .replace("Di ", "DI ");
}

function provinceName(feature: GeoFeature, index: number): string {
  const props = feature.properties ?? {};
  const keys = [
    "state",
    "State",
    "STATE",
    "Propinsi",
    "PROVINSI",
    "provinsi",
    "Province",
    "province",
    "name",
    "NAME",
    "Nama",
    "nama",
    "Propinsi_1",
  ];

  for (const key of keys) {
    const value = props[key];
    if (typeof value === "string" && value.trim()) return titleCase(value.trim());
  }

  const fallback = Object.values(props).find(
    (value) => typeof value === "string" && value.trim().length > 2,
  );
  return typeof fallback === "string" ? titleCase(fallback) : `Provinsi ${index + 1}`;
}

function matchProvince(polda: string | null, province: string): boolean {
  if (!polda) return false;
  const p = normalize(polda);
  const pr = normalize(province);
  if (p === pr || p.includes(pr) || pr.includes(p)) return true;

  const aliases: Record<string, string[]> = {
    "jakarta raya": ["jakarta", "metro jaya", "dki", "dki jakarta", "daerah khusus ibukota jakarta"],
    "dki jakarta": ["jakarta", "metro jaya", "jakarta raya"],
    "yogyakarta": ["di yogyakarta", "diy", "daerah istimewa yogyakarta"],
    "daerah istimewa yogyakarta": ["yogyakarta", "diy", "di yogyakarta"],
    "bangka belitung": ["babel", "kepulauan bangka belitung", "kep babel"],
    "papua barat": ["irian jaya barat", "papua barat daya"],
    "kepulauan bangka belitung": ["bangka belitung", "babel", "kepulauan babel", "kep babel"],
    "kepulauan riau": ["kepri", "kep riau"],
    "nusa tenggara barat": ["ntb"],
    "nusa tenggara timur": ["ntt"],
    "sumatera utara": ["sumut"],
    "sumatera barat": ["sumbar"],
    "sumatera selatan": ["sumsel"],
    "kalimantan barat": ["kalbar"],
    "kalimantan tengah": ["kalteng"],
    "kalimantan selatan": ["kalsel"],
    "kalimantan timur": ["kaltim"],
    "kalimantan utara": ["kaltara"],
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

  return (
    aliases[pr]?.some((alias) => p === normalize(alias) || p.includes(normalize(alias))) ?? false
  );
}

function PetaPage() {
  const [selected, setSelected] = useState<string | null>(null);
  const [hover, setHover] = useState<{ name: string; x: number; y: number } | null>(null);
  const [view, setView] = useState({ x: 0, y: 0, k: 1 });
  const wrapRef = useRef<HTMLDivElement>(null);
  const panRef = useRef<{ sx: number; sy: number; ox: number; oy: number; moved: boolean } | null>(
    null,
  );
  const draggedRef = useRef(false);

  const { data: geoData } = useQuery<GeoCollection>({
    queryKey: ["indo-geojson-34-provinces"],
    queryFn: async () => {
      const response = await fetch(mapAsset.url);
      if (!response.ok) throw new Error("Gagal memuat peta provinsi");
      return response.json();
    },
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

  const provinceFeatures = useMemo(
    () =>
      (geoData?.features ?? []).map((feature, index) => ({
        feature,
        name: provinceName(feature, index),
      })),
    [geoData],
  );

  const pathFor = useMemo(() => {
    const bounds = boundsFor(provinceFeatures.map(({ feature }) => feature));
    if (!bounds) return null;
    const project = createProject(bounds);
    return (feature: GeoFeature) => featurePath(feature, project);
  }, [provinceFeatures]);

  const counts = useMemo(() => {
    const map: Record<string, number> = {};
    for (const { name } of provinceFeatures) map[name] = 0;
    for (const lap of laps ?? []) {
      const province = provinceFeatures.find(({ name }) => matchProvince(lap.polda, name));
      if (province) map[province.name] += 1;
    }
    return map;
  }, [laps, provinceFeatures]);

  const maxCount = Math.max(...Object.values(counts), 1);
  const selectedReports = useMemo(
    () => (laps ?? []).filter((lap) => selected && matchProvince(lap.polda, selected)),
    [laps, selected],
  );

  const fillFor = (count: number) => {
    if (count === 0) return "oklch(0.28 0.04 200 / 0.62)";
    const intensity = count / maxCount;
    if (intensity > 0.66) return "var(--cyber-red)";
    if (intensity > 0.33) return "var(--cyber-amber)";
    return "var(--cyber-green)";
  };

  const zoomAt = (factor: number) => {
    setView((current) => ({ ...current, k: Math.min(8, Math.max(1, current.k * factor)) }));
  };

  const resetView = () => setView({ x: 0, y: 0, k: 1 });

  const selectProvince = (name: string) => {
    if (!draggedRef.current && !panRef.current?.moved) setSelected(name);
  };

  return (
    <div>
      <PageHeader
        code="10"
        title="Peta Operasional"
        subtitle="Peta provinsi Indonesia interaktif — 34 provinsi dapat diklik"
      />

      <Panel title="Peta Sebaran Indonesia" glow className="relative">
        <div
          ref={wrapRef}
          className="relative w-full overflow-hidden rounded border border-primary/20"
          style={{
            aspectRatio: `${MAP_WIDTH} / ${MAP_HEIGHT}`,
            background: "oklch(0.16 0.03 220 / 0.6)",
            touchAction: "none",
          }}
          onWheel={(event) => {
            event.preventDefault();
            zoomAt(event.deltaY < 0 ? 1.2 : 1 / 1.2);
          }}
          onPointerDown={(event) => {
            panRef.current = {
              sx: event.clientX,
              sy: event.clientY,
              ox: view.x,
              oy: view.y,
              moved: false,
            };
            draggedRef.current = false;
            event.currentTarget.style.cursor = "grabbing";
          }}
          onPointerMove={(event) => {
            if (!panRef.current) return;
            const dx = event.clientX - panRef.current.sx;
            const dy = event.clientY - panRef.current.sy;
            if (!panRef.current.moved && Math.hypot(dx, dy) < 5) return;
            panRef.current.moved = true;
            draggedRef.current = true;
            setView((current) => ({
              k: current.k,
              x: panRef.current!.ox + dx,
              y: panRef.current!.oy + dy,
            }));
          }}
          onPointerUp={(event) => {
            panRef.current = null;
            event.currentTarget.style.cursor = "grab";
            setTimeout(() => {
              draggedRef.current = false;
            }, 0);
          }}
          onPointerLeave={(event) => {
            panRef.current = null;
            draggedRef.current = false;
            event.currentTarget.style.cursor = "grab";
          }}
        >
          <svg
            className="absolute inset-0 w-full h-full pointer-events-none opacity-40"
            aria-hidden="true"
          >
            <defs>
              <pattern id="cybergrid2" width="32" height="32" patternUnits="userSpaceOnUse">
                <path
                  d="M 32 0 L 0 0 0 32"
                  fill="none"
                  stroke="var(--cyber-grid)"
                  strokeWidth="0.5"
                />
              </pattern>
            </defs>
            <rect width="100%" height="100%" fill="url(#cybergrid2)" />
          </svg>

          {pathFor ? (
            <svg
              className="absolute inset-0 h-full w-full"
              viewBox={`0 0 ${MAP_WIDTH} ${MAP_HEIGHT}`}
              role="img"
              aria-label="Peta operasional Indonesia 34 provinsi"
              style={{
                transform: `translate(${view.x}px, ${view.y}px) scale(${view.k})`,
                transformOrigin: "0 0",
                cursor: "grab",
              }}
            >
              <g>
                {provinceFeatures.map(({ feature, name }, index) => {
                  const count = counts[name] ?? 0;
                  const isSelected = selected === name;
                  const isHovered = hover?.name === name;
                  return (
                    <path
                      key={`${name}-${feature.id ?? index}`}
                      d={pathFor(feature as never) ?? ""}
                      fill={fillFor(count)}
                      fillOpacity={isHovered || isSelected ? 1 : count === 0 ? 0.58 : 0.86}
                      stroke={isSelected ? "var(--cyber-cyan)" : "oklch(0.82 0.18 175 / 0.58)"}
                      strokeWidth={isSelected ? 2.4 : 1.15}
                      vectorEffect="non-scaling-stroke"
                      className="cursor-pointer transition-[fill-opacity,stroke-width] duration-150 outline-none"
                      tabIndex={0}
                      role="button"
                      aria-label={`Buka laporan ${name}`}
                      onPointerEnter={(event) => {
                        const rect = wrapRef.current?.getBoundingClientRect();
                        if (rect) {
                          setHover({
                            name,
                            x: event.clientX - rect.left,
                            y: event.clientY - rect.top,
                          });
                        }
                      }}
                      onPointerMove={(event) => {
                        const rect = wrapRef.current?.getBoundingClientRect();
                        if (rect) {
                          setHover({
                            name,
                            x: event.clientX - rect.left,
                            y: event.clientY - rect.top,
                          });
                        }
                      }}
                      onPointerLeave={() => setHover(null)}
                      onPointerUp={() => selectProvince(name)}
                      onClick={() => selectProvince(name)}
                      onKeyDown={(event) => {
                        if (event.key === "Enter" || event.key === " ") {
                          event.preventDefault();
                          setSelected(name);
                        }
                      }}
                    />
                  );
                })}
              </g>
            </svg>
          ) : (
            <div className="absolute inset-0 flex items-center justify-center font-mono-display text-primary/70 text-xs">
              [ LOADING_TACTICAL_MAP... ]
            </div>
          )}

          <div className="absolute top-2 left-2 flex flex-col gap-1 z-20">
            <button
              onClick={() => zoomAt(1.3)}
              className="w-8 h-8 rounded bg-background/80 border border-primary/40 text-primary font-mono-display text-sm hover:bg-primary/20 transition"
              aria-label="Zoom in"
            >
              +
            </button>
            <button
              onClick={() => zoomAt(1 / 1.3)}
              className="w-8 h-8 rounded bg-background/80 border border-primary/40 text-primary font-mono-display text-sm hover:bg-primary/20 transition"
              aria-label="Zoom out"
            >
              −
            </button>
            <button
              onClick={resetView}
              className="w-8 h-8 rounded bg-background/80 border border-primary/40 text-primary font-mono-display text-[10px] hover:bg-primary/20 transition"
              aria-label="Reset"
            >
              ⌂
            </button>
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

          <div className="absolute bottom-1 left-2 text-[10px] font-mono-display text-primary/70 z-20">
            [ TACTICAL_GRID_LIVE ]
          </div>
          <div className="absolute bottom-1 right-2 text-[10px] font-mono-display text-muted-foreground z-20">
            {provinceFeatures.length || 34} PROVINSI
          </div>
        </div>

        <div className="mt-3 flex flex-wrap gap-3 text-[10px] font-mono-display text-muted-foreground">
          <span className="flex items-center gap-1">
            <span
              className="w-3 h-3 rounded-sm"
              style={{ background: "oklch(0.28 0.04 200 / 0.62)" }}
            />{" "}
            Tidak ada laporan
          </span>
          <span className="flex items-center gap-1">
            <span className="w-3 h-3 rounded-sm" style={{ background: "var(--cyber-green)" }} />{" "}
            Rendah
          </span>
          <span className="flex items-center gap-1">
            <span className="w-3 h-3 rounded-sm" style={{ background: "var(--cyber-amber)" }} />{" "}
            Sedang
          </span>
          <span className="flex items-center gap-1">
            <span className="w-3 h-3 rounded-sm" style={{ background: "var(--cyber-red)" }} />{" "}
            Tinggi
          </span>
        </div>
      </Panel>

      <Dialog open={!!selected} onOpenChange={(open) => !open && setSelected(null)}>
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
            {selectedReports.map((lap) => (
              <div
                key={lap.id}
                className="p-3 rounded bg-muted/20 border-l-2"
                style={{
                  borderColor:
                    lap.urgensi === "kritis"
                      ? "var(--cyber-red)"
                      : lap.urgensi === "tinggi"
                        ? "var(--cyber-amber)"
                        : "var(--cyber-cyan)",
                }}
              >
                <div className="flex items-center justify-between mb-1">
                  <span className="text-[10px] font-mono text-muted-foreground">
                    {new Date(lap.created_at).toLocaleString("id-ID")}
                  </span>
                  <Badge variant={URGENSI_VARIANT[lap.urgensi as keyof typeof URGENSI_VARIANT]}>
                    {lap.urgensi === "kritis" && <AlertTriangle className="w-3 h-3" />}
                    {lap.urgensi}
                  </Badge>
                </div>
                <div className="text-sm font-semibold">{lap.judul}</div>
                {lap.wilayah && (
                  <div className="text-[11px] font-mono text-muted-foreground mt-0.5">
                    📍 {lap.wilayah}
                  </div>
                )}
                {lap.isi && (
                  <div className="text-xs text-muted-foreground mt-1 line-clamp-3">{lap.isi}</div>
                )}
              </div>
            ))}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
