import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Calendar as CalendarIcon } from "lucide-react";

type Props = {
  freqWeeks: number;
  nextDate: string;
  onFreqChange: (w: number) => void;
  onNextDateLocal: (v: string) => void;
  onNextDateCommit: (v: string) => void;
};

export function SorteoConfigCard({
  freqWeeks,
  nextDate,
  onFreqChange,
  onNextDateLocal,
  onNextDateCommit,
}: Props) {
  return (
    <div className="mt-5 space-y-3 rounded-2xl border border-[#FF2E93]/40 bg-[#0B0B1F] p-4 shadow-[0_0_25px_rgba(255,46,147,0.25)]">
      <p className="flex items-center gap-2 text-xl text-[#FFD60A] [font-family:'Bangers',system-ui] [letter-spacing:0.06em] [text-shadow:0_2px_0_#FF2E93]">
        <CalendarIcon className="h-4 w-4 text-[#00E0FF]" /> Configuración de turnos
      </p>
      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-1">
          <Label className="text-[10px] font-black uppercase tracking-[0.25em] text-[#00E0FF]">
            Frecuencia
          </Label>
          <div className="flex overflow-hidden rounded-lg border border-[#FFD60A]/30">
            {[1, 2].map((w) => (
              <button
                key={w}
                onClick={() => onFreqChange(w)}
                className={`flex-1 py-2 text-xs font-black uppercase tracking-wider transition ${
                  freqWeeks === w
                    ? "bg-[#FFD60A] text-black shadow-[inset_0_0_15px_rgba(255,46,147,0.4)]"
                    : "bg-black/40 text-white/70 hover:bg-[#FF2E93]/20 hover:text-white"
                }`}
              >
                Cada {w} sem.
              </button>
            ))}
          </div>
        </div>
        <div className="space-y-1">
          <Label className="text-[10px] font-black uppercase tracking-[0.25em] text-[#00E0FF]">
            Próximo junte
          </Label>
          <Input
            type="date"
            value={nextDate}
            onChange={(e) => onNextDateLocal(e.target.value)}
            onBlur={(e) => onNextDateCommit(e.target.value)}
            className="border-[#FFD60A]/30 bg-black/40 text-white"
          />
        </div>
      </div>
      <p className="text-[10px] text-white/50">
        El siguiente turno se asignará al último grupo + {freqWeeks * 7} días, o a la fecha de aquí si no hay grupos.
      </p>
    </div>
  );
}
