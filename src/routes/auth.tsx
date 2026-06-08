import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "sonner";
import { Lock, User as UserIcon } from "lucide-react";
import sbtLogo from "@/assets/sbt-logo.jpeg.asset.json";

export const Route = createFileRoute("/auth")({
  component: AuthPage,
});

function AuthPage() {
  const navigate = useNavigate();
  const { user, loading } = useAuth();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);

  useEffect(() => { if (!loading && user) navigate({ to: "/dashboard" }); }, [user, loading, navigate]);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    try {
      const { error } = await supabase.auth.signInWithPassword({ email, password });
      if (error) throw error;
      toast.success("Login berhasil");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Gagal");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center p-4">
      <div className="w-full max-w-md panel scanline corner-brackets p-8 relative">
        <div className="flex items-center gap-3 mb-6">
          <div className="w-14 h-14 rounded-md bg-background border border-primary/40 flex items-center justify-center overflow-hidden">
            <img src={sbtLogo.url} alt="Sat Bantek" className="w-full h-full object-contain" />
          </div>
          <div>
            <div className="font-mono-display text-[10px] text-primary tracking-widest">[ SECURE_ACCESS ]</div>
            <h1 className="font-mono-display text-lg font-bold text-glow-cyan">TOC SAT BANTEK</h1>
            <p className="text-xs text-muted-foreground">Command & Intelligence Platform</p>
          </div>
        </div>

        <form onSubmit={submit} className="space-y-3">
          <Field label="Email" type="email" value={email} onChange={setEmail} required icon={<UserIcon className="w-4 h-4" />} />
          <Field label="Password" type="password" value={password} onChange={setPassword} required icon={<Lock className="w-4 h-4" />} />

          <button type="submit" disabled={busy}
            className="w-full py-3 bg-primary text-primary-foreground font-mono-display tracking-wider text-sm rounded-md hover:opacity-90 disabled:opacity-50 transition">
            {busy ? "[ PROCESSING... ]" : "[ AUTHENTICATE ]"}
          </button>
        </form>

        <div className="mt-6 pt-4 border-t border-border/40 flex items-center gap-2 text-[10px] text-muted-foreground font-mono-display">
          <span className="blink-dot" /> SYSTEM ONLINE · CHANNEL ENCRYPTED
        </div>
      </div>
    </div>
  );
}

function Field({ label, value, onChange, type = "text", required, placeholder, icon }: {
  label: string; value: string; onChange: (v: string) => void; type?: string; required?: boolean; placeholder?: string; icon?: React.ReactNode;
}) {
  return (
    <label className="block">
      <span className="text-[10px] font-mono-display tracking-wider text-muted-foreground">{label.toUpperCase()}</span>
      <div className="relative mt-1">
        {icon && <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">{icon}</span>}
        <input type={type} value={value} onChange={(e) => onChange(e.target.value)} required={required} placeholder={placeholder}
          className={`w-full ${icon ? "pl-9" : "pl-3"} pr-3 py-2 bg-input/40 border border-border rounded-md font-mono text-sm focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary/40`} />
      </div>
    </label>
  );
}
