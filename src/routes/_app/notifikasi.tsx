import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { PageHeader, Panel, Badge } from "@/components/ui-toc";
import { Bell, AlertTriangle, FileText, Calendar } from "lucide-react";

export const Route = createFileRoute("/_app/notifikasi")({ component: NotifPage });

function NotifPage() {
  const { data: notif } = useQuery({
    queryKey: ["notif"],
    queryFn: async () => {
      const { data } = await supabase.from("notifikasi").select("*").order("created_at", { ascending: false }).limit(50);
      return data ?? [];
    },
  });

  const { data: ews } = useQuery({
    queryKey: ["ews"],
    queryFn: async () => {
      const { data } = await supabase.from("laporan").select("id,judul,urgensi,polda,created_at").in("urgensi", ["tinggi", "kritis"]).order("created_at", { ascending: false }).limit(20);
      return data ?? [];
    },
  });

  return (
    <div>
      <PageHeader code="13" title="Notifikasi & Early Warning System" subtitle="Peringatan dini, notifikasi laporan penting, dan event kamtibmas" />

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <Panel title="Early Warning — Laporan Urgensi Tinggi" glow>
          <div className="space-y-2">
            {ews?.map(e => (
              <div key={e.id} className="p-3 rounded bg-destructive/10 border-l-2 border-destructive flex items-start gap-2">
                <AlertTriangle className="w-4 h-4 text-destructive shrink-0 mt-0.5" />
                <div className="flex-1">
                  <div className="flex items-center justify-between gap-2">
                    <div className="font-medium text-sm">{e.judul}</div>
                    <Badge variant={e.urgensi === "kritis" ? "red" : "amber"}>{e.urgensi}</Badge>
                  </div>
                  <div className="text-[10px] font-mono text-muted-foreground mt-1">{e.polda ?? "—"} · {new Date(e.created_at).toLocaleString("id-ID")}</div>
                </div>
              </div>
            ))}
            {ews?.length === 0 && <p className="text-xs text-muted-foreground font-mono">[ TIDAK ADA PERINGATAN AKTIF ]</p>}
          </div>
        </Panel>

        <Panel title="Notifikasi Sistem">
          <div className="space-y-2">
            {notif?.map(n => (
              <div key={n.id} className="p-2 rounded bg-muted/20 flex items-start gap-2">
                <Bell className="w-4 h-4 text-primary shrink-0 mt-0.5" />
                <div className="flex-1">
                  <div className="text-sm font-medium">{n.judul}</div>
                  <div className="text-xs text-muted-foreground">{n.pesan}</div>
                  <div className="text-[10px] font-mono text-muted-foreground mt-1">{new Date(n.created_at).toLocaleString("id-ID")}</div>
                </div>
                {!n.dibaca && <span className="w-2 h-2 rounded-full bg-primary shrink-0 mt-2 shadow-[0_0_6px_var(--cyber-cyan)]" />}
              </div>
            ))}
            {notif?.length === 0 && (
              <div className="text-center py-8 text-muted-foreground font-mono text-xs">
                <Bell className="w-8 h-8 mx-auto mb-2 opacity-30" />
                [ INBOX KOSONG ]
              </div>
            )}
          </div>
        </Panel>
      </div>

      <Panel title="Kanal Notifikasi" className="mt-4">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
          {[
            { name: "Dashboard", icon: FileText, status: "AKTIF" },
            { name: "Email", icon: Bell, status: "AKTIF" },
            { name: "WhatsApp", icon: Bell, status: "STANDBY" },
            { name: "Kalender", icon: Calendar, status: "AKTIF" },
          ].map(c => (
            <div key={c.name} className="p-3 rounded bg-muted/20 flex items-center gap-2">
              <c.icon className="w-4 h-4 text-primary" />
              <div className="flex-1">
                <div className="text-xs font-medium">{c.name}</div>
                <Badge variant={c.status === "AKTIF" ? "green" : "outline"}>{c.status}</Badge>
              </div>
            </div>
          ))}
        </div>
      </Panel>
    </div>
  );
}
