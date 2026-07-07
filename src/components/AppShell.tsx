import { useState, type ReactNode } from "react";
import { BottomNav } from "./BottomNav";
import { useAuth } from "@/lib/auth";
import { AuthScreen } from "./AuthScreen";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { SplashScreen } from "./SplashScreen";
import { NotificationsBell } from "./NotificationsBell";
import { SorteoReplayListener } from "./SorteoReplayListener";
import { PwaInstallPrompt } from "./PwaInstallPrompt";
import { BirthdayAlerts } from "./BirthdayAlerts";
import { supabase } from "@/lib/supabase";
import { toast } from "sonner";

export function AppShell({ children }: { children: ReactNode }) {
  const { session, profile, loading } = useAuth();
  if (loading) return <SplashScreen />;
  if (!session) return <AuthScreen />;
  if (!profile) return <ProfileRecoveryGate />;
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
      <BirthdayAlerts />
      <PwaInstallPrompt />
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

function ProfileRecoveryGate() {
  const { user, refreshProfile, signOut } = useAuth();
  const fallbackName =
    typeof user?.user_metadata.full_name === "string" && user.user_metadata.full_name.trim()
      ? user.user_metadata.full_name.trim()
      : (user?.email ?? "");
  const fallbackNickname =
    typeof user?.user_metadata.nickname === "string" && user.user_metadata.nickname.trim()
      ? user.user_metadata.nickname.trim()
      : fallbackName.split("@")[0];
  const [fullName, setFullName] = useState(fallbackName);
  const [nickname, setNickname] = useState(fallbackNickname);
  const [busy, setBusy] = useState(false);

  const recover = async () => {
    if (!user) return;
    setBusy(true);
    try {
      const cleanName = fullName.trim() || user.email || "Fraterno";
      const cleanNickname = nickname.trim() || cleanName.split("@")[0];

      await supabase.auth.updateUser({
        data: { full_name: cleanName, nickname: cleanNickname },
      });

      const { error } = await supabase.from("profiles").upsert(
        {
          id: user.id,
          full_name: cleanName,
          nickname: cleanNickname,
          avatar_url:
            typeof user.user_metadata.avatar_url === "string" ? user.user_metadata.avatar_url : null,
        },
        { onConflict: "id" },
      );

      if (error) {
        console.warn("Supabase no permitió guardar la ficha, se usará recuperación local", error);
      }

      await refreshProfile();
      toast.success("Ficha recuperada. Ya puedes entrar.");
    } catch (err: any) {
      toast.error(err.message ?? "No se pudo recuperar la ficha");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="chutu-stage flex min-h-dvh items-center justify-center px-6 py-8 text-neutral-100">
      <div className="chutu-panel w-full max-w-sm rounded-[1.75rem] p-6">
        <img
          src="/logo.png"
          alt="Logo de Fraternidad Chuturubises Jrs."
          className="mx-auto h-28 w-28 rounded-[1.6rem] border border-yellow-300/40 object-cover shadow-[0_0_45px_rgba(255,196,0,0.22)]"
        />
        <div className="mt-6 text-center">
          <p className="chutu-eyebrow">Ficha no encontrada</p>
          <h1 className="chutu-display mt-2 text-4xl text-yellow-400">Recuperar perfil</h1>
          <p className="mt-3 text-sm leading-relaxed text-neutral-300">
            Tu correo ya existe. Completa estos datos una sola vez para reconstruir tu ficha de fraterno.
          </p>
        </div>

        <div className="mt-5 space-y-3">
          <div className="space-y-1.5">
            <Label className="text-yellow-300">Nombre completo</Label>
            <Input
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
              className="chutu-input"
            />
          </div>
          <div className="space-y-1.5">
            <Label className="text-yellow-300">Apodo</Label>
            <Input
              value={nickname}
              onChange={(e) => setNickname(e.target.value)}
              className="chutu-input"
            />
          </div>
        </div>

        <Button
          onClick={recover}
          disabled={busy}
          className="chutu-primary mt-5 h-11 w-full rounded-xl font-black uppercase tracking-wider"
        >
          {busy ? "Recuperando..." : "Recuperar y entrar"}
        </Button>
        <Button
          onClick={signOut}
          variant="outline"
          className="chutu-outline mt-2 h-11 w-full rounded-xl font-black uppercase tracking-wider"
        >
          Salir
        </Button>
      </div>
    </div>
  );
}
