import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { z } from "zod";

const BRAND_KEYS = ["app_title", "app_subtitle", "app_short", "app_logo_path"] as const;

export type Branding = {
  title: string;
  subtitle: string;
  short: string;
  logoUrl: string | null;
  logoPath: string | null;
};

const DEFAULTS = {
  title: "SAT BANTEK",
  subtitle: "[ TOC ]",
  short: "SYS_ONLINE · 34_SUBDEN",
};

async function loadBrandingRaw() {
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  const { data } = await supabaseAdmin
    .from("app_settings")
    .select("key,value")
    .in("key", BRAND_KEYS as unknown as string[]);
  const m = new Map((data ?? []).map((r) => [r.key, r.value ?? ""]));
  return {
    title: m.get("app_title") || DEFAULTS.title,
    subtitle: m.get("app_subtitle") || DEFAULTS.subtitle,
    short: m.get("app_short") || DEFAULTS.short,
    logoPath: m.get("app_logo_path") || null,
  };
}

export const getBranding = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async (): Promise<Branding> => {
    const raw = await loadBrandingRaw();
    let logoUrl: string | null = null;
    if (raw.logoPath) {
      const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
      const { data } = await supabaseAdmin.storage.from("branding").createSignedUrl(raw.logoPath, 60 * 60 * 6);
      logoUrl = data?.signedUrl ?? null;
    }
    return { ...raw, logoUrl };
  });

const SaveInput = z.object({
  title: z.string().min(1).max(80).optional(),
  subtitle: z.string().max(80).optional(),
  short: z.string().max(120).optional(),
  logoPath: z.string().optional(),
  clearLogo: z.boolean().optional(),
});

export const saveBranding = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => SaveInput.parse(d))
  .handler(async ({ data, context }) => {
    const { data: isSuper } = await context.supabase.rpc("has_role", {
      _user_id: context.userId, _role: "super_admin",
    });
    if (!isSuper) throw new Error("Forbidden: hanya super_admin");

    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const now = new Date().toISOString();
    const rows: { key: string; value: string | null; updated_by: string; updated_at: string }[] = [];
    const push = (key: string, value: string | null) =>
      rows.push({ key, value, updated_by: context.userId, updated_at: now });

    if (data.title !== undefined) push("app_title", data.title);
    if (data.subtitle !== undefined) push("app_subtitle", data.subtitle);
    if (data.short !== undefined) push("app_short", data.short);
    if (data.clearLogo) {
      // hapus file lama juga
      const prev = await loadBrandingRaw();
      if (prev.logoPath) {
        await supabaseAdmin.storage.from("branding").remove([prev.logoPath]).catch(() => {});
      }
      push("app_logo_path", null);
    } else if (data.logoPath) {
      const prev = await loadBrandingRaw();
      if (prev.logoPath && prev.logoPath !== data.logoPath) {
        await supabaseAdmin.storage.from("branding").remove([prev.logoPath]).catch(() => {});
      }
      push("app_logo_path", data.logoPath);
    }

    if (rows.length === 0) return { ok: true };
    const { error } = await supabaseAdmin.from("app_settings").upsert(rows, { onConflict: "key" });
    if (error) throw new Error(error.message);
    return { ok: true };
  });
