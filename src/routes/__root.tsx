import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import {
  Outlet,
  Link,
  createRootRouteWithContext,
  useRouter,
  HeadContent,
  Scripts,
} from "@tanstack/react-router";
import { useEffect, type ReactNode } from "react";

import appCss from "../styles.css?url";
import { reportLovableError } from "../lib/lovable-error-reporting";
import { AuthProvider } from "@/hooks/useAuth";
import { Toaster } from "@/components/ui/sonner";

function NotFoundComponent() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4">
      <div className="max-w-md text-center panel scanline p-8">
        <div className="font-mono-display text-xs text-primary tracking-widest">[ ERR_404 ]</div>
        <h1 className="mt-2 text-6xl font-bold font-mono-display text-glow-cyan">404</h1>
        <h2 className="mt-4 text-xl font-semibold">Sektor Tidak Ditemukan</h2>
        <p className="mt-2 text-sm text-muted-foreground">Halaman tidak ada dalam jaringan TOC.</p>
        <Link to="/" className="mt-6 inline-flex items-center justify-center rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:opacity-90">
          Kembali ke Command Center
        </Link>
      </div>
    </div>
  );
}

function ErrorComponent({ error, reset }: { error: Error; reset: () => void }) {
  console.error(error);
  const router = useRouter();
  useEffect(() => { reportLovableError(error, { boundary: "tanstack_root_error_component" }); }, [error]);
  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4">
      <div className="max-w-md text-center panel p-8">
        <div className="font-mono-display text-xs text-destructive tracking-widest">[ SYSTEM_ERROR ]</div>
        <h1 className="mt-2 text-xl font-semibold">Modul gagal dimuat</h1>
        <p className="mt-2 text-sm text-muted-foreground">Terjadi kesalahan di sisi sistem.</p>
        <div className="mt-6 flex flex-wrap justify-center gap-2">
          <button onClick={() => { router.invalidate(); reset(); }} className="rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground">Coba Lagi</button>
          <a href="/" className="rounded-md border border-input bg-background px-4 py-2 text-sm font-medium">Home</a>
        </div>
      </div>
    </div>
  );
}

export const Route = createRootRouteWithContext<{ queryClient: QueryClient }>()({
  head: () => ({
    meta: [
      { charSet: "utf-8" },
      { name: "viewport", content: "width=device-width, initial-scale=1" },
      { title: "TOC SAT BANTEK — Data Analyst Command Center" },
      { name: "description", content: "Aplikasi analisis data dan intelijen berbasis AI untuk TOC Sat Bantek Polri" },
      { property: "og:title", content: "TOC SAT BANTEK — Data Analyst Command Center" },
      { name: "twitter:title", content: "TOC SAT BANTEK — Data Analyst Command Center" },
      { property: "og:description", content: "Aplikasi analisis data dan intelijen berbasis AI untuk TOC Sat Bantek Polri" },
      { name: "twitter:description", content: "Aplikasi analisis data dan intelijen berbasis AI untuk TOC Sat Bantek Polri" },
      { property: "og:image", content: "https://pub-bb2e103a32db4e198524a2e9ed8f35b4.r2.dev/746b876c-fc0b-4b28-9aa3-7abb702eabd7/id-preview-fe8a0197--650d1fe3-3421-4c83-9fff-1da5cbd25eee.lovable.app-1780899226742.png" },
      { name: "twitter:image", content: "https://pub-bb2e103a32db4e198524a2e9ed8f35b4.r2.dev/746b876c-fc0b-4b28-9aa3-7abb702eabd7/id-preview-fe8a0197--650d1fe3-3421-4c83-9fff-1da5cbd25eee.lovable.app-1780899226742.png" },
      { name: "twitter:card", content: "summary_large_image" },
      { property: "og:type", content: "website" },
    ],
    links: [
      { rel: "stylesheet", href: appCss },
      { rel: "preconnect", href: "https://fonts.googleapis.com" },
      { rel: "preconnect", href: "https://fonts.gstatic.com", crossOrigin: "" },
      { rel: "stylesheet", href: "https://fonts.googleapis.com/css2?family=JetBrains+Mono:wght@400;500;600;700&family=Inter:wght@400;500;600;700&display=swap" },
    ],
  }),
  shellComponent: RootShell,
  component: RootComponent,
  notFoundComponent: NotFoundComponent,
  errorComponent: ErrorComponent,
});

function RootShell({ children }: { children: ReactNode }) {
  return (
    <html lang="id" className="dark">
      <head><HeadContent /></head>
      <body>{children}<Scripts /></body>
    </html>
  );
}

function RootComponent() {
  const { queryClient } = Route.useRouteContext();
  return (
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <Outlet />
        <Toaster />
      </AuthProvider>
    </QueryClientProvider>
  );
}
