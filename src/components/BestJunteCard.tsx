import { useEffect, useState } from "react";
import { supabase, type TurnGroup, type TurnRatingStat } from "@/lib/supabase";
import { findTheme } from "@/lib/turn-themes";
import { formatTurnDate } from "@/lib/turn-roles";
import { Trophy, Star } from "lucide-react";

export function BestJunteCard() {
  const [best, setBest] = useState<{ group: TurnGroup; stat: TurnRatingStat } | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      const year = new Date().getFullYear();
      const [{ data: stats }, { data: groups }] = await Promise.all([
        supabase.from("turn_rating_stats").select("*"),
        supabase.from("turn_groups").select("*").gte("turn_date", `${year}-01-01`),
      ]);
      const gMap = new Map<string, TurnGroup>(((groups as TurnGroup[]) ?? []).map((g) => [g.id, g]));
      const ranked = ((stats as TurnRatingStat[]) ?? [])
        .map((s) => ({ ...s, avg_rating: Number(s.avg_rating) }))
        .filter((s) => gMap.has(s.turn_id) && s.rating_count >= 1)
        .sort((a, b) => b.avg_rating - a.avg_rating || b.rating_count - a.rating_count);
      const top = ranked[0];
      setBest(top ? { group: gMap.get(top.turn_id)!, stat: top } : null);
      setLoading(false);
    })();
  }, []);

  if (loading || !best) return null;
  const theme = findTheme(best.group.theme);

  return (
    <div className="mb-4 overflow-hidden rounded-2xl border-2 border-[#FFC400] bg-gradient-to-br from-yellow-500/15 via-amber-500/10 to-black shadow-[0_0_30px_rgba(255,196,0,0.35)]">
      <div className="flex items-center gap-3 px-4 py-3">
        <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-[#FFC400] text-black shadow-[0_0_15px_rgba(255,196,0,0.6)]">
          <Trophy className="h-6 w-6" />
        </div>
        <div className="min-w-0 flex-1">
          <p className="text-[10px] font-black uppercase tracking-[0.3em] text-[#FFC400]">
            🏆 Mejor junte del año
          </p>
          <p className="truncate text-base font-black text-neutral-50">
            {theme ? `${theme.emoji} ${theme.label}` : "Turno del enjambre"}
          </p>
          <p className="text-[10px] text-neutral-400">{formatTurnDate(best.group.turn_date)}</p>
        </div>
        <div className="flex shrink-0 flex-col items-end">
          <span className="flex items-center gap-1 text-2xl font-black text-[#FFC400]">
            <Star className="h-5 w-5 fill-[#FFC400]" />
            {best.stat.avg_rating.toFixed(1)}
          </span>
          <span className="text-[10px] text-neutral-500">
            {best.stat.rating_count} voto{best.stat.rating_count === 1 ? "" : "s"}
          </span>
        </div>
      </div>
    </div>
  );
}
