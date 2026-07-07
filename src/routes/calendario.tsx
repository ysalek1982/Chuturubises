import { createFileRoute } from "@tanstack/react-router";
import { useCallback, useEffect, useState } from "react";
import {
  supabase,
  type EventItem,
  type Profile,
  type TurnGroup,
  type TurnGroupMember,
  type TurnRating,
  type TurnRatingStat,
} from "@/lib/supabase";
import { AppShell } from "@/components/AppShell";
import { PageHeader } from "@/components/PageHeader";
import { formatTurnDate } from "@/lib/turn-roles";
import { findTheme } from "@/lib/turn-themes";
import { useAuth } from "@/lib/auth";
import { RateTurnDialog } from "@/components/RateTurnDialog";
import { FeaturedTurnCard } from "@/components/FeaturedTurnCard";
import { HallOfFameDialog } from "@/components/HallOfFameDialog";
import { HallOfFameButton } from "@/components/calendario/HallOfFameButton";
import { ChuturubiCalendar } from "@/components/calendario/ChuturubiCalendar";
import { TurnTable, type GroupView } from "@/components/calendario/TurnTable";
import { todayBoliviaISO } from "@/lib/bolivia-time";

export const Route = createFileRoute("/calendario")({
  ssr: false,
  head: () => ({ meta: [{ title: "Calendario - Chuturubises Jrs." }] }),
  component: CalendarioPage,
});

function CalendarioPage() {
  const { user } = useAuth();
  const [groups, setGroups] = useState<GroupView[]>([]);
  const [profiles, setProfiles] = useState<Profile[]>([]);
  const [events, setEvents] = useState<EventItem[]>([]);
  const [stats, setStats] = useState<Record<string, TurnRatingStat>>({});
  const [myRatings, setMyRatings] = useState<Record<string, TurnRating>>({});
  const [loading, setLoading] = useState(true);
  const [rateTarget, setRateTarget] = useState<GroupView | null>(null);
  const [hofOpen, setHofOpen] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    const [{ data: g }, { data: m }, { data: p }, { data: s }, { data: e }] = await Promise.all([
      supabase.from("turn_groups").select("*").order("turn_date", { ascending: true }),
      supabase.from("turn_group_members").select("*"),
      supabase.from("profiles").select("*"),
      supabase.from("turn_rating_stats").select("*"),
      supabase.from("events").select("*").order("date", { ascending: true }),
    ]);

    const profileRows = (p as Profile[]) ?? [];
    const members = (m as TurnGroupMember[]) ?? [];
    const merged: GroupView[] = ((g as TurnGroup[]) ?? []).map((grp) => ({
      ...grp,
      members: members
        .filter((mm) => mm.group_id === grp.id)
        .map((mm) => ({
          ...mm,
          profile: profileRows.find((pr) => pr.id === mm.profile_id) ?? null,
        })),
    }));

    setProfiles(profileRows);
    setEvents((e as EventItem[]) ?? []);
    setGroups(merged);

    const statMap: Record<string, TurnRatingStat> = {};
    ((s as TurnRatingStat[]) ?? []).forEach((st) => {
      statMap[st.turn_id] = { ...st, avg_rating: Number(st.avg_rating) };
    });
    setStats(statMap);

    if (user) {
      const { data: mine } = await supabase
        .from("turn_ratings")
        .select("*")
        .eq("profile_id", user.id);
      const mineMap: Record<string, TurnRating> = {};
      ((mine as TurnRating[]) ?? []).forEach((r) => {
        mineMap[r.turn_id] = r;
      });
      setMyRatings(mineMap);
    } else {
      setMyRatings({});
    }

    setLoading(false);
  }, [user]);

  useEffect(() => {
    load();
  }, [load]);

  const today = todayBoliviaISO();
  const upcoming = groups.filter((g) => g.turn_date >= today && !g.archived);
  const past = groups
    .filter((g) => g.turn_date < today || g.archived)
    .sort((a, b) => (a.turn_date < b.turn_date ? 1 : -1));

  return (
    <AppShell>
      <PageHeader title="Tabla de Turneros" subtitle="Rol oficial del enjambre" />
      <div className="relative px-5 pb-6">
        <div className="pointer-events-none absolute -left-10 top-20 -z-10 h-56 w-56 rounded-full bg-[#FF2E93]/20 blur-3xl" />
        <div className="pointer-events-none absolute -right-10 top-72 -z-10 h-56 w-56 rounded-full bg-[#00E0FF]/15 blur-3xl" />

        <HallOfFameButton onClick={() => setHofOpen(true)} />

        {loading ? (
          <p className="text-sm text-white/60">Cargando...</p>
        ) : (
          <>
            {groups.length === 0 ? (
              <div className="rounded-xl border border-[#FFD60A]/30 bg-[#0B0B1F] p-6 text-center text-sm text-white/70">
                Aun no hay turnos sorteados. Pidele al admin lanzar la ruleta.
              </div>
            ) : (
              <>
                <h2 className="mb-3 flex items-center gap-2 text-2xl text-[#FFD60A] [font-family:'Bangers',system-ui] [letter-spacing:0.08em] [text-shadow:0_2px_0_#FF2E93]">
                  Proximos juntes
                  <span className="h-[2px] flex-1 bg-gradient-to-r from-[#FFD60A] via-[#FF2E93] to-transparent" />
                </h2>
                {upcoming.length === 0 ? (
                  <p className="mb-6 text-sm text-white/60">Sin juntes programados.</p>
                ) : (
                  <div className="mb-8 space-y-5">
                    <FeaturedTurnCard group={upcoming[0]} members={upcoming[0].members} />
                    {upcoming.slice(1).map((g) => (
                      <TurnTable
                        key={g.id}
                        group={g}
                        userId={user?.id ?? null}
                        highlight={false}
                        isPast={false}
                        stat={stats[g.id]}
                        myRating={myRatings[g.id]}
                        onRate={() => setRateTarget(g)}
                      />
                    ))}
                  </div>
                )}

                {past.length > 0 && (
                  <>
                    <h2 className="mb-3 flex items-center gap-2 text-2xl text-[#00E0FF] [font-family:'Bangers',system-ui] [letter-spacing:0.08em] [text-shadow:0_2px_0_#FF2E93]">
                      Anteriores
                      <span className="h-[2px] flex-1 bg-gradient-to-r from-[#00E0FF] via-[#FF2E93]/40 to-transparent" />
                    </h2>
                    <div className="space-y-4">
                      {past.slice(0, 10).map((g) => (
                        <TurnTable
                          key={g.id}
                          group={g}
                          userId={user?.id ?? null}
                          compact
                          isPast
                          stat={stats[g.id]}
                          myRating={myRatings[g.id]}
                          onRate={() => setRateTarget(g)}
                        />
                      ))}
                    </div>
                  </>
                )}
              </>
            )}

            <div className="mt-8">
              <ChuturubiCalendar profiles={profiles} groups={groups} events={events} today={today} />
            </div>
          </>
        )}
      </div>

      {rateTarget && (
        <RateTurnDialog
          open={!!rateTarget}
          onOpenChange={(o) => !o && setRateTarget(null)}
          turnId={rateTarget.id}
          turnLabel={`${formatTurnDate(rateTarget.turn_date)} - ${findTheme(rateTarget.theme)?.label ?? "Junte"}`}
          onRated={load}
        />
      )}

      <HallOfFameDialog open={hofOpen} onOpenChange={setHofOpen} />
    </AppShell>
  );
}
