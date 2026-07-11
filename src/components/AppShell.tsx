import { type ReactNode, useState } from "react";
import { Link, useLocation } from "@tanstack/react-router";
import { useAuth } from "@/hooks/useAuth";
import { useBranding } from "@/hooks/useBranding";
import {
  LayoutDashboard, Database, Brain, FileInput, FileText, Calendar, Archive,
  Wrench, Megaphone, Map, Users, MessageSquare, Bell, ExternalLink, Shield,
  UserCheck, Cpu, LogOut, Menu, X,
} from "lucide-react";
import sbtLogo from "@/assets/sbt-logo.jpeg.asset.json";


const NAV = [
  { to: "/dashboard", label: "Dashboard", icon: LayoutDashboard, code: "01" },
  { to: "/big-data", label: "Big Data Info", icon: Database, code: "02" },
  { to: "/ai-analisis", label: "AI Analisis", icon: Brain, code: "03" },
  { to: "/laporan-baru", label: "Input Laporan", icon: FileInput, code: "04" },
  { to: "/laporan-otomatis", label: "Laporan Otomatis", icon: FileText, code: "05" },
  { to: "/kalender", label: "Kalender Kamtibmas", icon: Calendar, code: "06" },
  { to: "/arsip", label: "Data Arsip", icon: Archive, code: "07" },
  { to: "/peralatan", label: "Peralatan & Sarpras", icon: Wrench, code: "08" },
  { to: "/pengumuman", label: "Pengumuman", icon: Megaphone, code: "09" },
  { to: "/peta", label: "Peta Operasional", icon: Map, code: "10" },
  { to: "/users", label: "Manajemen User", icon: Users, code: "11" },
  { to: "/chat-ai", label: "AI Chat Assistant", icon: MessageSquare, code: "12" },
  { to: "/notifikasi", label: "Notifikasi & EWS", icon: Bell, code: "13" },
  { to: "/tools", label: "Link Tools TOC", icon: ExternalLink, code: "14" },
  { to: "/keamanan", label: "Keamanan Sistem", icon: Shield, code: "15" },
  { to: "/personil", label: "Data Personil", icon: UserCheck, code: "16" },
  { to: "/pengaturan-ai", label: "Pengaturan AI", icon: Cpu, code: "17" },
] as const;

export function AppShell({ children }: { children: ReactNode }) {
  const { user, signOut } = useAuth();
  const loc = useLocation();
  const [open, setOpen] = useState(false);

  return (
    <div className="min-h-screen flex">
      {/* Sidebar */}
      <aside className={`fixed lg:sticky top-0 left-0 z-40 h-screen w-64 bg-sidebar border-r border-sidebar-border flex flex-col transition-transform ${open ? "translate-x-0" : "-translate-x-full lg:translate-x-0"}`}>
        <div className="p-4 border-b border-sidebar-border">
          <div className="flex items-center gap-2">
            <div className="w-10 h-10 rounded bg-background border border-primary/40 flex items-center justify-center overflow-hidden">
              <img src={sbtLogo.url} alt="Sat Bantek" className="w-full h-full object-contain" />
            </div>
            <div className="min-w-0">
              <div className="font-mono-display text-[10px] text-primary tracking-widest">[ TOC ]</div>
              <div className="font-mono-display text-sm font-bold leading-tight">SAT BANTEK</div>
            </div>
          </div>
          <div className="mt-3 flex items-center gap-2 text-[10px] font-mono-display text-muted-foreground">
            <span className="blink-dot" /> SYS_ONLINE · 34_SUBDEN
          </div>
        </div>

        <nav className="flex-1 overflow-y-auto py-2 px-2 space-y-0.5">
          {NAV.map((item) => {
            const active = loc.pathname === item.to || (item.to !== "/dashboard" && loc.pathname.startsWith(item.to));
            const Icon = item.icon;
            return (
              <Link key={item.to} to={item.to} onClick={() => setOpen(false)}
                className={`group flex items-center gap-3 px-3 py-2 rounded-md text-sm transition relative ${
                  active
                    ? "bg-primary/15 text-primary border-l-2 border-primary"
                    : "text-sidebar-foreground/70 hover:text-sidebar-foreground hover:bg-sidebar-accent border-l-2 border-transparent"
                }`}>
                <span className="font-mono-display text-[10px] text-muted-foreground w-5">{item.code}</span>
                <Icon className="w-4 h-4 shrink-0" />
                <span className="font-medium truncate">{item.label}</span>
                {active && <span className="absolute right-2 top-1/2 -translate-y-1/2 w-1.5 h-1.5 rounded-full bg-primary shadow-[0_0_8px_var(--cyber-cyan)]" />}
              </Link>
            );
          })}
        </nav>

        <div className="p-3 border-t border-sidebar-border">
          <div className="px-2 py-2 mb-2 rounded bg-sidebar-accent/40 border border-sidebar-border">
            <div className="text-[10px] font-mono-display text-primary tracking-widest">[ OPERATOR ]</div>
            <div className="text-xs font-medium truncate">{user?.email}</div>
          </div>
          <button onClick={() => signOut()} className="w-full flex items-center gap-2 px-3 py-2 text-xs rounded text-destructive hover:bg-destructive/10 transition">
            <LogOut className="w-4 h-4" /> Sign Out
          </button>
        </div>
      </aside>

      {/* Main */}
      <div className="flex-1 min-w-0 lg:ml-0">
        {/* Topbar */}
        <header className="sticky top-0 z-30 h-14 border-b border-border bg-background/80 backdrop-blur-sm flex items-center px-4 gap-3">
          <button onClick={() => setOpen(!open)} className="lg:hidden p-2 -ml-2">
            {open ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
          </button>
          <div className="flex items-center gap-3 flex-1">
            <span className="font-mono-display text-[10px] text-primary tracking-widest hidden sm:inline">[ TACTICAL_SIBER ]</span>
            <span className="text-xs text-muted-foreground font-mono hidden md:inline">/ {loc.pathname.replace("/", "") || "root"}</span>
          </div>
          <div className="flex items-center gap-4 text-[10px] font-mono-display">
            <span className="hidden md:flex items-center gap-1.5 text-muted-foreground"><span className="blink-dot" />LIVE</span>
            <span className="text-muted-foreground">{new Date().toLocaleDateString("id-ID", { day: "2-digit", month: "short", year: "numeric" }).toUpperCase()}</span>
          </div>
        </header>

        <main className="p-4 md:p-6 max-w-[1600px] mx-auto">{children}</main>
      </div>

      {open && <div onClick={() => setOpen(false)} className="lg:hidden fixed inset-0 z-30 bg-black/60" />}
    </div>
  );
}
