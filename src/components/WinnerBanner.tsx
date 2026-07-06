import { Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { todayBoliviaISO } from "@/lib/bolivia-time";
import { supabase, type Profile, type TurnGroup, type TurnGroupMember } from "@/lib/supabase";
import { ROLE_META, formatTurnDate } from "@/lib/turn-roles";
import { findTheme } from "@/lib/turn-themes";

type GroupWithMembers = TurnGroup & {
  members: Array<TurnGroupMember & { profile: Profile | null }>;
};

export function WinnerBanner() {
  const [group, setGroup] = useState<GroupWithMembers | null>(null);

  useEffect(() => {
    let ignore = false;

    async function loadNextTurn() {
      const { data: gData } = await supabase
        .from("turn_groups")
        .select("*")
        .eq("archived", false)
        .gte("turn_date", todayBoliviaISO())
        .order("turn_date", { ascending: true })
        .limit(1);

      const next = (gData as TurnGroup[] | null)?.[0];
      if (!next || ignore) return;

      const { data: members } = await supabase
        .from("turn_group_members")
        .select("*")
        .eq("group_id", next.id);

      const memberRows = (members as TurnGroupMember[]) ?? [];
      const ids = memberRows.map((m) => m.profile_id);
      const { data: profiles } = await supabase
        .from("profiles")
        .select("*")
        .in("id", ids.length ? ids : ["00000000-0000-0000-0000-000000000000"]);

      if (ignore) return;

      const profList = (profiles as Profile[]) ?? [];
      setGroup({
        ...next,
        members: memberRows.map((m) => ({
          ...m,
          profile: profList.find((p) => p.id === m.profile_id) ?? null,
        })),
      });
    }

    loadNextTurn();

    return () => {
      ignore = true;
    };
  }, []);

  if (!group) return null;

  const theme = findTheme(group.theme);

  return (
    <section className="px-4 pt-5">
      <div
        className="relative rounded-2xl border border-[#FF2E93]/40 bg-[#1A1A3A] p-4"
        style={{ boxShadow: "inset 0 0 25px rgba(255,46,147,0.15), 0 0 30px rgba(255,46,147,0.1)" }}
      >
        <div className="mb-3 flex items-center justify-between gap-2">
          <h2 className="flex min-w-0 items-center gap-2 text-[11px] font-black uppercase italic tracking-wider text-white">
            <span
              className="h-2 w-2 shrink-0 rounded-full bg-[#FFD60A]"
              style={{ boxShadow: "0 0 8px #FFD60A" }}
            />
            <span className="truncate">Proximo turno - {formatTurnDate(group.turn_date)}</span>
          </h2>
          <Link
            to="/calendario"
            className="shrink-0 rounded-full border border-[#FFD60A]/40 bg-[#FFD60A]/10 px-2.5 py-1 text-[10px] font-black uppercase tracking-wider text-[#FFD60A]"
          >
            Ver rol
          </Link>
        </div>

        {theme && (
          <p className="mb-3 truncate text-[11px] font-black uppercase tracking-widest text-[#00E0FF]">
            {theme.emoji} {theme.label}
          </p>
        )}

        <div className="grid grid-cols-4 gap-3">
          {group.members.map((m) => {
            const meta = ROLE_META[m.role];
            return (
              <div key={m.id} className="flex flex-col items-center gap-1 text-center">
                <div
                  className="rounded-full border-2 border-[#FFD60A] p-0.5"
                  style={{ boxShadow: "0 0 10px rgba(255,214,10,0.35)" }}
                >
                  <Avatar className="h-12 w-12">
                    <AvatarImage src={m.profile?.avatar_url ?? undefined} className="object-cover" />
                    <AvatarFallback className="bg-[#0B0B1F] text-xs font-black text-[#FFD60A]">
                      CJ
                    </AvatarFallback>
                  </Avatar>
                </div>
                <p className="w-full truncate text-[9px] font-black uppercase tracking-wider text-[#FFD60A]">
                  {meta.emoji} {meta.label}
                </p>
                <p className="w-full truncate text-[9px] text-white/70">@{m.profile?.nickname ?? "?"}</p>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}
