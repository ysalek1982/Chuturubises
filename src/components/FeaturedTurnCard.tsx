import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { ROLE_META, formatTurnDate } from "@/lib/turn-roles";
import { findTheme } from "@/lib/turn-themes";
import type { Profile, TurnGroup, TurnGroupMember } from "@/lib/supabase";
import { Sparkles } from "lucide-react";

type Member = TurnGroupMember & { profile: Profile | null };

export function FeaturedTurnCard({
  group,
  members,
}: {
  group: TurnGroup;
  members: Member[];
}) {
  const theme = findTheme(group.theme);
  const order = { churrasquero: 0, compras: 1, ayudante: 2 } as const;
  const sorted = [...members].sort((a, b) => order[a.role] - order[b.role]);

  return (
    <div className="relative overflow-hidden rounded-[28px] border-2 border-[#FF2E93] bg-[#0B0B1F] shadow-[0_0_50px_rgba(255,46,147,0.45),inset_0_0_30px_rgba(0,224,255,0.08)]">
      {/* Neon glows */}
      <div className="pointer-events-none absolute -left-10 -top-10 h-40 w-40 rounded-full bg-[#FF2E93]/30 blur-3xl" />
      <div className="pointer-events-none absolute -right-10 bottom-10 h-44 w-44 rounded-full bg-[#00E0FF]/25 blur-3xl" />

      {/* Theme banner */}
      <div
        className={`relative px-5 pb-6 pt-5 ${
          theme ? `bg-gradient-to-br ${theme.accent}` : "bg-gradient-to-br from-[#FF2E93]/30 to-[#00E0FF]/20"
        }`}
      >
        <div className="absolute -right-6 -top-6 select-none text-[120px] opacity-25">
          {theme?.emoji ?? "🐝"}
        </div>
        <div className="relative">
          <div className="flex items-center gap-1.5">
            <Sparkles className="h-3.5 w-3.5 text-[#00E0FF] drop-shadow-[0_0_6px_rgba(0,224,255,0.9)]" />
            <span className="text-[10px] font-black uppercase tracking-[0.35em] text-[#00E0FF]">
              Próximo junte
            </span>
          </div>
          <p className="mt-1 text-[11px] font-bold uppercase tracking-widest text-white/85">
            {formatTurnDate(group.turn_date)}
          </p>
          <h3
            className="mt-1 flex items-center gap-2 text-3xl leading-tight text-[#FFD60A] [font-family:'Bangers',system-ui] [text-shadow:0_2px_0_#FF2E93,0_0_18px_rgba(255,214,10,0.55)]"
            style={{ letterSpacing: "0.06em" }}
          >
            {theme ? (
              <>
                <span className="text-3xl">{theme.emoji}</span>
                <span>{theme.label}</span>
              </>
            ) : (
              <span>Turno del enjambre 🐝</span>
            )}
          </h3>
        </div>
      </div>

      {/* Crew grid */}
      <div className="relative grid grid-cols-2 gap-3 p-4 sm:grid-cols-[repeat(auto-fit,minmax(120px,1fr))]">
        {sorted.map((m, i) => {
          const meta = ROLE_META[m.role];
          const Icon = meta.icon;
          const ring = i % 2 === 0 ? "border-[#FFD60A]" : "border-[#00E0FF]";
          const glow =
            i % 2 === 0
              ? "shadow-[0_0_22px_rgba(255,214,10,0.55)]"
              : "shadow-[0_0_22px_rgba(0,224,255,0.55)]";
          return (
            <div
              key={m.id}
              className="group relative flex flex-col items-center rounded-2xl border border-white/10 bg-black/45 p-3 backdrop-blur-sm transition hover:-translate-y-1 hover:border-[#FF2E93]"
            >
              <div className="relative">
                <Avatar className={`h-20 w-20 border-[3px] ${ring} ${glow}`}>
                  <AvatarImage src={m.profile?.avatar_url ?? undefined} className="object-cover" />
                  <AvatarFallback className="bg-[#0B0B1F] text-3xl text-[#FFD60A]">
                    🐝
                  </AvatarFallback>
                </Avatar>
                <span
                  className="absolute -bottom-1 -right-1 flex h-8 w-8 items-center justify-center rounded-full border-2 border-[#0B0B1F] bg-[#FFD60A] text-base shadow"
                  title={meta.label}
                >
                  {meta.emoji}
                </span>
              </div>
              <p className="mt-3 truncate text-sm font-black text-white">
                @{m.profile?.nickname ?? "?"}
              </p>
              <div
                className={`mt-1.5 flex items-center gap-1 rounded-full border px-2 py-0.5 text-[9px] font-black uppercase tracking-widest ${meta.color}`}
              >
                <Icon className="h-3 w-3" />
                {meta.label}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
