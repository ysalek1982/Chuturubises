import { Button } from "@/components/ui/button";
import { getPwaPlatform, usePwaInstall } from "@/lib/usePwaInstall";
import { CheckCircle2, Download, PlusSquare, Share2 } from "lucide-react";
import { toast } from "sonner";

export function InstallPwaButton() {
  const { canInstall, installed, promptInstall } = usePwaInstall();
  const platform = getPwaPlatform();

  if (installed) {
    return (
      <div className="flex items-center justify-center gap-2 rounded-xl border-2 border-[#FFD60A]/60 bg-[#FFD60A]/10 py-2 text-xs font-black uppercase tracking-widest text-[#FFD60A]">
        <CheckCircle2 className="h-4 w-4" /> App instalada
      </div>
    );
  }

  if (platform === "ios" && !canInstall) {
    return (
      <div className="rounded-xl border border-[#00E0FF]/25 bg-[#00E0FF]/8 p-3">
        <p className="text-[10px] font-black uppercase tracking-widest text-[#00E0FF]">
          Instalar en iPhone
        </p>
        <div className="mt-2 grid gap-1.5 text-xs font-bold text-neutral-300">
          <p className="flex items-center gap-2">
            <Share2 className="h-4 w-4 text-[#00E0FF]" /> Safari: toca Compartir.
          </p>
          <p className="flex items-center gap-2">
            <PlusSquare className="h-4 w-4 text-[#FFD60A]" /> Agregar a pantalla de inicio.
          </p>
        </div>
      </div>
    );
  }

  return (
    <Button
      onClick={async () => {
        const result = await promptInstall();
        if (result === "accepted") toast.success("App instalada en tu telefono.");
        if (result === "unavailable") {
          toast.message("Abre el menu del navegador y elige Agregar a pantalla de inicio.");
        }
      }}
      className="w-full rounded-xl bg-[#0B0B1F] font-black uppercase tracking-widest text-[#FFD60A] shadow-[0_0_15px_rgba(255,214,10,0.3)] ring-2 ring-[#FFD60A]/60 hover:bg-[#FFD60A]/10"
    >
      <Download className="h-4 w-4" /> {canInstall ? "Instalar app" : "Como instalar app"}
    </Button>
  );
}
