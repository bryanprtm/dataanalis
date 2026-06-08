import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { PageHeader, Panel, Badge, URGENSI_VARIANT } from "@/components/ui-toc";
import { Activity, AlertTriangle, FileText, Archive, Wrench, TrendingUp, Radio, X } from "lucide-react";
import { LineChart, Line, BarChart, Bar, ResponsiveContainer, XAxis, YAxis, Tooltip, CartesianGrid, PieChart, Pie, Cell } from "recharts";
import { Link } from "@tanstack/react-router";

export const Route = createFileRoute("/_app/dashboard")({ component: DashboardPage });

type Filter = { kind: "jenis" | "urgensi" | "day"; value: string; label: string };

function DashboardPage() {
  const [filter, setFilter] = useState<Filter | null>(null);
  const { data: stats } = useQuery({
    queryKey: ["dashboard-stats"],
    queryFn: async () => {
      const [lap, arsip, peralatan, kegiatan, kritis] = await Promise.all([
        supabase.from("laporan").select("id,jenis,urgensi,polda,created_at,judul,status").order("created_at", { ascending: false }),
        supabase.from("arsip").select("id", { count: "exact", head: true }),
        supabase.from("peralatan").select("id", { count: "exact", head: true }),
        supabase.from("kegiatan").select("id", { count: "exact", head: true }),
        supabase.from("laporan").select("id,judul,polda,urgensi,created_at").eq("urgensi", "kritis").order("created_at", { ascending: false }).limit(5),
      ]);
      return {
        laporan: lap.data ?? [],
        arsipCount: arsip.count ?? 0,
        peralatanCount: peralatan.count ?? 0,
        kegiatanCount: kegiatan.count ?? 0,
        kritis: kritis.data ?? [],
      };
    },
  });

  const laporan = stats?.laporan ?? [];
  const last7 = Array.from({ length: 7 }).map((_, i) => {
    const d = new Date(); d.setDate(d.getDate() - (6 - i));
    const dayKey = d.toISOString().split("T")[0];
    const count = laporan.filter((l) => l.created_at.startsWith(dayKey)).length;
    return { day: d.toLocaleDateString("id-ID", { weekday: "short" }), count };
  });

  const byJenis = ["intelijen","cyber","kejadian","kamtibmas"].map(j => ({
    name: j, value: laporan.filter(l => l.jenis === j).length,
  }));

  const byUrgensi = (["rendah","sedang","tinggi","kritis"] as const).map(u => ({
    name: u, value: laporan.filter(l => l.urgensi === u).length,
  }));

  const COLORS = ["var(--cyber-cyan)", "var(--cyber-green)", "var(--cyber-amber)", "var(--cyber-red)"];

  return (
    <div>
      <PageHeader code="01" title="Command Center" subtitle="Ringkasan situasi nasional 34 Subden Bantis" />

      <div className="grid grid-cols-2 lg:grid-cols-5 gap-3 mb-6">
        <StatCard icon={FileText} label="Laporan" value={laporan.length} accent="cyan" />
        <StatCard icon={AlertTriangle} label="Kritis" value={stats?.kritis.length ?? 0} accent="red" />
        <StatCard icon={Archive} label="Arsip" value={stats?.arsipCount ?? 0} accent="green" />
        <StatCard icon={Wrench} label="Peralatan" value={stats?.peralatanCount ?? 0} accent="amber" />
        <StatCard icon={Activity} label="Kegiatan" value={stats?.kegiatanCount ?? 0} accent="cyan" />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 mb-6">
        <Panel title="Tren Laporan 7 Hari" className="lg:col-span-2">
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={last7}
                onClick={(s: { activePayload?: Array<{ payload: { dayKey: string; day: string } }> }) => {
                  const p = s?.activePayload?.[0]?.payload;
                  if (p) setFilter({ kind: "day", value: p.dayKey, label: `Hari ${p.day}` });
                }}
                style={{ cursor: "pointer" }}
              >
                <CartesianGrid stroke="var(--color-border)" strokeDasharray="3 3" />
                <XAxis dataKey="day" stroke="var(--color-muted-foreground)" fontSize={11} />
                <YAxis stroke="var(--color-muted-foreground)" fontSize={11} />
                <Tooltip contentStyle={{ background: "var(--color-card)", border: "1px solid var(--color-border)", fontSize: 12 }} />
                <Line type="monotone" dataKey="count" stroke="var(--cyber-cyan)" strokeWidth={2} dot={{ fill: "var(--cyber-cyan)", r: 4 }} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </Panel>

        <Panel title="Distribusi Urgensi">
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie data={byUrgensi} dataKey="value" nameKey="name" innerRadius={50} outerRadius={80} paddingAngle={3}
                  onClick={(d: { name?: string }) => d?.name && setFilter({ kind: "urgensi", value: d.name, label: `Urgensi ${d.name}` })}
                  cursor="pointer">
                  {byUrgensi.map((_, i) => <Cell key={i} fill={COLORS[i]} />)}
                </Pie>
                <Tooltip contentStyle={{ background: "var(--color-card)", border: "1px solid var(--color-border)", fontSize: 12 }} />
              </PieChart>
            </ResponsiveContainer>
          </div>
          <div className="grid grid-cols-2 gap-1 text-[10px] font-mono-display">
            {byUrgensi.map((u, i) => (
              <div key={u.name} className="flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full" style={{ background: COLORS[i] }} />
                <span className="text-muted-foreground uppercase">{u.name}</span>
                <span className="ml-auto">{u.value}</span>
              </div>
            ))}
          </div>
        </Panel>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 mb-6">
        <Panel title="Distribusi Jenis Laporan" className="lg:col-span-2">
          <div className="h-56">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={byJenis}>
                <CartesianGrid stroke="var(--color-border)" strokeDasharray="3 3" />
                <XAxis dataKey="name" stroke="var(--color-muted-foreground)" fontSize={11} />
                <YAxis stroke="var(--color-muted-foreground)" fontSize={11} />
                <Tooltip contentStyle={{ background: "var(--color-card)", border: "1px solid var(--color-border)", fontSize: 12 }} />
                <Bar dataKey="value" fill="var(--cyber-cyan)" radius={[4,4,0,0]} cursor="pointer"
                  onClick={(d: { name?: string }) => d?.name && setFilter({ kind: "jenis", value: d.name, label: `Jenis ${d.name}` })} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </Panel>

        <Panel title="Isu Menonjol — Kritis" glow>
          <div className="space-y-2">
            {stats?.kritis.length === 0 && (
              <p className="text-xs text-muted-foreground font-mono">[ TIDAK ADA ISU KRITIS ]</p>
            )}
            {stats?.kritis.map((k) => (
              <div key={k.id} className="p-2 rounded bg-destructive/10 border-l-2 border-destructive">
                <div className="flex items-start gap-2">
                  <Radio className="w-3 h-3 text-destructive mt-1" />
                  <div className="min-w-0 flex-1">
                    <div className="text-xs font-medium truncate">{k.judul}</div>
                    <div className="text-[10px] text-muted-foreground font-mono mt-0.5">{k.polda ?? "—"}</div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </Panel>
      </div>

      <Panel title="Laporan Terbaru">
        <div className="overflow-x-auto">
          <table className="w-full text-xs">
            <thead>
              <tr className="text-left text-muted-foreground font-mono-display border-b border-border">
                <th className="py-2 pr-3">WAKTU</th>
                <th className="py-2 pr-3">JUDUL</th>
                <th className="py-2 pr-3">JENIS</th>
                <th className="py-2 pr-3">POLDA</th>
                <th className="py-2 pr-3">URGENSI</th>
                <th className="py-2">STATUS</th>
              </tr>
            </thead>
            <tbody>
              {laporan.slice(0, 10).map((l) => (
                <tr key={l.id} className="border-b border-border/30 hover:bg-accent/30">
                  <td className="py-2 pr-3 font-mono text-muted-foreground">{new Date(l.created_at).toLocaleString("id-ID", { day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit" })}</td>
                  <td className="py-2 pr-3 truncate max-w-xs">{l.judul}</td>
                  <td className="py-2 pr-3"><Badge variant="cyan">{l.jenis}</Badge></td>
                  <td className="py-2 pr-3 text-muted-foreground">{l.polda ?? "—"}</td>
                  <td className="py-2 pr-3"><Badge variant={URGENSI_VARIANT[l.urgensi as keyof typeof URGENSI_VARIANT]}>{l.urgensi}</Badge></td>
                  <td className="py-2"><Badge variant="outline">{l.status}</Badge></td>
                </tr>
              ))}
              {laporan.length === 0 && (
                <tr><td colSpan={6} className="py-8 text-center text-muted-foreground font-mono text-[11px]">[ NO_DATA — input laporan pertama via <Link to="/laporan-baru" className="text-primary underline">Modul 04</Link> ]</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </Panel>
    </div>
  );
}

function StatCard({ icon: Icon, label, value, accent }: { icon: typeof Activity; label: string; value: number; accent: "cyan"|"red"|"green"|"amber" }) {
  const colors = {
    cyan: "var(--cyber-cyan)", red: "var(--cyber-red)", green: "var(--cyber-green)", amber: "var(--cyber-amber)",
  };
  return (
    <div className="panel scanline p-3 relative">
      <div className="flex items-center justify-between">
        <span className="text-[10px] font-mono-display text-muted-foreground tracking-wider">{label.toUpperCase()}</span>
        <Icon className="w-4 h-4" style={{ color: colors[accent] }} />
      </div>
      <div className="mt-2 text-2xl font-bold font-mono-display" style={{ color: colors[accent], textShadow: `0 0 12px ${colors[accent]}66` }}>
        {value.toLocaleString("id-ID")}
      </div>
      <div className="mt-1 flex items-center gap-1 text-[9px] text-muted-foreground font-mono">
        <TrendingUp className="w-3 h-3" /> LIVE
      </div>
    </div>
  );
}
