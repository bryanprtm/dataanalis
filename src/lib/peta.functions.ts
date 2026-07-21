import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

/**
 * Aggregate laporan untuk peta operasional.
 * Hanya mengembalikan { polda, urgensi } — tanpa judul/isi/PII.
 * Semua authenticated user (termasuk operator) bisa memanggil,
 * sehingga dapat melihat jumlah & tingkat kerawanan dari laporan
 * operator lain tanpa membuka detail.
 */
export const getPetaAggregate = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async () => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data, error } = await supabaseAdmin
      .from("laporan")
      .select("polda,urgensi,created_at")
      .order("created_at", { ascending: false })
      .limit(2000);
    if (error) throw error;
    return (data ?? []) as { polda: string | null; urgensi: string; created_at: string }[];
  });
