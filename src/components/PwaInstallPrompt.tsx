import { useEffect, useState } from "react";
import {
  BellRing,
  CheckCircle2,
  Download,
  Home,
  PlusSquare,
  Share2,
  Smartphone,
  X,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/lib/auth";
import { getNotificationPermission, registerPushDevice } from "@/lib/push-notifications";
import { getPwaPlatform, usePwaInstall } from "@/lib/usePwaInstall";
import { toast } from "sonner";

const DISMISSED_UNTIL_KEY = "chuturubises-pwa-install-dismissed-until";
const ONE_DAY = 24 * 60 * 60 * 1000;

function isStandalone() {
  return (
    window.matchMedia("(display-mode: standalone)").matches ||
    (window.navigator as Navigator & { standalone?: boolean }).standalone === true
  );
}

function dismissedStillValid() {
  if (typeof window === "undefined") return true;
  const dismissedUntil = Number(localStorage.getItem(DISMISSED_UNTIL_KEY) ?? 0);
  return dismissedUntil > Date.now();
}

export function PwaInstallPrompt() {
  const { canInstall, installed, promptInstall } = usePwaInstall();
  const { user } = useAuth();
  const [dismissed, setDismissed] = useState(() => dismissedStillValid());
  const [ready, setReady] = useState(false);
  const [pushState, setPushState] = useState(() => getNotificationPermission());
  const [pushBusy, setPushBusy] = useState(false);
  const platform = getPwaPlatform();
  const ios = platform === "ios";

  useEffect(() => {
    const timer = window.setTimeout(() => setReady(true), 1400);
    return () => window.clearTimeout(timer);
  }, []);

  if (!ready || dismissed || installed || isStandalone()) return null;
  if (!canInstall && !ios) return null;

  const dismiss = (days = 7) => {
    localStorage.setItem(DISMISSED_UNTIL_KEY, String(Date.now() + days * ONE_DAY));
    setDismissed(true);
  };

  const install = async () => {
    const result = await promptInstall();
    if (result === "accepted") {
      dismiss(365);
      toast.success("App instalada. Ya puedes abrirla desde tu pantalla.");
      return;
    }
    if (result === "dismissed") {
      dismiss(3);
      return;
    }
    toast.message("Usa el menu del navegador y elige Agregar a pantalla de inicio.");
  };

  const enablePush = async () => {
    if (!user) return;
    setPushBusy(true);
    const result = await registerPushDevice(user.id);
    setPushState(getNotificationPermission());
    setPushBusy(false);

    if (result === "denied") return toast.error("El telefono tiene bloqueadas las notificaciones.");
    if (result === "unsupported") return toast.error("Este navegador no permite notificaciones.");
    if (result === "missing-key" || result === "save-failed" || result === "local-only") {
      return toast.success("Avisos activos mientras uses la app.");
    }
    toast.success("Push activado en este telefono.");
  };

  return (
    <div className="fixed inset-x-0 bottom-[calc(5.5rem+env(safe-area-inset-bottom))] z-[80] mx-auto max-w-md px-4 sm:max-w-lg">
      <div className="chutu-panel relative overflow-hidden rounded-[1.35rem] border-[#FFD60A]/35 p-0 shadow-[0_24px_80px_rgba(0,0,0,0.55)]">
        <div className="absolute inset-x-0 top-0 h-1 bg-gradient-to-r from-[#FF2E93] via-[#FFD60A] to-[#00E0FF]" />
        <div className="flex gap-3 p-4">
          <div className="grid h-12 w-12 shrink-0 place-items-center rounded-2xl bg-[#FFD60A] text-black shadow-[0_0_26px_rgba(255,214,10,0.28)]">
            <Smartphone className="h-5 w-5" />
          </div>
          <div className="min-w-0 flex-1">
            <div className="flex items-start justify-between gap-2">
              <div>
                <p className="chutu-eyebrow text-[#00E0FF]">App Chuturubises</p>
                <h2 className="mt-1 text-base font-black text-white">
                  Tenela como app en tu telefono
                </h2>
              </div>
              <button
                type="button"
                onClick={() => dismiss()}
                className="grid h-8 w-8 shrink-0 place-items-center rounded-full border border-white/10 text-white/60 transition hover:bg-white/10 hover:text-white"
                aria-label="Cerrar invitacion de instalacion"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            {ios ? (
              <div className="mt-3 grid gap-2 text-xs font-bold text-neutral-300">
                <p className="flex items-center gap-2 rounded-xl border border-white/10 bg-white/[0.035] px-3 py-2">
                  <Share2 className="h-4 w-4 text-[#00E0FF]" /> Toca Compartir en Safari.
                </p>
                <p className="flex items-center gap-2 rounded-xl border border-white/10 bg-white/[0.035] px-3 py-2">
                  <PlusSquare className="h-4 w-4 text-[#FFD60A]" /> Luego Agregar a pantalla de
                  inicio.
                </p>
              </div>
            ) : (
              <Button
                onClick={install}
                className="chutu-primary mt-3 h-10 w-full rounded-xl text-xs font-black uppercase tracking-widest"
              >
                <Download className="h-4 w-4" /> Instalar ahora
              </Button>
            )}

            <div className="mt-3 grid grid-cols-2 gap-2">
              <div className="rounded-xl border border-[#FFD60A]/20 bg-[#FFD60A]/8 px-3 py-2">
                <p className="flex items-center gap-1.5 text-[10px] font-black uppercase tracking-widest text-[#FFD60A]">
                  <Home className="h-3.5 w-3.5" /> Inicio
                </p>
                <p className="mt-1 text-[11px] font-bold text-neutral-400">
                  Entra sin buscar el link.
                </p>
              </div>
              <button
                type="button"
                onClick={enablePush}
                disabled={pushBusy || pushState === "granted"}
                className="rounded-xl border border-[#00E0FF]/25 bg-[#00E0FF]/8 px-3 py-2 text-left disabled:opacity-70"
              >
                <p className="flex items-center gap-1.5 text-[10px] font-black uppercase tracking-widest text-[#00E0FF]">
                  {pushState === "granted" ? (
                    <CheckCircle2 className="h-3.5 w-3.5" />
                  ) : (
                    <BellRing className="h-3.5 w-3.5" />
                  )}
                  Avisos
                </p>
                <p className="mt-1 text-[11px] font-bold text-neutral-400">
                  {pushState === "granted" ? "Activos" : pushBusy ? "Activando" : "Cumples y pagos"}
                </p>
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
