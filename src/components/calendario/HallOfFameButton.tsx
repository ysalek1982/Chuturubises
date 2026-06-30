import { Trophy } from "lucide-react";

export function HallOfFameButton({ onClick }: { onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="group relative mb-5 flex w-full items-center justify-between overflow-hidden rounded-2xl border-2 border-[#FFD60A] bg-gradient-to-r from-[#FF2E93] via-[#FF8A00] to-[#FFD60A] px-4 py-3.5 text-left shadow-[0_0_35px_rgba(255,46,147,0.55)] transition-all hover:scale-[1.01] hover:shadow-[0_0_45px_rgba(255,214,10,0.6)] active:scale-[0.99]"
    >
      <div className="absolute inset-0 opacity-25 [background-image:radial-gradient(circle_at_20%_30%,#fff_2px,transparent_2px),radial-gradient(circle_at_70%_70%,#fff_2px,transparent_2px),radial-gradient(circle_at_50%_50%,#00E0FF_2px,transparent_2px)] [background-size:30px_30px,40px_40px,55px_55px]" />
      <div className="relative flex items-center gap-3">
        <span className="text-3xl drop-shadow-[0_2px_0_rgba(0,0,0,0.4)]">🏆</span>
        <div>
          <p className="text-[10px] font-black uppercase tracking-[0.25em] text-black/80">
            Ranking del año
          </p>
          <p className="text-xl text-black [font-family:'Bangers',system-ui] [letter-spacing:0.06em] [text-shadow:0_2px_0_rgba(255,255,255,0.35)]">
            Salón de la Fama
          </p>
        </div>
      </div>
      <Trophy className="relative h-6 w-6 text-black transition-transform group-hover:rotate-12" />
    </button>
  );
}
