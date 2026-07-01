import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { Trophy, WandSparkles } from "lucide-react";
import { AppShell } from "@/components/AppShell";
import { PageHeader } from "@/components/PageHeader";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useAuth } from "@/lib/auth";
import { formatBoliviaDateTime } from "@/lib/bolivia-time";
import { buildLeaderboard, scorePrediction } from "@/lib/world-cup-penca";
import { ensureWorldCupMatchesSeeded } from "@/lib/world-cup-seed";
import { supabase, type Profile, type WorldCupMatch, type WorldCupPrediction } from "@/lib/supabase";
import { toast } from "sonner";

export const Route = createFileRoute("/penca")({
  ssr: false,
  head: () => ({ meta: [{ title: "Penca Mundialista · Chuturubises Jrs." }] }),
  component: PencaPage,
});

type Draft = Record<string, { home: string; away: string }>;

function PencaPage() {
  const { profile, isAdmin } = useAuth();
  const [matches, setMatches] = useState<WorldCupMatch[]>([]);
  const [predictions, setPredictions] = useState<WorldCupPrediction[]>([]);
  const [profiles, setProfiles] = useState<Profile[]>([]);
  const [draft, setDraft] = useState<Draft>({});
  const [loading, setLoading] = useState(true);

  const load = async () => {
    setLoading(true);
    const [{ data: mData, error: mErr }, { data: pData }, { data: profilesData }] = await Promise.all([
      supabase.from("world_cup_matches").select("*").order("kickoff_at", { ascending: true }),
      supabase.from("world_cup_predictions").select("*"),
      supabase.from("profiles").select("*").neq("approval_status", "rejected"),
    ]);
    setLoading(false);
    if (mErr) {
      toast.error("Falta activar la Penca Mundialista en Supabase");
      return;
    }
    let nextMatches = (mData as WorldCupMatch[]) ?? [];
    if (!nextMatches.length && isAdmin) {
      try {
        const result = await ensureWorldCupMatchesSeeded();
        if (result.seeded) toast.success("Penca publicada para los fraternos");
        const { data: seededMatches } = await supabase.from("world_cup_matches").select("*").order("kickoff_at", { ascending: true });
        nextMatches = (seededMatches as WorldCupMatch[]) ?? [];
      } catch {
        toast.error("No se pudo publicar la Penca. Revisa permisos de Supabase.");
      }
    }
    const nextPredictions = (pData as WorldCupPrediction[]) ?? [];
    setMatches(nextMatches);
    setPredictions(nextPredictions);
    setProfiles((profilesData as Profile[]) ?? []);
    if (profile) {
      const mine = Object.fromEntries(
        nextPredictions
          .filter((p) => p.profile_id === profile.id)
          .map((p) => [p.match_id, { home: String(p.home_score), away: String(p.away_score) }]),
      );
      setDraft(mine);
    }
  };

  useEffect(() => {
    load();
  }, [profile?.id]);

  const leaderboard = useMemo(() => buildLeaderboard(profiles, matches, predictions), [profiles, matches, predictions]);
  const myPredictions = predictions.filter((p) => p.profile_id === profile?.id);

  const savePrediction = async (match: WorldCupMatch) => {
    if (!profile) return;
    if (new Date(match.kickoff_at).getTime() <= Date.now()) {
      toast.error("Este partido ya esta cerrado para predicciones");
      return;
    }
    const next = draft[match.id];
    const home = Number(next?.home);
    const away = Number(next?.away);
    if (!Number.isInteger(home) || !Number.isInteger(away) || home < 0 || away < 0) {
      toast.error("Ingresa goles validos");
      return;
    }
    const { error } = await supabase.from("world_cup_predictions").upsert(
      {
        match_id: match.id,
        profile_id: profile.id,
        home_score: home,
        away_score: away,
        updated_at: new Date().toISOString(),
      },
      { onConflict: "match_id,profile_id" },
    );
    if (error) toast.error(error.message);
    else {
      toast.success("Prediccion guardada");
      load();
    }
  };

  return (
    <AppShell>
      <PageHeader title="Penca" subtitle="Mundial Chuturubises" />
      <div className="space-y-4 px-4 py-4">
        <section className="chutu-carnival-card rounded-[1.65rem] p-4">
          <div className="relative">
            <span className="chutu-ribbon rounded-full px-3 py-1 text-[10px] font-black uppercase tracking-[0.22em]">
              Octavos de final
            </span>
            <h2 className="chutu-display mt-3 text-4xl leading-none text-[#FFD60A]">Penca Mundialista</h2>
            <p className="mt-2 text-sm leading-relaxed text-neutral-200">
              Predice los octavos confirmados con equipos clasificados. La IA Chutu suma 3 puntos por marcador exacto y 1 por acertar ganador o empate.
            </p>
          </div>
        </section>

        <section className="chutu-panel rounded-[1.35rem] p-4">
          <div className="mb-3 flex items-center gap-2">
            <WandSparkles className="h-4 w-4 text-[#00E0FF]" />
            <p className="chutu-eyebrow text-[#00E0FF]">Predicciones</p>
          </div>
          {loading ? (
            <p className="text-sm text-neutral-400">Cargando partidos...</p>
          ) : !matches.length ? (
            <p className="text-sm text-neutral-400">Aun no hay partidos cargados.</p>
          ) : (
            <div className="space-y-3">
              {matches.map((match) => {
                const mine = myPredictions.find((p) => p.match_id === match.id);
                const locked = new Date(match.kickoff_at).getTime() <= Date.now();
                const points = scorePrediction(match, mine);
                return (
                  <div key={match.id} className="rounded-xl border border-white/10 bg-black/30 p-3">
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <p className="text-[10px] font-black uppercase tracking-widest text-yellow-300">{match.stage}</p>
                        <p className="mt-1 text-sm font-black text-white">
                          {match.home_team} vs {match.away_team}
                        </p>
                        <p className="text-[11px] text-neutral-400">
                          {formatBoliviaDateTime(match.kickoff_at)}
                        </p>
                      </div>
                      {match.status === "final" && (
                        <span className="rounded-full bg-green-400/15 px-2 py-1 text-[10px] font-black text-green-200">
                          {points} pts
                        </span>
                      )}
                    </div>
                    <div className="mt-3 grid grid-cols-[1fr_auto_1fr] items-center gap-2">
                      <Input
                        type="number"
                        min={0}
                        disabled={locked}
                        value={draft[match.id]?.home ?? ""}
                        onChange={(e) => setDraft((d) => ({ ...d, [match.id]: { home: e.target.value, away: d[match.id]?.away ?? "" } }))}
                        className="chutu-input text-center"
                      />
                      <span className="text-xs font-black text-neutral-500">-</span>
                      <Input
                        type="number"
                        min={0}
                        disabled={locked}
                        value={draft[match.id]?.away ?? ""}
                        onChange={(e) => setDraft((d) => ({ ...d, [match.id]: { home: d[match.id]?.home ?? "", away: e.target.value } }))}
                        className="chutu-input text-center"
                      />
                    </div>
                    <Button
                      onClick={() => savePrediction(match)}
                      disabled={locked}
                      className="chutu-primary mt-3 h-10 w-full rounded-xl text-xs font-black uppercase tracking-widest"
                    >
                      {locked ? "Cerrado" : mine ? "Actualizar" : "Guardar"}
                    </Button>
                  </div>
                );
              })}
            </div>
          )}
        </section>

        <section className="chutu-panel rounded-[1.35rem] p-4">
          <div className="mb-3 flex items-center gap-2">
            <Trophy className="h-4 w-4 text-[#FFD60A]" />
            <p className="chutu-eyebrow text-[#FFD60A]">Tabla de puntos</p>
          </div>
          <ol className="space-y-2">
            {leaderboard.slice(0, 12).map((row, index) => (
              <li key={row.profile.id} className="flex items-center justify-between rounded-xl border border-white/10 bg-white/[0.035] px-3 py-2">
                <div className="min-w-0">
                  <p className="truncate text-sm font-black text-white">
                    {index + 1}. @{row.profile.nickname}
                  </p>
                  <p className="text-[10px] font-bold uppercase tracking-widest text-neutral-500">{row.exacts} exactos</p>
                </div>
                <span className="text-lg font-black text-[#FFD60A]">{row.total}</span>
              </li>
            ))}
          </ol>
        </section>
      </div>
    </AppShell>
  );
}
