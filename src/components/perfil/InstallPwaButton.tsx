import { Button } from "@/components/ui/button";
import { usePwaInstall } from "@/lib/usePwaInstall";
import { Download, CheckCircle2 } from "lucide-react";
import { toast } from "sonner";

export function InstallPwaButton() {
  const { canInstall, installed, promptInstall } = usePwaInstall();
  if (installed)
    return (
      <div className="flex items-center justify-center gap-2 rounded-md border-2 border-[#FFD60A]/60 bg-[#FFD60A]/10 py-2 text-xs font-black uppercase tracking-widest text-[#FFD60A]">
        <CheckCircle2 className="h-4 w-4" /> App instalada
      </div>
    );
  return (
    <Button
      onClick={async () => {
        const r = await promptInstall();
        if (r === "unavailable")
          toast.message("Instalación no disponible aquí. Usa 'Agregar a pantalla de inicio' del navegador.");
      }}
      disabled={!canInstall}
      className="w-full bg-[#0B0B1F] font-black uppercase tracking-widest text-[#FFD60A] ring-2 ring-[#FFD60A]/60 shadow-[0_0_15px_rgba(255,214,10,0.3)] hover:bg-[#FFD60A]/10"
    >
      <Download className="h-4 w-4" /> {canInstall ? "Instalar app" : "Instalar (no disponible)"}
    </Button>
  );
}
