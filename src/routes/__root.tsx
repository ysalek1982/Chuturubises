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
import { Toaster } from "sonner";
import { AuthProvider } from "@/lib/auth";

import appCss from "../styles.css?url";
import { reportLovableError } from "../lib/lovable-error-reporting";

function NotFoundComponent() {
  return (
    <div className="chutu-stage flex min-h-dvh items-center justify-center px-5 text-white">
      <div className="chutu-carnival-card w-full max-w-sm rounded-[1.65rem] p-6 text-center">
        <img
          src="/logo-256.webp"
          alt=""
          className="mx-auto h-20 w-20 rounded-2xl border border-[#FFD60A]/40 object-cover"
        />
        <p className="chutu-eyebrow mt-5 text-[#00E0FF]">Ruta fuera del enjambre</p>
        <h1 className="chutu-display mt-2 text-7xl leading-none text-[#FFD60A]">404</h1>
        <h2 className="mt-2 text-lg font-black text-white">Esta página no existe</h2>
        <p className="mt-2 text-sm text-white/55">El enlace cambió o ya no está disponible.</p>
        <div className="mt-6">
          <Link
            to="/"
            className="chutu-primary inline-flex min-h-11 items-center justify-center rounded-xl px-5 text-sm font-black uppercase tracking-wider"
          >
            Volver al muro
          </Link>
        </div>
      </div>
    </div>
  );
}

function ErrorComponent({ error, reset }: { error: Error; reset: () => void }) {
  console.error(error);
  const router = useRouter();
  useEffect(() => {
    reportLovableError(error, { boundary: "tanstack_root_error_component" });
  }, [error]);

  return (
    <div className="chutu-stage flex min-h-dvh items-center justify-center px-5 text-white">
      <div className="chutu-carnival-card w-full max-w-sm rounded-[1.65rem] p-6 text-center">
        <img
          src="/logo-256.webp"
          alt=""
          className="mx-auto h-20 w-20 rounded-2xl border border-[#FFD60A]/40 object-cover"
        />
        <p className="chutu-eyebrow mt-5 text-[#FF8AC2]">Pausa técnica</p>
        <h1 className="chutu-display mt-2 text-4xl leading-none text-[#FFD60A]">
          No pudimos cargar
        </h1>
        <p className="mt-3 text-sm text-white/55">
          Reintenta la conexión o vuelve al muro principal.
        </p>
        <div className="mt-6 flex flex-wrap justify-center gap-2">
          <button
            onClick={() => {
              router.invalidate();
              reset();
            }}
            className="chutu-primary inline-flex min-h-11 items-center justify-center rounded-xl px-4 text-xs font-black uppercase tracking-wider"
          >
            Reintentar
          </button>
          <a
            href="/"
            className="chutu-outline inline-flex min-h-11 items-center justify-center rounded-xl px-4 text-xs font-black uppercase tracking-wider"
          >
            Ir al muro
          </a>
        </div>
      </div>
    </div>
  );
}

export const Route = createRootRouteWithContext<{ queryClient: QueryClient }>()({
  head: () => ({
    meta: [
      { charSet: "utf-8" },
      { name: "viewport", content: "width=device-width, initial-scale=1, viewport-fit=cover" },
      { name: "theme-color", content: "#070708" },
      { title: "Fraternidad Chuturubises Jrs." },
      { name: "description", content: "App oficial de la Fraternidad Chuturubises Jrs." },
      { name: "application-name", content: "Chuturubises" },
      { name: "mobile-web-app-capable", content: "yes" },
      { name: "apple-mobile-web-app-capable", content: "yes" },
      { name: "apple-mobile-web-app-status-bar-style", content: "black-translucent" },
      { name: "apple-mobile-web-app-title", content: "Chuturubises" },
      { property: "og:title", content: "Fraternidad Chuturubises Jrs." },
      { property: "og:description", content: "El enjambre amarillo y negro." },
      { property: "og:type", content: "website" },
    ],
    links: [
      { rel: "stylesheet", href: appCss },
      { rel: "manifest", href: "/manifest.webmanifest" },
      { rel: "preload", href: "/logo-256.webp", as: "image", type: "image/webp" },
      {
        rel: "preload",
        href: "/fonts/bangers-latin.woff2",
        as: "font",
        type: "font/woff2",
        crossOrigin: "anonymous",
      },
      {
        rel: "preload",
        href: "/fonts/outfit-latin.woff2",
        as: "font",
        type: "font/woff2",
        crossOrigin: "anonymous",
      },
      { rel: "apple-touch-icon", href: "/icon-512.png" },
      { rel: "icon", href: "/icon-512.png", type: "image/png" },
    ],
  }),
  shellComponent: RootShell,
  component: RootComponent,
  notFoundComponent: NotFoundComponent,
  errorComponent: ErrorComponent,
});

function RootShell({ children }: { children: ReactNode }) {
  return (
    <html lang="es">
      <head>
        <HeadContent />
      </head>
      <body>
        <div
          id="app-boot-splash"
          aria-hidden="true"
          style={{
            position: "fixed",
            inset: 0,
            zIndex: 9999,
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            justifyContent: "center",
            gap: "14px",
            background:
              "linear-gradient(135deg, rgba(20,165,56,.16), transparent 38%), linear-gradient(315deg, rgba(255,46,147,.12), transparent 42%), #050506",
            color: "#ffd60a",
            fontFamily: "system-ui, sans-serif",
          }}
        >
          <img
            src="/logo-256.webp"
            alt=""
            width="148"
            height="148"
            style={{
              width: "148px",
              height: "148px",
              borderRadius: "30px",
              border: "1px solid rgba(255,214,10,.45)",
              boxShadow: "0 0 52px rgba(255,214,10,.26)",
            }}
          />
          <strong style={{ fontSize: "13px", letterSpacing: "0.24em" }}>CHUTURUBISES JRS.</strong>
          <span style={{ color: "rgba(255,255,255,.55)", fontSize: "11px" }}>
            Preparando el enjambre
          </span>
        </div>
        {children}
        <Scripts />
      </body>
    </html>
  );
}

function RootComponent() {
  const { queryClient } = Route.useRouteContext();

  useEffect(() => {
    document.getElementById("app-boot-splash")?.setAttribute("hidden", "");
    if ("serviceWorker" in navigator) {
      navigator.serviceWorker.register("/sw.js").catch((error) => {
        console.warn("No se pudo registrar el service worker", error);
      });
    }
  }, []);

  return (
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <Outlet />
        <Toaster theme="dark" position="top-center" richColors />
      </AuthProvider>
    </QueryClientProvider>
  );
}
