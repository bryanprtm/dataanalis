import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { getBranding } from "@/lib/branding.functions";
import { useAuth } from "./useAuth";

export function useBranding() {
  const { user } = useAuth();
  const fn = useServerFn(getBranding);
  return useQuery({
    queryKey: ["branding", user?.id],
    enabled: !!user,
    staleTime: 5 * 60 * 1000,
    queryFn: async () => fn(),
  });
}
