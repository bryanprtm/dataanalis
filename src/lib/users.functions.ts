import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { z } from "zod";

const ROLE = z.enum(["super_admin", "admin_sat", "admin_subden", "operator", "viewer"]);

async function assertSuperAdmin(supabase: any, userId: string) {
  const { data } = await supabase.from("user_roles").select("role").eq("user_id", userId);
  const roles = (data ?? []).map((r: any) => r.role);
  if (!roles.includes("super_admin")) throw new Error("Akses ditolak: hanya super admin");
}

const CreateInput = z.object({
  email: z.string().email(),
  password: z.string().min(8).max(72),
  nama: z.string().min(1).max(120),
  pangkat: z.string().max(60).optional().nullable(),
  nrp: z.string().max(40).optional().nullable(),
  subden: z.string().max(60).optional().nullable(),
  polda: z.string().max(60).optional().nullable(),
  role: ROLE,
});

export const createUser = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => CreateInput.parse(d))
  .handler(async ({ data, context }) => {
    await assertSuperAdmin(context.supabase, context.userId);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    const { data: created, error } = await supabaseAdmin.auth.admin.createUser({
      email: data.email,
      password: data.password,
      email_confirm: true,
      user_metadata: {
        nama: data.nama,
        pangkat: data.pangkat ?? null,
        nrp: data.nrp ?? null,
        subden: data.subden ?? null,
        polda: data.polda ?? null,
        satuan: "Sat Bantek",
      },
    });
    if (error || !created.user) throw new Error(error?.message ?? "Gagal membuat user");

    // Override default operator role if needed
    if (data.role !== "operator") {
      await supabaseAdmin.from("user_roles").delete().eq("user_id", created.user.id);
      await supabaseAdmin.from("user_roles").insert({ user_id: created.user.id, role: data.role });
    }
    return { id: created.user.id };
  });

const UpdateInput = z.object({
  id: z.string().uuid(),
  nama: z.string().min(1).max(120),
  pangkat: z.string().max(60).optional().nullable(),
  nrp: z.string().max(40).optional().nullable(),
  subden: z.string().max(60).optional().nullable(),
  polda: z.string().max(60).optional().nullable(),
  role: ROLE,
});

export const updateUser = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => UpdateInput.parse(d))
  .handler(async ({ data, context }) => {
    await assertSuperAdmin(context.supabase, context.userId);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    const { error: pErr } = await supabaseAdmin
      .from("profiles")
      .update({
        nama: data.nama,
        pangkat: data.pangkat ?? null,
        nrp: data.nrp ?? null,
        subden: data.subden ?? null,
        polda: data.polda ?? null,
      })
      .eq("id", data.id);
    if (pErr) throw new Error(pErr.message);

    await supabaseAdmin.from("user_roles").delete().eq("user_id", data.id);
    const { error: rErr } = await supabaseAdmin
      .from("user_roles")
      .insert({ user_id: data.id, role: data.role });
    if (rErr) throw new Error(rErr.message);
    return { ok: true };
  });

const DeleteInput = z.object({ id: z.string().uuid() });

export const deleteUser = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => DeleteInput.parse(d))
  .handler(async ({ data, context }) => {
    await assertSuperAdmin(context.supabase, context.userId);
    if (data.id === context.userId) throw new Error("Tidak bisa menghapus akun sendiri");
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { error } = await supabaseAdmin.auth.admin.deleteUser(data.id);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

const ListItem = z.object({
  id: z.string(),
  nama: z.string().nullable(),
  pangkat: z.string().nullable(),
  nrp: z.string().nullable(),
  subden: z.string().nullable(),
  polda: z.string().nullable(),
  role: ROLE.nullable(),
  created_at: z.string().nullable(),
});

export const listUsers = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    await assertSuperAdmin(context.supabase, context.userId);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: profiles, error } = await supabaseAdmin
      .from("profiles")
      .select("*")
      .order("created_at", { ascending: false });
    if (error) throw new Error(error.message);
    const { data: roles } = await supabaseAdmin.from("user_roles").select("user_id, role");
    const roleMap = new Map<string, string>();
    (roles ?? []).forEach((r: any) => roleMap.set(r.user_id, r.role));
    return (profiles ?? []).map((p: any) =>
      ListItem.parse({
        id: p.id,
        nama: p.nama,
        pangkat: p.pangkat,
        nrp: p.nrp,
        subden: p.subden,
        polda: p.polda,
        role: (roleMap.get(p.id) as any) ?? null,
        created_at: p.created_at,
      }),
    );
  });
