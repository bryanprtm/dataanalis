import { createFileRoute, Outlet, Navigate } from "@tanstack/react-router";
import { useAuth } from "@/hooks/useAuth";
import { AppShell } from "@/components/AppShell";

export const Route = createFileRoute("/_app")({
  component: AppLayout,
});

function AppLayout() {
  const { user, loading } = useAuth();
  if (loading) return <div className="flex min-h-screen items-center justify-center"><div className="font-mono-display text-primary text-glow-cyan animate-pulse">[ CONNECTING_TO_TOC... ]</div></div>;
  if (!user) return <Navigate to="/auth" />;
  return <AppShell><Outlet /></AppShell>;
}
