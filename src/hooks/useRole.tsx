import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "./useAuth";

export type AppRole = "super_admin" | "admin_sat" | "admin_subden" | "operator" | "viewer";

export function useRole() {
  const { user } = useAuth();
  const { data: role, isLoading } = useQuery({
    queryKey: ["my-role", user?.id],
    enabled: !!user,
    queryFn: async (): Promise<AppRole | null> => {
      const { data } = await supabase
        .from("user_roles")
        .select("role")
        .eq("user_id", user!.id)
        .order("role")
        .limit(1)
        .maybeSingle();
      return (data?.role as AppRole) ?? null;
    },
  });

  const isAdmin = role === "super_admin" || role === "admin_sat" || role === "admin_subden";
  const isSuperAdmin = role === "super_admin";
  return { role: role ?? null, isAdmin, isSuperAdmin, loading: isLoading };
}
