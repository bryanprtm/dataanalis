import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useRef, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { useQueryClient } from "@tanstack/react-query";
import { PageHeader, Panel, Badge } from "@/components/ui-toc";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { Key, Save, Trash2, AlertTriangle, Upload, Image as ImageIcon } from "lucide-react";
import { useRole } from "@/hooks/useRole";
import { useBranding } from "@/hooks/useBranding";
import { getAiSettings, saveAiSettings } from "@/lib/ai.functions";
import { saveBranding } from "@/lib/branding.functions";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/_app/pengaturan-ai")({ component: PengaturanAiPage });

type Settings = Awaited<ReturnType<typeof getAiSettings>>;


function PengaturanAiPage() {
  const { isSuperAdmin, loading: roleLoading } = useRole();
  const qc = useQueryClient();
  const getFn = useServerFn(getAiSettings);
  const saveFn = useServerFn(saveAiSettings);
  const saveBrandFn = useServerFn(saveBranding);
  const { data: branding, refetch: refetchBranding } = useBranding();

  const [settings, setSettings] = useState<Settings | null>(null);
  const [provider, setProvider] = useState<"auto" | "openai" | "lovable">("auto");
  const [openaiApiKey, setOpenaiApiKey] = useState("");
  const [openaiModel, setOpenaiModel] = useState("gpt-4o-mini");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  // Branding state
  const [title, setTitle] = useState("");
  const [subtitle, setSubtitle] = useState("");
  const [short, setShort] = useState("");
  const [savingBrand, setSavingBrand] = useState(false);
  const [uploadingLogo, setUploadingLogo] = useState(false);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  useEffect(() => {
    if (branding) {
      setTitle(branding.title);
      setSubtitle(branding.subtitle);
      setShort(branding.short);
    }
  }, [branding]);


  useEffect(() => {
    if (!isSuperAdmin) return;
    (async () => {
      try {
        const s = await getFn();
        setSettings(s);
        setProvider(s.provider);
        setOpenaiModel(s.openaiModel || "gpt-4o-mini");
      } catch (e) {
        toast.error("Gagal memuat pengaturan: " + (e as Error).message);
      } finally {
        setLoading(false);
      }
    })();
  }, [isSuperAdmin, getFn]);

  const handleSave = async () => {
    setSaving(true);
    try {
      await saveFn({ data: { provider, openaiApiKey: openaiApiKey || undefined, openaiModel } });
      toast.success("Pengaturan AI tersimpan");
      setOpenaiApiKey("");
      const s = await getFn();
      setSettings(s);
    } catch (e) {
      toast.error("Gagal menyimpan: " + (e as Error).message);
    } finally {
      setSaving(false);
    }
  };

  const handleClearKey = async () => {
    if (!confirm("Hapus OpenAI API key yang tersimpan?")) return;
    setSaving(true);
    try {
      await saveFn({ data: { provider, clearOpenaiKey: true, openaiModel } });
      toast.success("OpenAI API key dihapus");
      const s = await getFn();
      setSettings(s);
    } catch (e) {
      toast.error("Gagal: " + (e as Error).message);
    } finally {
      setSaving(false);
    }
  };

  const handleSaveBranding = async () => {
    setSavingBrand(true);
    try {
      await saveBrandFn({ data: { title, subtitle, short } });
      toast.success("Identitas aplikasi tersimpan");
      await refetchBranding();
      qc.invalidateQueries({ queryKey: ["branding"] });
    } catch (e) {
      toast.error("Gagal: " + (e as Error).message);
    } finally {
      setSavingBrand(false);
    }
  };

  const handleLogoUpload = async (file: File) => {
    if (!file.type.startsWith("image/")) {
      toast.error("File harus berupa gambar");
      return;
    }
    if (file.size > 2 * 1024 * 1024) {
      toast.error("Ukuran logo maksimal 2MB");
      return;
    }
    setUploadingLogo(true);
    try {
      const ext = file.name.split(".").pop() || "png";
      const path = `logo-${Date.now()}.${ext}`;
      const { error: upErr } = await supabase.storage.from("branding").upload(path, file, {
        upsert: true, contentType: file.type,
      });
      if (upErr) throw upErr;
      await saveBrandFn({ data: { logoPath: path } });
      toast.success("Logo berhasil diperbarui");
      await refetchBranding();
      qc.invalidateQueries({ queryKey: ["branding"] });
    } catch (e) {
      toast.error("Gagal upload logo: " + (e as Error).message);
    } finally {
      setUploadingLogo(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  };

  const handleClearLogo = async () => {
    if (!confirm("Hapus logo dan kembalikan ke default?")) return;
    setUploadingLogo(true);
    try {
      await saveBrandFn({ data: { clearLogo: true } });
      toast.success("Logo dikembalikan ke default");
      await refetchBranding();
      qc.invalidateQueries({ queryKey: ["branding"] });
    } catch (e) {
      toast.error("Gagal: " + (e as Error).message);
    } finally {
      setUploadingLogo(false);
    }
  };



  if (roleLoading) return <div className="p-8 text-xs font-mono-display text-muted-foreground">Loading…</div>;
  if (!isSuperAdmin) {
    return (
      <div>
        <PageHeader code="17" title="Pengaturan AI" subtitle="Konfigurasi provider & token AI" />
        <Panel title="Akses Ditolak">
          <div className="flex items-start gap-3 text-sm">
            <AlertTriangle className="w-5 h-5 text-destructive shrink-0 mt-0.5" />
            <p>Halaman ini hanya untuk <b>Super Admin</b>. Hubungi administrator sistem untuk mengubah konfigurasi AI.</p>
          </div>
        </Panel>
      </div>
    );
  }

  return (
    <div>
      <PageHeader code="17" title="Pengaturan Aplikasi" subtitle="Identitas aplikasi, logo, dan konfigurasi AI" />

      <Panel title="Identitas Aplikasi & Logo" className="mb-4">
        <div className="grid grid-cols-1 md:grid-cols-[auto_1fr] gap-6 items-start">
          <div className="space-y-3">
            <div className="w-32 h-32 rounded border border-border bg-background flex items-center justify-center overflow-hidden">
              {branding?.logoUrl ? (
                <img src={branding.logoUrl} alt="Logo" className="w-full h-full object-contain" />
              ) : (
                <ImageIcon className="w-10 h-10 text-muted-foreground" />
              )}
            </div>
            <input
              ref={fileInputRef}
              type="file"
              accept="image/png,image/jpeg,image/webp,image/svg+xml"
              className="hidden"
              onChange={(e) => {
                const f = e.target.files?.[0];
                if (f) handleLogoUpload(f);
              }}
            />
            <div className="flex flex-col gap-2 w-32">
              <Button type="button" size="sm" variant="secondary" disabled={uploadingLogo}
                onClick={() => fileInputRef.current?.click()} className="gap-2">
                <Upload className="w-3.5 h-3.5" /> {uploadingLogo ? "..." : "Ganti Logo"}
              </Button>
              {branding?.logoUrl && (
                <Button type="button" size="sm" variant="ghost" disabled={uploadingLogo}
                  onClick={handleClearLogo} className="gap-2 text-destructive">
                  <Trash2 className="w-3.5 h-3.5" /> Hapus
                </Button>
              )}
            </div>
            <p className="text-[10px] text-muted-foreground w-32">PNG/JPG/SVG, maks 2MB. Rasio 1:1 disarankan.</p>
          </div>

          <div className="space-y-3 max-w-lg">
            <div>
              <Label htmlFor="app-title" className="text-xs font-mono-display">JUDUL APLIKASI</Label>
              <Input id="app-title" value={title} onChange={(e) => setTitle(e.target.value)}
                placeholder="SAT BANTEK" maxLength={80} className="mt-1.5" />
            </div>
            <div>
              <Label htmlFor="app-subtitle" className="text-xs font-mono-display">SUBJUDUL / TAG</Label>
              <Input id="app-subtitle" value={subtitle} onChange={(e) => setSubtitle(e.target.value)}
                placeholder="[ TOC ]" maxLength={80} className="mt-1.5" />
            </div>
            <div>
              <Label htmlFor="app-short" className="text-xs font-mono-display">STATUS BAR SIDEBAR</Label>
              <Input id="app-short" value={short} onChange={(e) => setShort(e.target.value)}
                placeholder="SYS_ONLINE · 34_SUBDEN" maxLength={120} className="mt-1.5" />
            </div>
            <Button onClick={handleSaveBranding} disabled={savingBrand} className="gap-2">
              <Save className="w-4 h-4" /> {savingBrand ? "Menyimpan…" : "Simpan Identitas"}
            </Button>
          </div>
        </div>
      </Panel>



      <Panel title="Status Provider" className="mb-4">
        {loading ? (
          <div className="text-xs font-mono-display text-muted-foreground">Memuat…</div>
        ) : settings ? (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3 text-xs">
            <div>
              <div className="text-[10px] font-mono-display text-muted-foreground">PROVIDER AKTIF</div>
              <div className="mt-1 font-mono uppercase">{settings.provider}</div>
            </div>
            <div>
              <div className="text-[10px] font-mono-display text-muted-foreground">OPENAI KEY</div>
              <div className="mt-1">
                {settings.hasOpenaiKey
                  ? <Badge variant="green">TERSEDIA · {settings.openaiKeySource === "database" ? "DATABASE" : "ENV"}</Badge>
                  : <Badge variant="red">TIDAK ADA</Badge>}
              </div>
              {settings.openaiKeyMasked && <div className="mt-1 font-mono text-[10px] text-muted-foreground">{settings.openaiKeyMasked}</div>}
            </div>
            <div>
              <div className="text-[10px] font-mono-display text-muted-foreground">LOVABLE AI</div>
              <div className="mt-1">
                {settings.hasLovableKey ? <Badge variant="green">AKTIF</Badge> : <Badge>NONAKTIF</Badge>}
              </div>
            </div>
          </div>
        ) : null}
      </Panel>

      <Panel title="Konfigurasi Provider & Token">
        <div className="space-y-4 max-w-2xl">
          <div>
            <Label className="text-xs font-mono-display">PROVIDER AI</Label>
            <div className="mt-2 grid grid-cols-3 gap-2">
              {(["auto", "openai", "lovable"] as const).map((p) => (
                <button key={p} type="button" onClick={() => setProvider(p)}
                  className={`px-3 py-2 text-xs rounded border font-mono-display uppercase transition ${
                    provider === p
                      ? "bg-primary/15 border-primary text-primary"
                      : "border-border text-muted-foreground hover:border-primary/40"
                  }`}>
                  {p}
                </button>
              ))}
            </div>
            <p className="mt-2 text-[11px] text-muted-foreground">
              <b>auto</b>: pakai OpenAI kalau key tersedia, fallback ke Lovable AI. <b>openai</b>: paksa pakai OpenAI. <b>lovable</b>: paksa Lovable AI Gateway.
            </p>
          </div>

          <div>
            <Label htmlFor="openai-key" className="text-xs font-mono-display flex items-center gap-2">
              <Key className="w-3.5 h-3.5" /> OPENAI API KEY
            </Label>
            <Input
              id="openai-key"
              type="password"
              placeholder={settings?.hasOpenaiKey ? "•••• (sudah tersimpan, isi untuk mengganti)" : "sk-proj-..."}
              value={openaiApiKey}
              onChange={(e) => setOpenaiApiKey(e.target.value)}
              className="mt-2 font-mono text-xs"
            />
            <p className="mt-1 text-[11px] text-muted-foreground">
              Token disimpan aman di database (RLS super_admin only). Dipakai untuk analisa AI, chat assistant, laporan otomatis, dan narasi PDF.
            </p>
          </div>

          <div>
            <Label htmlFor="openai-model" className="text-xs font-mono-display">MODEL OPENAI</Label>
            <Input
              id="openai-model"
              value={openaiModel}
              onChange={(e) => setOpenaiModel(e.target.value)}
              placeholder="gpt-4o-mini"
              className="mt-2 font-mono text-xs"
            />
            <p className="mt-1 text-[11px] text-muted-foreground">Contoh: <code>gpt-4o-mini</code>, <code>gpt-4o</code>, <code>gpt-4.1-mini</code>.</p>
          </div>

          <div className="flex gap-2 pt-2">
            <Button onClick={handleSave} disabled={saving} className="gap-2">
              <Save className="w-4 h-4" /> {saving ? "Menyimpan…" : "Simpan Pengaturan"}
            </Button>
            {settings?.hasOpenaiKey && settings.openaiKeySource === "database" && (
              <Button variant="destructive" onClick={handleClearKey} disabled={saving} className="gap-2">
                <Trash2 className="w-4 h-4" /> Hapus Key
              </Button>
            )}
          </div>
        </div>
      </Panel>
    </div>
  );
}
