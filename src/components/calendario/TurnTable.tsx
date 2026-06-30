import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { ROLE_META, formatTurnDate } from "@/lib/turn-roles";
import { findTheme } from "@/lib/turn-themes";
import { Star, MessageSquare } from "lucide-react";
import type {
  Profile,
  TurnGroup,
  TurnGroupMember,
  TurnRating,
  TurnRatingStat,
} from "@/lib/supabase";
import { StarsRow } from "./StarsRow";

export type GroupView = TurnGroup & {
  members: Array<TurnGroupMember & { profile: Profile | null }>;
};

type Props = {
  group: GroupView;
  userId: string | null;
  highlight?: boolean;
  compact?: boolean;
  isPast: boolean;
  stat?: TurnRatingStat;
  myRating?: TurnRating;
  onRate: () => void;
};

export function TurnTable({
  group,
  userId,
  highlight,
  compact,
  isPast,
  stat,
  myRating,
  onRate,
}: Props) {
  const theme = findTheme(group.theme);
  const meIn = group.members.find((m) => m.profile_id === userId);
  const wasInGroup = !!meIn;

  return (
    <div
      className={`relative overflow-hidden rounded-2xl border bg-[#0B0B1F] shadow-[0_8px_30px_rgba(0,0,0,0.6)] ${
        highlight
          ? "border-[#FF2E93] shadow-[0_0_30px_rgba(255,46,147,0.4)]"
          : isPast
            ? "border-white/5"
            : "border-[#00E0FF]/40"
      }`}
    >
      <div
        className={`relative px-4 py-3 ${
          theme
            ? `bg-gradient-to-r ${theme.accent}`
            : "bg-gradient-to-r from-[#FF2E93]/25 via-[#00E0FF]/15 to-transparent"
        }`}
      >
        <div className="flex items-center justify-between gap-2">
          <div className="min-w-0">
            <p className="text-[10px] font-black uppercase tracking-[0.3em] text-[#00E0FF]">
              {formatTurnDate(group.turn_date)}
            </p>
            <p className="mt-0.5 truncate text-2xl text-white [font-family:'Bangers',system-ui] [letter-spacing:0.06em] [text-shadow:0_2px_0_#FF2E93]">
              {theme ? (
                <>
                  <span className="mr-2 text-2xl">{theme.emoji}</span>
                  {theme.label}
                </>
              ) : (
                <span>Turno del enjambre 🐝</span>
              )}
            </p>
          </div>
          <div className="flex shrink-0 flex-col items-end gap-1.5">
            <span className="rounded-full border border-[#FFD60A]/50 bg-black/50 px-2 py-0.5 text-[10px] font-bold text-[#FFD60A]">
              Ciclo #{group.cycle}
            </span>
            {isPast && stat && <StarsRow value={stat.avg_rating} count={stat.rating_count} />}
          </div>
        </div>
      </div>

      {meIn && (
        <div
          className={`flex items-center gap-2 border-y border-[#FFD60A]/30 bg-[#FFD60A]/5 px-4 py-2 text-[11px] font-bold ${ROLE_META[meIn.role].color}`}
        >
          <span className="text-base">{ROLE_META[meIn.role].emoji}</span>
          Te toca como <span className="uppercase">{ROLE_META[meIn.role].label}</span>
        </div>
      )}

      <div className="divide-y divide-white/5">
        {group.members.map((m, i) => {
          const meta = ROLE_META[m.role];
          const isMe = m.profile_id === userId;
          const ring = i % 2 === 0 ? "border-[#FFD60A]" : "border-[#00E0FF]";
          return (
            <div
              key={m.id}
              className={`flex items-center gap-3 px-4 ${compact ? "py-2" : "py-3"} ${isMe ? "bg-[#FF2E93]/10" : ""}`}
            >
              <Avatar
                className={`${compact ? "h-9 w-9" : "h-12 w-12"} border-2 ${ring} shadow-[0_0_12px_rgba(255,214,10,0.35)]`}
              >
                <AvatarImage src={m.profile?.avatar_url ?? undefined} className="object-cover" />
                <AvatarFallback className="bg-[#0B0B1F] text-[#FFD60A]">🐝</AvatarFallback>
              </Avatar>
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-black text-white">
                  @{m.profile?.nickname ?? "?"}
                </p>
                {!compact && m.profile?.full_name && (
                  <p className="truncate text-[11px] text-white/50">{m.profile.full_name}</p>
                )}
              </div>
              <div
                className={`flex items-center gap-1.5 rounded-md border px-2 py-1 text-[10px] font-black uppercase tracking-wider ${meta.color}`}
              >
                <meta.icon className="h-3.5 w-3.5" />
                <span>{meta.label}</span>
              </div>
            </div>
          );
        })}
      </div>

      {isPast && (
        <div className="flex items-center justify-between gap-2 border-t border-white/5 bg-black/50 px-4 py-2.5">
          <span className="flex items-center gap-1.5 text-[10px] uppercase tracking-widest text-white/50">
            <MessageSquare className="h-3 w-3" />
            {stat ? `${stat.rating_count} voto${stat.rating_count === 1 ? "" : "s"}` : "Sin votos"}
          </span>
          {wasInGroup ? (
            <span className="text-[10px] italic text-white/40">No puedes calificar tu propio junte</span>
          ) : myRating ? (
            <span className="flex items-center gap-1 text-[11px] font-bold text-[#FFD60A]">
              <Star className="h-3.5 w-3.5 fill-[#FFD60A] text-[#FFD60A]" /> Tu voto: {myRating.rating_value}
            </span>
          ) : (
            <Button
              onClick={onRate}
              size="sm"
              className="h-8 bg-[#FFD60A] px-3 text-[11px] font-black uppercase tracking-widest text-black shadow-[0_0_18px_rgba(255,214,10,0.6)] hover:bg-[#FFE658]"
            >
              <Star className="h-3.5 w-3.5 fill-black" /> Calificar junte
            </Button>
          )}
        </div>
      )}
    </div>
  );
}
