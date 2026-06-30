type Props = {
  cycle: number;
  eligibleCount: number;
  drawnCount: number;
  total: number;
};

export function SorteoProgressCard({ cycle, eligibleCount, drawnCount, total }: Props) {
  const pct = total ? Math.round((drawnCount / total) * 100) : 0;
  return (
    <div className="relative mt-5 overflow-hidden rounded-2xl border-2 border-[#00E0FF]/50 bg-[#0B0B1F] p-4 shadow-[0_0_25px_rgba(0,224,255,0.3)]">
      <div className="pointer-events-none absolute -right-8 -top-8 h-28 w-28 rounded-full bg-[#FF2E93]/30 blur-2xl" />
      <div className="relative flex items-center justify-between">
        <div>
          <p className="text-[10px] font-black uppercase tracking-[0.3em] text-[#00E0FF]">
            Ciclo #{cycle}
          </p>
          <p className="mt-0.5 text-2xl text-[#FFD60A] [font-family:'Bangers',system-ui] [letter-spacing:0.06em] [text-shadow:0_2px_0_#FF2E93]">
            Faltan {eligibleCount} fraternos 🐝
          </p>
        </div>
        <div className="text-right">
          <p className="text-3xl font-black text-[#FF2E93] [text-shadow:0_0_15px_rgba(255,46,147,0.6)]">
            {pct}%
          </p>
          <p className="text-[10px] uppercase tracking-widest text-white/50">
            {drawnCount}/{total}
          </p>
        </div>
      </div>
      <div className="relative mt-3 h-3 overflow-hidden rounded-full border border-white/10 bg-black/50">
        <div
          className="h-full rounded-full bg-gradient-to-r from-[#FF2E93] via-[#FFD60A] to-[#00E0FF] shadow-[0_0_15px_rgba(255,214,10,0.6)] transition-all duration-700"
          style={{ width: `${pct}%` }}
        />
      </div>
    </div>
  );
}
