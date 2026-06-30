type Props = {
  spinning: boolean;
  previewChunks: number;
  eligibleCount: number;
  onSpin: () => void;
};

export function SorteoSpinButton({ spinning, previewChunks, eligibleCount, onSpin }: Props) {
  const remainderHint = (() => {
    if (previewChunks === 0) return null;
    const r = eligibleCount % 4;
    if (eligibleCount === 3) return " (grupo único de 3 🐝)";
    if (r === 3) return " (último grupo aparte de 3 🐝)";
    if (r === 1 || r === 2) return ` (último con ${4 + r} 🐝)`;
    return "";
  })();

  return (
    <>
      <button
        type="button"
        onClick={onSpin}
        disabled={spinning || previewChunks === 0}
        className="group relative mt-5 w-full overflow-hidden rounded-2xl border-2 border-[#FFD60A] bg-gradient-to-r from-[#FF2E93] via-[#FF8A00] to-[#FFD60A] px-4 py-4 text-center shadow-[0_0_40px_rgba(255,46,147,0.6)] transition-all hover:scale-[1.01] hover:shadow-[0_0_55px_rgba(255,214,10,0.7)] active:scale-[0.99] disabled:cursor-not-allowed disabled:opacity-60 disabled:hover:scale-100"
      >
        <div className="absolute inset-0 opacity-25 [background-image:radial-gradient(circle_at_20%_30%,#fff_2px,transparent_2px),radial-gradient(circle_at_70%_70%,#fff_2px,transparent_2px)] [background-size:30px_30px,40px_40px]" />
        <span className="relative text-3xl text-black [font-family:'Bangers',system-ui] [letter-spacing:0.08em] [text-shadow:0_2px_0_rgba(255,255,255,0.4)]">
          {spinning
            ? "🐝 Zumbando..."
            : previewChunks > 0
              ? `🎰 Sortear ${previewChunks} turno${previewChunks === 1 ? "" : "s"}`
              : "🎰 Sortear todos los turnos"}
        </span>
      </button>
      {previewChunks > 0 && (
        <p className="mt-2 text-center text-[11px] font-bold text-white/70">
          {eligibleCount} fraternos disponibles → {previewChunks} grupo{previewChunks === 1 ? "" : "s"}
          {remainderHint}
        </p>
      )}
    </>
  );
}
