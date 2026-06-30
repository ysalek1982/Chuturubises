import type { ReactNode } from "react";
import { BottomNav } from "./BottomNav";
import { useAuth } from "@/lib/auth";
import { AuthScreen } from "./AuthScreen";
import { Button } from "@/components/ui/button";
import { SplashScreen } from "./SplashScreen";
import { NotificationsBell } from "./NotificationsBell";
import { SorteoReplayListener } from "./SorteoReplayListener";

export function AppShell({ children }: { children: ReactNode }) {
  const { session, profile, loading } = useAuth();
  if (loading) return <SplashScreen />;
  if (!session) return <AuthScreen />;
  if (!profile) return <MissingProfileGate />;
  return (
    <div className="chutu-stage min-h-dvh text-neutral-100 antialiased">
      <a
        href="#main"
        className="sr-only focus:not-sr-only focus:fixed focus:left-3 focus:top-3 focus:z-[100] focus:rounded-md focus:bg-yellow-400 focus:px-3 focus:py-2 focus:text-sm focus:font-bold focus:text-black"
      >
        Saltar al contenido
      </a>
      <NotificationsBell />
      <SorteoReplayListener />
      <main
        id="main"
        className="mx-auto min-h-dvh max-w-md pb-[calc(6.25rem+env(safe-area-inset-bottom))] shadow-[0_0_90px_rgba(0,0,0,0.45)] sm:max-w-lg"
      >
        {children}
      </main>
      <BottomNav />
    </div>
  );
}

function MissingProfileGate() {
  const { signOut } = useAuth();

  return (
    <div className="chutu-stage flex min-h-dvh items-center justify-center px-6 text-neutral-100">
      <div className="chutu-panel w-full max-w-sm rounded-[1.75rem] p-6 text-center">
        <img
          src="/logo.png"
          alt="Logo de Fraternidad Chuturubises Jrs."
          className="mx-auto h-28 w-28 rounded-[1.6rem] border border-yellow-300/40 object-cover shadow-[0_0_45px_rgba(255,196,0,0.22)]"
        />
        <p className="chutu-eyebrow mt-6">Ficha no encontrada</p>
        <h1 className="chutu-display mt-2 text-4xl text-yellow-400">Perfil incompleto</h1>
        <p className="mt-3 text-sm leading-relaxed text-neutral-300">
          No encontramos tu ficha de fraterno. Cierra sesión y vuelve a registrarte para crearla automáticamente.
        </p>
        <Button
          onClick={signOut}
          className="chutu-primary mt-6 h-11 w-full rounded-xl font-black uppercase tracking-wider"
        >
          Salir
        </Button>
      </div>
    </div>
  );
}
