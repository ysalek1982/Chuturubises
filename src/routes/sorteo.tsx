import { createFileRoute, Link } from "@tanstack/react-router";
import { Trophy } from "lucide-react";
import { useEffect, useState } from "react";
import {
  supabase,
  type Profile,
  type TurnGroup,
  type TurnGroupMember,
} from "@/lib/supabase";
import { AppShell } from "@/components/AppShell";
import { PageHeader } from "@/components/PageHeader";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/lib/auth";
import { toast } from "sonner";
import { RotateCcw } from "lucide-react";
import {
  SorteoBatchOverlay,
  type BatchGroup,
} from "@/components/SorteoBatchOverlay";
import { markSelfSorteo } from "@/lib/sorteo-self";
import {
  shuffle,
  chunkWithRemainder,
  assignGroupRoles,
  pickDistinctThemes,
  addDaysISO,
} from "@/lib/turn-sorteo";
import { loadAwardsSettings } from "@/lib/awards";
import { SorteoTombola } from "@/components/sorteo/SorteoTombola";
import { SorteoSpinButton } from "@/components/sorteo/SorteoSpinButton";
import { SorteoConfigCard } from "@/components/sorteo/SorteoConfigCard";
import { SorteoProgressCard } from "@/components/sorteo/SorteoProgressCard";
import { SorteoViewerNotice } from "@/components/sorteo/SorteoViewerNotice";

export const Route = createFileRoute("/sorteo")({
  ssr: false,
  head: () => ({ meta: [{ title: "Sorteo · Chuturubises Jrs." }] }),
  component: SorteoPage,
});

type GroupWithMembers = TurnGroup & { members: TurnGroupMember[] };

function todayISO(): string {
  const d = new Date();
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  const dd = String(d.getDate()).padStart(2, "0");
  return `${d.getFullYear()}-${mm}-${dd}`;
}

