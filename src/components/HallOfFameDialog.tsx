import { useEffect, useState } from "react";
import {
  supabase,
  type Profile,
  type TurnGroup,
  type TurnGroupMember,
  type TurnRatingStat,
} from "@/lib/supabase";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { findTheme } from "@/lib/turn-themes";
import { formatTurnDate } from "@/lib/turn-roles";
import { Trophy, Star, Crown } from "lucide-react";

type Member = TurnGroupMember & { profile: Profile | null };
type Winner = {
  group: TurnGroup;
  stat: TurnRatingStat;
  members: Member[];
};

const PODIUM = [
  {
    label: "1er Lugar",
    accent: "from-[#FF2E93] via-[#FF8A00] to-[#FFD60A]",
    border: "border-[#FFD60A]",
    glow: "shadow-[0_0_45px_rgba(255,214,10,0.55),0_0_25px_rgba(255,46,147,0.45)]",
    text: "text-[#FFD60A]",
    medal: "🥇",
  },
  {
    label: "2do Lugar",
    accent: "from-[#00E0FF] via-[#7DD3FC] to-white",
    border: "border-[#00E0FF]",
    glow: "shadow-[0_0_30px_rgba(0,224,255,0.45)]",
    text: "text-[#00E0FF]",
    medal: "🥈",
  },
  {
    label: "3er Lugar",
    accent: "from-[#FF8A00] via-[#FF5C00] to-[#FF2E93]",
    border: "border-[#FF8A00]",
    glow: "shadow-[0_0_25px_rgba(255,138,0,0.5)]",
    text: "text-[#FF8A00]",
    medal: "🥉",
  },
];

