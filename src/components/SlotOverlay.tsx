import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { ConfettiBurst } from "@/components/ConfettiBurst";
import { ROLE_META, formatTurnDate } from "@/lib/turn-roles";
import { TURN_THEMES, type TurnTheme } from "@/lib/turn-themes";
import type { Profile, TurnRole } from "@/lib/supabase";
import { X } from "lucide-react";

export type SlotWinner = { profile: Profile; role: TurnRole };

export function SlotOverlay({
  winners,
  revealed,
  spinning,
  reelPool,
  turnDate,
  theme,
  themeRevealed,
  confettiTick,
  isReplay,
  onClose,
}: {
  winners: SlotWinner[];
  revealed: number;
  spinning: boolean;
  reelPool: string[];
  turnDate: string | null;
  theme: TurnTheme | null;
  themeRevealed: boolean;
  confettiTick: number;
  isReplay?: boolean;
  onClose: () => void;
}) {
  const allRevealed = revealed >= 4 && themeRevealed && !spinning;
  return (
    <div className="fixed inset-0 z-[70] flex flex-col items-center justify-center bg-black/95 px-4 backdrop-blur-md">
      <ConfettiBurst trigger={confettiTick} count={90} />
      <div className="mb-3 text-center">
        <p className="text-[10px] font-black uppercase tracking-[0.4em] text-yellow-400">
          {isReplay ? "📺 Repetición del sorteo" : "🎰 Sorteo en vivo"}
        </p>
        {turnDate && (
          <p className="mt-1 text-sm text-neutral-300">
            Junte del <span className="font-bold text-yellow-200">{formatTurnDate(turnDate)}</span>
          </p>
        )}
      </div>

      <div className="grid w-full max-w-md grid-cols-4 gap-2">
        {winners.map((w, idx) => (
          <SlotReel key={idx} winner={w} isRevealed={revealed > idx} pool={reelPool} />
        ))}
      </div>

      <div className="mt-5 w-full max-w-md">
        <p className="mb-1 text-center text-[10px] font-black uppercase tracking-[0.3em] text-yellow-400">
          🎭 Temática del junte
        </p>
        <ThemeReel theme={theme} revealed={themeRevealed} />
      </div>

      {allRevealed && (
        <div className="mt-5 flex flex-col items-center gap-3">
          <p className="text-center text-xs font-black uppercase tracking-widest text-yellow-300">
            {isReplay ? "🎬 ¡Así quedó el nuevo turno!" : "🎉 ¡Nuevo turno asignado!"}
          </p>
          <Button
            onClick={onClose}
            className="bg-yellow-400 px-6 font-black uppercase tracking-widest text-black hover:bg-yellow-300"
          >
            Cerrar
          </Button>
        </div>
      )}

      <button
        onClick={onClose}
        className="absolute right-4 top-4 rounded-full border border-yellow-400/30 bg-black/60 p-2 text-yellow-300 hover:bg-yellow-400/10"
        aria-label="Cerrar"
      >
        <X className="h-5 w-5" />
      </button>
    </div>
  );
}

function ThemeReel({ theme, revealed }: { theme: TurnTheme | null; revealed: boolean }) {
  const strip = [...TURN_THEMES, ...TURN_THEMES, ...TURN_THEMES];
  if (revealed && theme) {
    return (
      <div
        className={`animate-winner-pop flex h-16 w-full items-center justify-center rounded-xl border-2 border-yellow-300 bg-gradient-to-r ${theme.accent} shadow-[0_0_30px_rgba(255,196,0,0.55)]`}
      >
        <span className="text-3xl">{theme.emoji}</span>
        <span className="ml-3 text-base font-black uppercase tracking-wider text-neutral-50">
          {theme.label}
        </span>
      </div>
    );
  }
  return (
    <div className="relative h-16 w-full overflow-hidden rounded-xl border-2 border-yellow-400/40 bg-neutral-950">
      <div className="slot-reel flex flex-col">
        {strip.map((t, i) => (
          <div key={i} className="flex h-16 w-full shrink-0 items-center justify-center gap-2 px-3">
            <span className="text-2xl">{t.emoji}</span>
            <span className="text-sm font-black uppercase tracking-wider text-neutral-200">
              {t.label}
            </span>
          </div>
        ))}
      </div>
      <div className="pointer-events-none absolute inset-0 bg-gradient-to-b from-black/70 via-transparent to-black/70" />
    </div>
  );
}

function SlotReel({
  winner,
  isRevealed,
  pool,
}: {
  winner: SlotWinner;
  isRevealed: boolean;
  pool: string[];
}) {
  const meta = ROLE_META[winner.role];
  const Icon = meta.icon;
  const strip = pool.length ? [...pool, ...pool, ...pool, ...pool] : [];
  return (
    <div className="flex flex-col items-center">
      <div
        className={`relative h-28 w-full overflow-hidden rounded-lg border-2 ${isRevealed ? "border-yellow-300 shadow-[0_0_25px_rgba(255,196,0,0.6)]" : "border-yellow-400/40"} bg-neutral-950`}
      >
        {isRevealed ? (
          <div className="animate-winner-pop flex h-full w-full items-center justify-center">
            <Avatar className="h-20 w-20 border-2 border-yellow-300">
              <AvatarImage src={winner.profile.avatar_url ?? undefined} className="object-cover" />
              <AvatarFallback className="bg-neutral-800 text-2xl text-yellow-400">🐝</AvatarFallback>
            </Avatar>
          </div>
        ) : (
          <div className="slot-reel flex flex-col">
            {strip.map((url, i) => (
              <div key={i} className="flex h-28 w-full shrink-0 items-center justify-center">
                <img
                  src={url}
                  alt=""
                  className="h-20 w-20 rounded-full border-2 border-yellow-400/40 object-cover"
                />
              </div>
            ))}
          </div>
        )}
        <div className="pointer-events-none absolute inset-0 bg-gradient-to-b from-black/70 via-transparent to-black/70" />
      </div>
      <div
        className={`mt-2 w-full rounded-md border px-1 py-1 text-center transition-opacity ${meta.color} ${isRevealed ? "opacity-100" : "opacity-30"}`}
      >
        <Icon className="mx-auto h-4 w-4" />
        <p className="mt-0.5 truncate text-[10px] font-black uppercase tracking-wider">
          {meta.label}
        </p>
        {isRevealed && (
          <p className="truncate text-[10px] font-bold text-neutral-100">
            @{winner.profile.nickname}
          </p>
        )}
      </div>
    </div>
  );
}
