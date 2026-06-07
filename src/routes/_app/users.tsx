import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { PageHeader, Panel, Badge } from "@/components/ui-toc";
import { User } from "lucide-react";

export const Route = createFileRoute("/_app/users")({ component: UsersPage });

function UsersPage() {
  const { data } = useQuery({
    queryKey: ["profiles-all"],
    queryFn: async () => {
      const { data } = await supabase.from("profiles").select("*").order("created_at", { ascending: false });
      return data ?? [];
    },
  });

  return (
    <div>
      <PageHeader code="11" title="Manajemen User" subtitle="Daftar personel & operator TOC Sat Bantek" />
      <Panel>
        <div className="overflow-x-auto">
          <table className="w-full text-xs">
            <thead><tr className="text-left text-muted-foreground font-mono-display border-b border-border">
              <th className="py-2 pr-3">NAMA</th><th className="py-2 pr-3">PANGKAT</th><th className="py-2 pr-3">NRP</th>
              <th className="py-2 pr-3">SUBDEN</th><th className="py-2 pr-3">POLDA</th><th className="py-2">STATUS</th>
            </tr></thead>
            <tbody>
              {data?.map(p => (
                <tr key={p.id} className="border-b border-border/30 hover:bg-accent/30">
                  <td className="py-2 pr-3 flex items-center gap-2"><div className="w-7 h-7 rounded-full bg-primary/15 border border-primary/40 flex items-center justify-center"><User className="w-3.5 h-3.5 text-primary" /></div><span className="font-medium">{p.nama}</span></td>
                  <td className="py-2 pr-3 font-mono">{p.pangkat ?? "—"}</td>
                  <td className="py-2 pr-3 font-mono text-muted-foreground">{p.nrp ?? "—"}</td>
                  <td className="py-2 pr-3">{p.subden ?? "—"}</td>
                  <td className="py-2 pr-3">{p.polda ?? "—"}</td>
                  <td className="py-2"><Badge variant="green"><span className="blink-dot" /> AKTIF</Badge></td>
                </tr>
              ))}
              {data?.length === 0 && <tr><td colSpan={6} className="py-8 text-center text-muted-foreground font-mono">[ NO_DATA ]</td></tr>}
            </tbody>
          </table>
        </div>
      </Panel>
    </div>
  );
}
