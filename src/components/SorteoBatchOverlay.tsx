import { useEffect, useState } from "react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { ConfettiBurst } from "@/components/ConfettiBurst";
import { ROLE_META, formatTurnDate } from "@/lib/turn-roles";
import type { TurnTheme } from "@/lib/turn-themes";
import type { Profile, TurnRole } from "@/lib/supabase";
import { X } from "lucide-react";

export type BatchMember = { profile: Profile; role: TurnRole };
export type BatchGroup = {
  id?: string;
  turn_date: string;
  theme: TurnTheme | null;
  members: BatchMember[];
};

export function SorteoBatchOverlay({
  groups,
  isReplay,
  onClose,
}: {
  groups: BatchGroup[];
  isReplay?: boolean;
  onClose: () => void;
}) {
  const total = groups.length;
  const [phase, setPhase] = useState<"spinning" | "revealing" | "done">("spinning");
  const [revealedIdx, setRevealedIdx] = useState(-1);
  const [confettiTick, setConfettiTick] = useState(0);

  useEffect(() => {
    // Spin phase ~1.6s, then reveal groups one by one every 900ms
    const spinT = window.setTimeout(() => {
      setPhase("revealing");
      setRevealedIdx(0);
    }, 1600);
    return () => window.clearTimeout(spinT);
  }, []);

  useEffect(() => {
    if (phase !== "revealing") return;
    if (revealedIdx >= total - 1) {
      const t = window.setTimeout(() => {
        setPhase("done");
        setConfettiTick(Date.now());
      }, 900);
      return () => window.clearTimeout(t);
    }
    const t = window.setTimeout(() => setRevealedIdx((i) => i + 1), 900);
    return () => window.clearTimeout(t);
  }, [phase, revealedIdx, total]);

  return (
    <div className="fixed inset-0 z-[70] flex flex-col bg-black/95 backdrop-blur-md">
      <ConfettiBurst trigger={confettiTick} count={140} />

      <div className="flex items-center justify-between px-5 pt-5">
        <div>
          <p className="text-[10px] font-black uppercase tracking-[0.4em] text-[#FFD60A]">
            {isReplay ? "📺 Repetición" : "🎰 Sorteo en vivo"}
          </p>
          <p className="mt-1 text-2xl text-white [font-family:'Bangers',system-ui] [letter-spacing:0.06em] [text-shadow:0_2px_0_#FF2E93]">
            {phase === "spinning"
              ? "Sorteando próximos turnos..."
              : phase === "revealing"
                ? `Revelando turno ${revealedIdx + 1}/${total}`
                : `🎉 ${total} turno${total === 1 ? "" : "s"} asignado${total === 1 ? "" : "s"}`}
          </p>
        </div>
        <button
          onClick={onClose}
          className="rounded-full border border-[#FFD60A]/30 bg-black/60 p-2 text-[#FFD60A] hover:bg-[#FFD60A]/10"
          aria-label="Cerrar"
        >
          <X className="h-5 w-5" />
        </button>
      </div>

      <div className="flex-1 overflow-y-auto px-4 py-4">
        {phase === "spinning" ? (
          <div className="flex h-full flex-col items-center justify-center gap-4">
            <div className="relative h-32 w-32">
              <div className="absolute inset-0 animate-spin rounded-full border-4 border-[#FF2E93] border-t-[#FFD60A] border-r-[#00E0FF]" />
              <div className="absolute inset-4 flex items-center justify-center text-6xl">🐝</div>
            </div>
            <p className="text-center text-sm font-black uppercase tracking-widest text-[#00E0FF]">
              Mezclando al enjambre...
            </p>
          </div>
        ) : (
          <div className="mx-auto flex max-w-2xl flex-col gap-4">
            {groups.map((g, idx) => {
              const visible = phase === "done" || idx <= revealedIdx;
              return (
                <div
                  key={g.id ?? idx}
                  className={`transition-all duration-500 ${
                    visible
                      ? "translate-y-0 opacity-100"
                      : "pointer-events-none translate-y-4 opacity-0"
                  }`}
                >
                  {visible && <GroupCard index={idx + 1} group={g} />}
                </div>
              );
            })}
          </div>
        )}
      </div>

      {phase === "done" && (
        <div className="flex justify-center px-5 pb-6">
          <Button
            onClick={onClose}
            className="bg-gradient-to-r from-[#FF2E93] to-[#FFD60A] px-8 font-black uppercase tracking-widest text-black shadow-[0_4px_0_rgba(0,0,0,0.4)] hover:brightness-110"
          >
            ¡Listo!
          </Button>
        </div>
      )}
    </div>
  );
}

function GroupCard({ index, group }: { index: number; group: BatchGroup }) {
  const theme = group.theme;
  return (
    <div className="animate-winner-pop relative overflow-hidden rounded-2xl border-2 border-[#FFD60A] bg-[#0B0B1F] shadow-[0_0_30px_rgba(255,46,147,0.4)]">
      <div
        className={`relative px-4 py-3 ${
          theme
            ? `bg-gradient-to-r ${theme.accent}`
            : "bg-gradient-to-r from-[#FF2E93]/30 to-[#00E0FF]/20"
        }`}
      >
        <div className="flex items-center justify-between gap-2">
          <div className="min-w-0">
            <p className="text-[10px] font-black uppercase tracking-[0.3em] text-[#00E0FF]">
              Turno #{index} · {formatTurnDate(group.turn_date)}
            </p>
            <p className="mt-0.5 truncate text-2xl text-white [font-family:'Bangers',system-ui] [letter-spacing:0.06em] [text-shadow:0_2px_0_#FF2E93]">
              {theme ? `${theme.emoji} ${theme.label}` : "Turno del enjambre 🐝"}
            </p>
          </div>
          <span className="shrink-0 rounded-full border border-[#FFD60A] bg-black/50 px-2 py-0.5 text-[10px] font-black text-[#FFD60A]">
            {group.members.length} 🐝
          </span>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-2 p-3 sm:grid-cols-[repeat(auto-fit,minmax(110px,1fr))]">
        {group.members.map((m, i) => {
          const meta = ROLE_META[m.role];
          const Icon = meta.icon;
          const ring = i % 2 === 0 ? "border-[#FFD60A]" : "border-[#00E0FF]";
          return (
            <div
              key={`${m.profile.id}-${i}`}
              className="flex flex-col items-center rounded-xl border border-white/10 bg-black/40 p-2"
            >
              <div className="relative">
                <Avatar className={`h-14 w-14 border-2 ${ring}`}>
                  <AvatarImage
                    src={m.profile.avatar_url ?? undefined}
                    className="object-cover"
                  />
                  <AvatarFallback className="bg-[#0B0B1F] text-xl text-[#FFD60A]">
                    🐝
                  </AvatarFallback>
                </Avatar>
                <span
                  className="absolute -bottom-1 -right-1 flex h-6 w-6 items-center justify-center rounded-full border-2 border-[#0B0B1F] bg-[#FFD60A] text-xs"
                  title={meta.label}
                >
                  {meta.emoji}
                </span>
              </div>
              <p className="mt-2 w-full truncate text-center text-xs font-black text-white">
                @{m.profile.nickname ?? "?"}
              </p>
              <div
                className={`mt-1 flex items-center gap-1 rounded-full border px-1.5 py-0.5 text-[9px] font-black uppercase tracking-wider ${meta.color}`}
              >
                <Icon className="h-2.5 w-2.5" />
                {meta.label}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
