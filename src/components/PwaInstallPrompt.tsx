import { useEffect, useMemo, useState } from "react";
import { Download, PlusSquare, Share2, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { usePwaInstall } from "@/lib/usePwaInstall";
import { toast } from "sonner";

const DISMISSED_KEY = "chuturubises-pwa-install-dismissed";

function isStandalone() {
  return (
    window.matchMedia("(display-mode: standalone)").matches ||
    (window.navigator as Navigator & { standalone?: boolean }).standalone === true
  );
}

function isIosDevice() {
  return /iphone|ipad|ipod/i.test(window.navigator.userAgent);
}

export function PwaInstallPrompt() {
  const { canInstall, installed, promptInstall } = usePwaInstall();
  const [dismissed, setDismissed] = useState(() => localStorage.getItem(DISMISSED_KEY) === "1");
  const [ready, setReady] = useState(false);
  const ios = useMemo(() => (typeof window === "undefined" ? false : isIosDevice()), []);

  useEffect(() => {
    const timer = window.setTimeout(() => setReady(true), 900);
    return () => window.clearTimeout(timer);
  }, []);

  if (!ready || dismissed || installed || isStandalone()) return null;
  if (!canInstall && !ios) return null;

  const dismiss = () => {
    localStorage.setItem(DISMISSED_KEY, "1");
    setDismissed(true);
  };

  const install = async () => {
    const result = await promptInstall();
    if (result === "accepted") {
      dismiss();
      toast.success("App instalada. Ya puedes abrirla desde tu pantalla.");
      return;
    }
    if (result === "dismissed") {
      dismiss();
      return;
    }
    toast.message("Usa el menú del navegador y elige Agregar a pantalla de inicio.");
  };

  return (
    <div className="fixed inset-x-0 bottom-[calc(5.5rem+env(safe-area-inset-bottom))] z-[80] mx-auto max-w-md px-4 sm:max-w-lg">
      <div className="chutu-panel rounded-[1.35rem] border-[#FFD60A]/35 p-4 shadow-[0_24px_80px_rgba(0,0,0,0.55)]">
        <div className="flex gap-3">
          <div className="grid h-12 w-12 shrink-0 place-items-center rounded-2xl bg-[#FFD60A] text-black shadow-[0_0_26px_rgba(255,214,10,0.28)]">
            <Download className="h-5 w-5" />
          </div>
          <div className="min-w-0 flex-1">
            <div className="flex items-start justify-between gap-2">
              <div>
                <p className="chutu-eyebrow">Instalar app</p>
                <h2 className="mt-1 text-base font-black text-white">Lleva Chuturubises en tu pantalla</h2>
              </div>
              <button
                type="button"
                onClick={dismiss}
                className="grid h-8 w-8 shrink-0 place-items-center rounded-full border border-white/10 text-white/60 transition hover:bg-white/10 hover:text-white"
                aria-label="Cerrar invitación de instalación"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            {ios ? (
              <div className="mt-3 grid gap-2 text-xs font-bold text-neutral-300">
                <p className="flex items-center gap-2">
                  <Share2 className="h-4 w-4 text-[#00E0FF]" /> Toca Compartir en Safari.
                </p>
                <p className="flex items-center gap-2">
                  <PlusSquare className="h-4 w-4 text-[#FFD60A]" /> Luego Agregar a pantalla de inicio.
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
          </div>
        </div>
      </div>
    </div>
  );
}
