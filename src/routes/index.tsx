import { createFileRoute, Navigate } from "@tanstack/react-router";
import { useAuth } from "@/hooks/useAuth";

export const Route = createFileRoute("/")({
  component: Index,
});

function Index() {
  const { user, loading } = useAuth();
  if (loading) return <div className="flex min-h-screen items-center justify-center"><div className="font-mono-display text-primary text-glow-cyan">[ INIT_SYSTEM ]</div></div>;
  if (!user) return <Navigate to="/auth" />;
  return <Navigate to="/dashboard" />;
}
