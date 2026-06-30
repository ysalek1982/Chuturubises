import { useEffect, useState } from "react";
import {
  supabase,
  type Profile,
  type TurnGroup,
  type TurnGroupMember,
} from "@/lib/supabase";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { X } from "lucide-react";
import { ROLE_META, formatTurnDate } from "@/lib/turn-roles";
import { findTheme } from "@/lib/turn-themes";

const DISMISS_KEY = "chutu-winner-group-dismissed";

type GroupWithMembers = TurnGroup & {
  members: Array<TurnGroupMember & { profile: Profile | null }>;
};

export function WinnerBanner() {
  const [group, setGroup] = useState<GroupWithMembers | null>(null);

  useEffect(() => {
    (async () => {
      const { data: gData } = await supabase
        .from("turn_groups")
        .select("*")
        .eq("archived", false)
        .order("created_at", { ascending: false })
        .limit(1);
      const last = (gData as TurnGroup[] | null)?.[0];
      if (!last) return;
      const dismissed = localStorage.getItem(DISMISS_KEY);
      if (dismissed === last.id) return;
      if (Date.now() - new Date(last.created_at).getTime() > 7 * 86400 * 1000) return;

      const { data: members } = await supabase
        .from("turn_group_members")
        .select("*")
        .eq("group_id", last.id);
      const memberRows = (members as TurnGroupMember[]) ?? [];
      const ids = memberRows.map((m) => m.profile_id);
      const { data: profiles } = await supabase
        .from("profiles")
        .select("*")
        .in("id", ids.length ? ids : ["00000000-0000-0000-0000-000000000000"]);
      const profList = (profiles as Profile[]) ?? [];
      setGroup({
        ...last,
        members: memberRows.map((m) => ({
          ...m,
          profile: profList.find((p) => p.id === m.profile_id) ?? null,
        })),
      });
    })();
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
            <span className="truncate">Turno asignado · {formatTurnDate(group.turn_date)}</span>
          </h2>
          <button
            onClick={() => {
              localStorage.setItem(DISMISS_KEY, group.id);
              setGroup(null);
            }}
            className="rounded-full p-1 text-white/50 hover:bg-white/10 hover:text-white"
            aria-label="Cerrar banner"
          >
            <X className="h-4 w-4" />
          </button>
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
                    <AvatarFallback className="bg-[#0B0B1F] text-[#FFD60A]">🐝</AvatarFallback>
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
