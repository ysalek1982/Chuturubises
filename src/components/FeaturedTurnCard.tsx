import { Sparkles } from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { ROLE_META, formatTurnDate } from "@/lib/turn-roles";
import { findTheme } from "@/lib/turn-themes";
import type { Profile, TurnGroup, TurnGroupMember } from "@/lib/supabase";

type Member = TurnGroupMember & { profile: Profile | null };

function initials(profile: Profile | null) {
  const value = profile?.nickname || profile?.full_name || "CJ";
  return value
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase())
    .join("");
}

export function FeaturedTurnCard({ group, members }: { group: TurnGroup; members: Member[] }) {
  const theme = findTheme(group.theme);
  const order = { churrasquero: 0, compras: 1, ayudante: 2 } as const;
  const sorted = [...members].sort((a, b) => order[a.role] - order[b.role]);

  return (
    <div className="relative overflow-hidden rounded-[28px] border-2 border-[#FF2E93] bg-[#09090C] shadow-[0_24px_60px_rgba(0,0,0,0.45),inset_0_0_30px_rgba(0,224,255,0.08)]">
      <div
        aria-hidden
        className="absolute inset-x-0 top-0 h-1 bg-gradient-to-r from-[#14A538] via-[#FFD60A] to-[#00E0FF]"
      />
      <div
        aria-hidden
        className="absolute inset-0 bg-[linear-gradient(105deg,transparent_0_17%,rgba(255,214,10,0.16)_17%_19%,transparent_19%_50%,rgba(0,224,255,0.12)_50%_52%,transparent_52%)]"
      />

      <div
        className={`relative px-5 pb-6 pt-5 ${
          theme
            ? `bg-gradient-to-br ${theme.accent}`
            : "bg-gradient-to-br from-[#FF2E93]/30 to-[#00E0FF]/20"
        }`}
      >
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
          <h3 className="chutu-display mt-1 flex items-center gap-2 text-3xl leading-tight text-[#FFD60A]">
            {theme ? (
              <>
                <span className="rounded-xl border border-[#FFD60A]/30 bg-black/35 px-2 py-1 text-sm font-black text-[#FFD60A]">
                  {theme.emoji}
                </span>
                <span>{theme.label}</span>
              </>
            ) : (
              <span>Turno del enjambre</span>
            )}
          </h3>
        </div>
      </div>

      <div className="relative grid grid-cols-2 gap-3 p-4 sm:grid-cols-[repeat(auto-fit,minmax(120px,1fr))]">
        {sorted.map((member, index) => {
          const meta = ROLE_META[member.role];
          const Icon = meta.icon;
          const ring = index % 2 === 0 ? "border-[#FFD60A]" : "border-[#00E0FF]";
          const glow =
            index % 2 === 0
              ? "shadow-[0_0_22px_rgba(255,214,10,0.45)]"
              : "shadow-[0_0_22px_rgba(0,224,255,0.45)]";
          return (
            <div
              key={member.id}
              className="group relative flex flex-col items-center rounded-2xl border border-white/10 bg-black/45 p-3 backdrop-blur-sm transition hover:-translate-y-1 hover:border-[#FF2E93]"
            >
              <div className="relative">
                <Avatar className={`h-20 w-20 border-[3px] ${ring} ${glow}`}>
                  <AvatarImage
                    src={member.profile?.avatar_url ?? undefined}
                    className="object-cover"
                  />
                  <AvatarFallback className="bg-[#0B0B1F] text-xl font-black text-[#FFD60A]">
                    {initials(member.profile)}
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
                @{member.profile?.nickname ?? "Fraterno"}
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