function SorteoPage() {
  const { isAdmin } = useAuth();
  const [profiles, setProfiles] = useState<Profile[]>([]);
  const [groups, setGroups] = useState<GroupWithMembers[]>([]);
  const [freqWeeks, setFreqWeeks] = useState<number>(2);
  const [nextDate, setNextDate] = useState<string>(todayISO());
  const [awardsOpen, setAwardsOpen] = useState(false);

  const [batchOpen, setBatchOpen] = useState(false);
  const [batchGroups, setBatchGroups] = useState<BatchGroup[] | null>(null);
  const [spinning, setSpinning] = useState(false);

  const load = async () => {
    const [{ data: pData }, { data: gData }, { data: mData }, { data: settings }] = await Promise.all([
      supabase.from("profiles").select("*").neq("approval_status", "rejected"),
      supabase.from("turn_groups").select("*").order("turn_date", { ascending: false }),
      supabase.from("turn_group_members").select("*"),
      supabase
        .from("fraternity_settings")
        .select("key,value")
        .in("key", ["turn_frequency_weeks", "next_turn_date"]),
    ]);
    setProfiles((pData as Profile[]) ?? []);
    const allGroups = (gData as TurnGroup[]) ?? [];
    const allMembers = (mData as TurnGroupMember[]) ?? [];
    setGroups(
      allGroups.map((g) => ({ ...g, members: allMembers.filter((m) => m.group_id === g.id) })),
    );
    const s = Object.fromEntries(
      ((settings ?? []) as Array<{ key: string; value: string }>).map((r) => [r.key, r.value]),
    );
    if (s.turn_frequency_weeks) setFreqWeeks(Number(s.turn_frequency_weeks));
    if (s.next_turn_date) setNextDate(s.next_turn_date);
  };

  useEffect(() => {
    load();
    loadAwardsSettings().then((s) => setAwardsOpen(s.isOpen));
  }, []);

  const activeGroups = groups.filter((g) => !g.archived);
  const currentCycle = activeGroups[0]?.cycle ?? 1;
  const drawnIds = new Set<string>(
    activeGroups
      .filter((g) => g.cycle === currentCycle)
      .flatMap((g) => g.members.map((m) => m.profile_id)),
  );
  const eligible = profiles.filter((p) => !drawnIds.has(p.id));

  const computeBaseDate = (): string => {
    const last = activeGroups[0]?.turn_date;
    if (last) return addDaysISO(last, freqWeeks * 7);
    return nextDate;
  };

  const spin = async () => {
    if (!isAdmin) return toast.error("Solo administradores pueden lanzar el sorteo");
    const previewable = chunkWithRemainder(eligible, 4).length;
    if (previewable === 0)
      return toast.error(
        `No se puede armar ningún grupo con ${eligible.length} fraterno(s) restantes. Reinicia el ciclo.`,
      );

    const shuffled = shuffle(eligible);
    const chunks = chunkWithRemainder(shuffled, 4);
    const themes = pickDistinctThemes(chunks.length);
    const baseDate = computeBaseDate();
    const weekStepDays = freqWeeks * 7;

    const batch: BatchGroup[] = chunks.map((groupMembers, idx) => {
      const turn_date = addDaysISO(baseDate, idx * weekStepDays);
      const assigned = assignGroupRoles(groupMembers);
      return { turn_date, theme: themes[idx] ?? null, members: assigned };
    });

    setBatchGroups(batch);
    setBatchOpen(true);
    setSpinning(true);

    const { data: insertedGroups, error: gErr } = await supabase
      .from("turn_groups")
      .insert(
        batch.map((b) => ({
          turn_date: b.turn_date,
          cycle: currentCycle,
          theme: b.theme?.id ?? null,
        })),
      )
      .select();
    if (gErr || !insertedGroups) {
      toast.error(gErr?.message ?? "No se pudieron crear los grupos");
      setSpinning(false);
      return;
    }

    const byDate = new Map<string, TurnGroup>();
    (insertedGroups as TurnGroup[]).forEach((g) => byDate.set(g.turn_date, g));

    const memberInserts: Array<{ group_id: string; profile_id: string; role: string }> = [];
    batch.forEach((b) => {
      const inserted = byDate.get(b.turn_date);
      if (!inserted) return;
      markSelfSorteo(inserted.id);
      b.id = inserted.id;
      b.members.forEach((m) => {
        memberInserts.push({
          group_id: inserted.id,
          profile_id: m.profile.id,
          role: m.role,
        });
      });
    });

    const { error: mErr } = await supabase
      .from("turn_group_members")
      .insert(memberInserts);
    if (mErr) {
      toast.error(mErr.message);
      setSpinning(false);
      return;
    }

    const lastDate = batch[batch.length - 1]!.turn_date;
    await supabase.from("fraternity_settings").upsert({
      key: "next_turn_date",
      value: addDaysISO(lastDate, weekStepDays),
      updated_at: new Date().toISOString(),
    });

    setSpinning(false);
    toast.success(`🎉 ${batch.length} turno${batch.length === 1 ? "" : "s"} sorteado${batch.length === 1 ? "" : "s"}`);
    load();
  };

  const resetCycle = async () => {
    if (!isAdmin) return;
    if (!confirm("¿Reiniciar el ciclo? Todos los fraternos volverán a estar disponibles.")) return;
    const { error } = await supabase
      .from("turn_groups")
      .update({ archived: true })
      .eq("archived", false);
    if (error) return toast.error(error.message);
    toast.success("Ciclo reiniciado. ¡Enjambre listo!");
    load();
  };

  const updateSettings = async (next: { turn_frequency_weeks?: number; next_turn_date?: string }) => {
    if (!isAdmin) return;
    const updates = Object.entries(next).map(([key, value]) => ({
      key,
      value: String(value),
      updated_at: new Date().toISOString(),
    }));
    const { error } = await supabase.from("fraternity_settings").upsert(updates);
    if (error) toast.error(error.message);
    else {
      toast.success("Configuración actualizada");
      if (next.turn_frequency_weeks) setFreqWeeks(next.turn_frequency_weeks);
      if (next.next_turn_date) setNextDate(next.next_turn_date);
    }
  };

  const previewChunks = chunkWithRemainder(eligible, 4).length;
  const tombolaMembers = eligible.length ? eligible : profiles;

  return (
    <AppShell>
      <PageHeader title="Sorteo" subtitle="Todos los turnos del ciclo de una sola vez" />

      <div className="relative px-5 pb-6">
        <div className="pointer-events-none absolute -left-10 top-10 -z-10 h-56 w-56 rounded-full bg-[#FF2E93]/25 blur-3xl" />
        <div className="pointer-events-none absolute -right-10 top-60 -z-10 h-56 w-56 rounded-full bg-[#00E0FF]/20 blur-3xl" />
        <div className="pointer-events-none absolute left-1/2 top-1/3 -z-10 h-64 w-64 -translate-x-1/2 rounded-full bg-[#FFD60A]/10 blur-3xl" />

        <SorteoTombola members={tombolaMembers} spinning={spinning} />

        {isAdmin ? (
          <>
            <SorteoSpinButton
              spinning={spinning}
              previewChunks={previewChunks}
              eligibleCount={eligible.length}
              onSpin={spin}
            />

            <Button
              onClick={resetCycle}
              variant="outline"
              className="mt-2 w-full border-[#00E0FF]/50 bg-transparent text-[#00E0FF] hover:bg-[#00E0FF]/10 hover:text-[#00E0FF]"
            >
              <RotateCcw className="h-4 w-4" /> Reiniciar ciclo
            </Button>

            <SorteoConfigCard
              freqWeeks={freqWeeks}
              nextDate={nextDate}
              onFreqChange={(w) => updateSettings({ turn_frequency_weeks: w })}
              onNextDateLocal={setNextDate}
              onNextDateCommit={(v) => updateSettings({ next_turn_date: v })}
            />
          </>
        ) : (
          <SorteoViewerNotice />
        )}

        <SorteoProgressCard
          cycle={currentCycle}
          eligibleCount={eligible.length}
          drawnCount={drawnIds.size}
          total={profiles.length}
        />

        {awardsOpen && (
          <Link
            to="/premios"
            className="mt-5 flex items-center gap-3 overflow-hidden rounded-2xl border-2 border-[#FFC400] bg-gradient-to-r from-[#1a1500] via-black to-[#1a1500] p-4 transition hover:scale-[1.01]"
            style={{ boxShadow: "0 0 25px rgba(255,196,0,0.35)" }}
          >
            <div className="grid h-12 w-12 shrink-0 place-items-center rounded-full bg-[#FFC400] text-black">
              <Trophy className="h-6 w-6" />
            </div>
            <div className="min-w-0 flex-1">
              <p
                className="text-xl font-black uppercase text-[#FFC400]"
                style={{ fontFamily: "Bangers, Impact, sans-serif", letterSpacing: "0.05em" }}
              >
                Premios Chuturubises
              </p>
              <p className="text-[11px] text-neutral-300">Vota y revela a los ganadores de la gala 🏆</p>
            </div>
            <span className="text-2xl">🐝</span>
          </Link>
        )}
      </div>

      {batchOpen && batchGroups && (
        <SorteoBatchOverlay
          groups={batchGroups}
          onClose={() => {
            setBatchOpen(false);
            setBatchGroups(null);
          }}
        />
      )}
    </AppShell>
  );
}