export function HallOfFameDialog({
  open,
  onOpenChange,
}: {
  open: boolean;
  onOpenChange: (o: boolean) => void;
}) {
  const [winners, setWinners] = useState<Winner[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!open) return;
    let active = true;
    (async () => {
      setLoading(true);
      const year = new Date().getFullYear();
      const [{ data: stats }, { data: groups }, { data: members }, { data: profiles }] =
        await Promise.all([
          supabase.from("turn_rating_stats").select("*"),
          supabase.from("turn_groups").select("*").gte("turn_date", `${year}-01-01`),
          supabase.from("turn_group_members").select("*"),
          supabase.from("profiles").select("*"),
        ]);

      const gMap = new Map<string, TurnGroup>(
        ((groups as TurnGroup[]) ?? []).map((g) => [g.id, g]),
      );
      const pMap = new Map<string, Profile>(
        ((profiles as Profile[]) ?? []).map((p) => [p.id, p]),
      );
      const mByGroup = new Map<string, Member[]>();
      ((members as TurnGroupMember[]) ?? []).forEach((m) => {
        const arr = mByGroup.get(m.group_id) ?? [];
        arr.push({ ...m, profile: pMap.get(m.profile_id) ?? null });
        mByGroup.set(m.group_id, arr);
      });

      const ranked = ((stats as TurnRatingStat[]) ?? [])
        .map((s) => ({ ...s, avg_rating: Number(s.avg_rating) }))
        .filter((s) => gMap.has(s.turn_id) && s.rating_count >= 1)
        .sort((a, b) => b.avg_rating - a.avg_rating || b.rating_count - a.rating_count)
        .slice(0, 3)
        .map((s) => ({
          group: gMap.get(s.turn_id)!,
          stat: s,
          members: mByGroup.get(s.turn_id) ?? [],
        }));

      if (active) {
        setWinners(ranked);
        setLoading(false);
      }
    })();
    return () => {
      active = false;
    };
  }, [open]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[92vh] max-w-2xl overflow-y-auto border-2 border-[#FF2E93] bg-[#0B0B1F] p-0 shadow-[0_0_60px_rgba(255,46,147,0.5)]">
        {/* neon ambient */}
        <div className="pointer-events-none absolute -left-16 top-10 h-48 w-48 rounded-full bg-[#FF2E93]/40 blur-3xl" />
        <div className="pointer-events-none absolute -right-16 top-32 h-48 w-48 rounded-full bg-[#00E0FF]/30 blur-3xl" />

        <div className="relative overflow-hidden bg-gradient-to-r from-[#FF2E93] via-[#FF8A00] to-[#FFD60A] px-6 py-6">
          <div className="absolute inset-0 opacity-25 [background-image:radial-gradient(circle_at_20%_20%,#fff_2px,transparent_2px),radial-gradient(circle_at_80%_60%,#00E0FF_2px,transparent_2px),radial-gradient(circle_at_50%_80%,#fff_2px,transparent_2px)] [background-size:40px_40px,55px_55px,30px_30px]" />
          <DialogHeader className="relative">
            <DialogTitle
              className="flex items-center gap-2 text-3xl text-black [font-family:'Bangers',system-ui] [letter-spacing:0.08em] [text-shadow:0_2px_0_rgba(255,255,255,0.4)]"
            >
              <Trophy className="h-7 w-7" /> Salón de la Fama
            </DialogTitle>
            <DialogDescription className="text-sm font-bold text-black/85">
              Los mejores juntes del año {new Date().getFullYear()} 🐝
            </DialogDescription>
          </DialogHeader>
        </div>

        <div className="relative space-y-4 p-5">
          {loading ? (
            <p className="py-8 text-center text-sm text-white/60">Cargando ranking...</p>
          ) : winners.length === 0 ? (
            <div className="rounded-xl border border-[#FFD60A]/30 bg-black/40 p-8 text-center">
              <p className="text-5xl">🏆</p>
              <p className="mt-3 text-sm font-bold text-white/80">
                Aún no hay juntes calificados este año
              </p>
              <p className="mt-1 text-xs text-white/50">
                Los fraternos podrán votar después de cada junte.
              </p>
            </div>
          ) : (
            winners.map((w, idx) => <WinnerPlaque key={w.group.id} winner={w} rank={idx} />)
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}

function WinnerPlaque({ winner, rank }: { winner: Winner; rank: number }) {
  const meta = PODIUM[rank];
  const theme = findTheme(winner.group.theme);
  // sort: churrasquero first so corona destaca
  const sorted = [...winner.members].sort((a, b) =>
    a.role === "churrasquero" ? -1 : b.role === "churrasquero" ? 1 : 0,
  );

  return (
    <div
      className={`relative overflow-hidden rounded-2xl border-2 ${meta.border} bg-[#0B0B1F] ${meta.glow}`}
    >
      <div className={`flex items-center justify-between gap-3 bg-gradient-to-r ${meta.accent} px-4 py-2.5`}>
        <div className="flex items-center gap-2">
          <span className="text-2xl drop-shadow-[0_2px_0_rgba(0,0,0,0.35)]">{meta.medal}</span>
          <span className="text-[11px] font-black uppercase tracking-[0.25em] text-black">
            {meta.label}
          </span>
        </div>
        <div className="flex items-center gap-1.5 rounded-full bg-black/40 px-2.5 py-1">
          <Star className="h-3.5 w-3.5 fill-[#FFD60A] text-[#FFD60A]" />
          <span className="text-sm font-black text-white">
            {winner.stat.avg_rating.toFixed(1)}
          </span>
          <span className="text-[10px] text-white/70">
            ({winner.stat.rating_count})
          </span>
        </div>
      </div>

      <div className="p-4">
        <div className="mb-3">
          <p className="text-[10px] font-bold uppercase tracking-widest text-[#00E0FF]">
            {formatTurnDate(winner.group.turn_date)}
          </p>
          <p
            className={`mt-0.5 text-2xl ${meta.text} [font-family:'Bangers',system-ui] [letter-spacing:0.06em] [text-shadow:0_2px_0_#FF2E93]`}
          >
            {theme ? (
              <>
                <span className="mr-1.5 text-xl">{theme.emoji}</span>
                {theme.label}
              </>
            ) : (
              "Turno del enjambre"
            )}
          </p>
        </div>

        <div className="grid grid-cols-4 gap-2">
          {sorted.map((m, i) => {
            const isChef = m.role === "churrasquero";
            const ring = isChef
              ? "border-[#FFD60A]"
              : i % 2 === 0
                ? "border-[#00E0FF]"
                : "border-[#FF2E93]";
            return (
              <div key={m.id} className="flex flex-col items-center text-center">
                <div className="relative">
                  {isChef && rank === 0 && (
                    <span className="absolute -top-3 left-1/2 z-10 -translate-x-1/2 text-xl drop-shadow-[0_0_6px_rgba(255,214,10,0.9)]">
                      👑
                    </span>
                  )}
                  <Avatar
                    className={`h-14 w-14 border-2 ${ring} shadow-[0_0_14px_rgba(255,214,10,0.4)]`}
                  >
                    <AvatarImage src={m.profile?.avatar_url ?? undefined} className="object-cover" />
                    <AvatarFallback className="bg-[#0B0B1F] text-[#FFD60A]">🐝</AvatarFallback>
                  </Avatar>
                  {isChef && (
                    <Crown className="absolute -bottom-1 -right-1 h-4 w-4 rounded-full bg-[#FFD60A] p-0.5 text-black" />
                  )}
                </div>
                <p className="mt-1.5 w-full truncate text-[10px] font-bold text-white">
                  @{m.profile?.nickname ?? "?"}
                </p>
                <p className="text-[9px] uppercase tracking-wider text-white/55">
                  {m.role === "churrasquero" ? "🔥 Chef" : m.role === "compras" ? "🛒" : "🤝"}
                </p>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
