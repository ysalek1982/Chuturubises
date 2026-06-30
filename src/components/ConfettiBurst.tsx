import { useEffect, useState } from "react";

type Piece = { id: number; left: number; dx: number; bg: string; dur: number; delay: number; rot: number };

const COLORS = ["#FFC400", "#FFD84D", "#111111", "#F8F8F2"];

/** Burst of confetti pieces falling across the viewport. */
export function ConfettiBurst({ trigger, count = 50 }: { trigger: number; count?: number }) {
  const [pieces, setPieces] = useState<Piece[]>([]);

  useEffect(() => {
    if (!trigger) return;
    const next: Piece[] = Array.from({ length: count }).map((_, i) => ({
      id: trigger * 1000 + i,
      left: Math.random() * 100,
      dx: (Math.random() - 0.5) * 200,
      bg: COLORS[i % COLORS.length],
      dur: 1.6 + Math.random() * 1.4,
      delay: Math.random() * 0.3,
      rot: Math.random() * 360,
    }));
    setPieces(next);
    const t = window.setTimeout(() => setPieces([]), 3500);
    return () => window.clearTimeout(t);
  }, [trigger, count]);

  if (!pieces.length) return null;

  return (
    <div className="pointer-events-none fixed inset-0 z-[60] overflow-hidden">
      {pieces.map((p) => (
        <span
          key={p.id}
          className="confetti-piece"
          style={{
            left: `${p.left}%`,
            background: p.bg,
            animationDuration: `${p.dur}s`,
            animationDelay: `${p.delay}s`,
            transform: `rotate(${p.rot}deg)`,
            // @ts-expect-error custom prop
            "--dx": `${p.dx}px`,
            borderRadius: p.id % 3 === 0 ? "9999px" : "2px",
          }}
        />
      ))}
    </div>
  );
}
