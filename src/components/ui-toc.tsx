import type { ReactNode } from "react";

export function PageHeader({ code, title, subtitle, actions }: { code: string; title: string; subtitle?: string; actions?: ReactNode }) {
  return (
    <div className="mb-6 flex flex-col md:flex-row md:items-end md:justify-between gap-3">
      <div>
        <div className="font-mono-display text-[11px] text-primary tracking-widest text-glow-cyan">[ MODULE_{code} ]</div>
        <h1 className="text-2xl md:text-3xl font-bold font-mono-display mt-1">{title}</h1>
        {subtitle && <p className="text-sm text-muted-foreground mt-1">{subtitle}</p>}
      </div>
      {actions && <div className="flex flex-wrap gap-2">{actions}</div>}
    </div>
  );
}

export function Panel({ title, children, glow, className = "" }: { title?: string; children: ReactNode; glow?: boolean; className?: string }) {
  return (
    <div className={`panel scanline ${glow ? "panel-glow" : ""} p-5 relative ${className}`}>
      {title && (
        <div className="mb-3 flex items-center justify-between">
          <h3 className="font-mono-display text-xs tracking-widest text-muted-foreground">[ {title.toUpperCase()} ]</h3>
        </div>
      )}
      {children}
    </div>
  );
}

export function Badge({ variant = "default", children }: { variant?: "default" | "cyan" | "green" | "amber" | "red" | "outline"; children: ReactNode }) {
  const styles: Record<string, string> = {
    default: "bg-muted text-foreground",
    cyan: "bg-primary/15 text-primary border border-primary/40",
    green: "bg-[color:var(--cyber-green)]/15 text-[color:var(--cyber-green)] border border-[color:var(--cyber-green)]/40",
    amber: "bg-[color:var(--cyber-amber)]/15 text-[color:var(--cyber-amber)] border border-[color:var(--cyber-amber)]/40",
    red: "bg-destructive/15 text-destructive border border-destructive/40",
    outline: "border border-border text-muted-foreground",
  };
  return <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-mono-display tracking-wider ${styles[variant]}`}>{children}</span>;
}

export const URGENSI_VARIANT = { rendah: "green", sedang: "cyan", tinggi: "amber", kritis: "red" } as const;
