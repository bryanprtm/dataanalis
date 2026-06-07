import { createFileRoute } from "@tanstack/react-router";
import { PageHeader, Panel, Badge } from "@/components/ui-toc";
import { Shield, Lock, Key, Database, ScrollText, Wifi } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";

export const Route = createFileRoute("/_app/keamanan")({ component: KeamananPage });

function KeamananPage() {
  const { user } = useAuth();

  const items = [
    { icon: Lock, title: "Login Username & Password", status: "AKTIF", desc: "Autentikasi terenkripsi end-to-end" },
    { icon: Key, title: "Role Based Access Control", status: "AKTIF", desc: "Super Admin · Admin Sat · Admin Subden · Operator · Viewer" },
    { icon: ScrollText, title: "Log Aktivitas Pengguna", status: "AKTIF", desc: "Setiap aksi tercatat ke audit log" },
    { icon: Database, title: "Backup Database Otomatis", status: "AKTIF", desc: "Snapshot harian terenkripsi" },
    { icon: Wifi, title: "Akses VPN", status: "STANDBY", desc: "Untuk akses dari jaringan luar TOC" },
    { icon: Shield, title: "Enkripsi Dokumen", status: "AKTIF", desc: "AES-256 untuk arsip & laporan kategori intelijen" },
  ];

  return (
    <div>
      <PageHeader code="15" title="Keamanan Sistem" subtitle="Status keamanan, RBAC, dan audit kontrol" />

      <Panel title="Identitas Sesi" className="mb-4">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3 text-xs">
          <div><span className="text-[10px] font-mono-display text-muted-foreground">USER ID</span><div className="font-mono mt-1 truncate">{user?.id}</div></div>
          <div><span className="text-[10px] font-mono-display text-muted-foreground">EMAIL</span><div className="font-mono mt-1 truncate">{user?.email}</div></div>
          <div><span className="text-[10px] font-mono-display text-muted-foreground">SESSION</span><div className="mt-1"><Badge variant="green"><span className="blink-dot" /> ENCRYPTED</Badge></div></div>
        </div>
      </Panel>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        {items.map(i => (
          <div key={i.title} className="panel scanline p-4 flex items-start gap-3">
            <div className="w-10 h-10 rounded bg-primary/10 border border-primary/40 flex items-center justify-center shrink-0">
              <i.icon className="w-5 h-5 text-primary text-glow-cyan" />
            </div>
            <div className="flex-1">
              <div className="flex items-center justify-between gap-2 mb-1">
                <h3 className="font-semibold text-sm">{i.title}</h3>
                <Badge variant={i.status === "AKTIF" ? "green" : "outline"}>{i.status}</Badge>
              </div>
              <p className="text-xs text-muted-foreground">{i.desc}</p>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
