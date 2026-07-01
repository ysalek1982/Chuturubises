import { useEffect, useState } from "react";
import { WandSparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { formatBoliviaDateTime, fromBoliviaDateTimeInput, toBoliviaDateTimeInput } from "@/lib/bolivia-time";
import { askGeminiForMatchResult } from "@/lib/gemini-world-cup";
import { supabase, type WorldCupMatch } from "@/lib/supabase";
import { toast } from "sonner";

type Draft = Partial<WorldCupMatch> & {
  kickoff_at?: string;
  home_score?: number | null;
  away_score?: number | null;
};

const emptyDraft: Draft = {
  code: "",
  stage: "Octavos de final",
  home_team: "",
  away_team: "",
  venue: "",
  kickoff_at: "",
  status: "scheduled",
  home_score: null,
  away_score: null,
};

export function WorldCupTab() {
  const [matches, setMatches] = useState<WorldCupMatch[]>([]);
  const [drafts, setDrafts] = useState<Record<string, Draft>>({});
  const [newMatch, setNewMatch] = useState<Draft>(emptyDraft);
  const [geminiKey, setGeminiKey] = useState("");
  const [aiBusyId, setAiBusyId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  const load = async () => {
    setLoading(true);
    const [{ data, error }, { data: setting }] = await Promise.all([
      supabase.from("world_cup_matches").select("*").order("kickoff_at", { ascending: true }),
      supabase.from("fraternity_settings").select("value").eq("key", "gemini_api_key").maybeSingle(),
    ]);
    setLoading(false);
    if (error) return toast.error("Activa las tablas de Penca Mundialista en Supabase");
    if (typeof setting?.value === "string") setGeminiKey(setting.value);
    const list = (data as WorldCupMatch[]) ?? [];
    setMatches(list);
    setDrafts(
      Object.fromEntries(
        list.map((m) => [
          m.id,
          {
            ...m,
            kickoff_at: toBoliviaDateTimeInput(m.kickoff_at),
          },
        ]),
      ),
    );
  };

  useEffect(() => {
    load();
  }, []);

  const updateDraft = (id: string, patch: Draft) => {
    setDrafts((prev) => ({ ...prev, [id]: { ...prev[id], ...patch } }));
  };

  const save = async (id: string) => {
    const draft = drafts[id];
    if (!draft?.home_team || !draft.away_team || !draft.kickoff_at) {
      toast.error("Completa equipos y horario");
      return;
    }
    const status =
      typeof draft.home_score === "number" && typeof draft.away_score === "number" ? "final" : "scheduled";
    const { error } = await supabase
      .from("world_cup_matches")
      .update({
        code: draft.code,
        stage: draft.stage,
        home_team: draft.home_team,
        away_team: draft.away_team,
        venue: draft.venue || null,
        kickoff_at: fromBoliviaDateTimeInput(draft.kickoff_at),
        status,
        home_score: draft.home_score,
        away_score: draft.away_score,
        updated_at: new Date().toISOString(),
      })
      .eq("id", id);
    if (error) toast.error(error.message);
    else {
      toast.success(status === "final" ? "Resultado guardado. IA recalculada." : "Partido guardado");
      load();
    }
  };

  const create = async () => {
    if (!newMatch.code || !newMatch.home_team || !newMatch.away_team || !newMatch.kickoff_at) {
      toast.error("Completa codigo, equipos y horario");
      return;
    }
    const { error } = await supabase.from("world_cup_matches").insert({
      code: newMatch.code,
      stage: newMatch.stage,
      home_team: newMatch.home_team,
      away_team: newMatch.away_team,
      venue: newMatch.venue || null,
      kickoff_at: fromBoliviaDateTimeInput(newMatch.kickoff_at),
      status: "scheduled",
    });
    if (error) toast.error(error.message);
    else {
      toast.success("Partido creado");
      setNewMatch(emptyDraft);
      load();
    }
  };

  const saveGeminiKey = async () => {
    const clean = geminiKey.trim();
    if (!clean) return toast.error("Ingresa la API key de Gemini");
    const { error } = await supabase.from("fraternity_settings").upsert({
      key: "gemini_api_key",
      value: clean,
      updated_at: new Date().toISOString(),
    });
    if (error) toast.error(error.message);
    else toast.success("API key de Gemini guardada");
  };

  const applyGeminiResult = async (match: WorldCupMatch) => {
    const clean = geminiKey.trim();
    if (!clean) return toast.error("Primero guarda una API key de Gemini");
    setAiBusyId(match.id);
    try {
      const result = await askGeminiForMatchResult(clean, match);
      if (result.status !== "final" || result.home_score === null || result.away_score === null) {
        toast.info(result.summary || "Gemini no encontro resultado final aun");
        return;
      }
      const { error } = await supabase
        .from("world_cup_matches")
        .update({
          status: "final",
          home_score: result.home_score,
          away_score: result.away_score,
          updated_at: new Date().toISOString(),
        })
        .eq("id", match.id);
      if (error) throw error;
      toast.success(`IA Gemini guardo ${match.home_team} ${result.home_score}-${result.away_score} ${match.away_team}`);
      await load();
    } catch (err: any) {
      toast.error(err?.message ?? "Gemini no pudo revisar el partido");
    } finally {
      setAiBusyId(null);
    }
  };

  return (
    <div className="space-y-4">
      <section className="rounded-xl border border-cyan-300/25 bg-cyan-300/10 p-3">
        <p className="flex items-center gap-2 text-xs font-black uppercase tracking-widest text-cyan-200">
          <WandSparkles className="h-4 w-4" /> IA de puntos
        </p>
        <p className="mt-1 text-sm font-semibold text-neutral-100">
          Carga los resultados finales y la IA Chutu calcula la tabla: 3 puntos exacto, 1 punto ganador/empate.
        </p>
        <p className="mt-2 text-[11px] leading-relaxed text-neutral-300">
          Los octavos confirmados ya tienen equipos reales. Si agregas un cruce pendiente, Gemini usara el numero FIFA del partido, sede y fecha para encontrar el marcador.
        </p>
      </section>

      <section className="rounded-xl border border-[#FF2E93]/30 bg-[#FF2E93]/10 p-3">
        <p className="mb-2 text-xs font-black uppercase tracking-widest text-[#FF8AC2]">Agente Gemini</p>
        <div className="space-y-1">
          <Label className="text-[11px] text-yellow-300">API key</Label>
          <Input
            type="password"
            value={geminiKey}
            onChange={(e) => setGeminiKey(e.target.value)}
            placeholder="AIza..."
            className="chutu-input"
          />
        </div>
        <Button onClick={saveGeminiKey} className="chutu-primary mt-3 h-10 w-full rounded-xl text-xs font-black uppercase tracking-widest">
          Guardar agente IA
        </Button>
        <p className="mt-2 text-[11px] leading-relaxed text-neutral-400">
          Gemini consulta resultados con busqueda web y la app suma puntos automaticamente.
        </p>
      </section>

      <section className="rounded-xl border border-yellow-400/30 bg-neutral-950 p-3">
        <p className="mb-3 text-xs font-black uppercase tracking-widest text-yellow-300">Nuevo partido</p>
        <MatchFields draft={newMatch} onChange={(patch) => setNewMatch((prev) => ({ ...prev, ...patch }))} />
        <Button onClick={create} className="chutu-primary mt-3 h-10 w-full rounded-xl text-xs font-black uppercase tracking-widest">
          Crear partido
        </Button>
      </section>

      {loading ? (
        <p className="text-sm text-neutral-500">Cargando...</p>
      ) : (
        <div className="space-y-3">
          {matches.map((match) => (
            <section key={match.id} className="rounded-xl border border-neutral-800 bg-neutral-950 p-3">
              <div className="mb-3">
                <p className="text-base font-black text-white">
                  {match.home_team} vs {match.away_team}
                </p>
                <p className="mt-1 text-[11px] font-bold uppercase tracking-widest text-yellow-300">{match.stage}</p>
                <p className="mt-1 text-xs font-semibold text-neutral-300">{formatBoliviaDateTime(match.kickoff_at)}</p>
              </div>
              <MatchFields draft={drafts[match.id] ?? {}} onChange={(patch) => updateDraft(match.id, patch)} withResult showCode={false} />
              <div className="mt-3 grid grid-cols-2 gap-2">
                <Button onClick={() => save(match.id)} className="chutu-primary h-10 rounded-xl text-xs font-black uppercase tracking-widest">
                  Guardar
                </Button>
                <Button
                  onClick={() => applyGeminiResult(match)}
                  disabled={aiBusyId === match.id}
                  variant="outline"
                  className="chutu-outline h-10 rounded-xl text-xs font-black uppercase tracking-widest"
                >
                  {aiBusyId === match.id ? "Revisando" : "IA Gemini"}
                </Button>
              </div>
            </section>
          ))}
        </div>
      )}
    </div>
  );
}

function MatchFields({
  draft,
  onChange,
  withResult = false,
  showCode = true,
}: {
  draft: Draft;
  onChange: (patch: Draft) => void;
  withResult?: boolean;
  showCode?: boolean;
}) {
  return (
    <div className="space-y-2">
      {showCode ? (
        <div className="grid grid-cols-2 gap-2">
          <Field label="Codigo FIFA interno" value={draft.code ?? ""} onChange={(code) => onChange({ code })} />
          <Field label="Fecha/hora Bolivia (UTC-4)" type="datetime-local" value={draft.kickoff_at ?? ""} onChange={(kickoff_at) => onChange({ kickoff_at })} />
        </div>
      ) : (
        <Field label="Fecha/hora Bolivia (UTC-4)" type="datetime-local" value={draft.kickoff_at ?? ""} onChange={(kickoff_at) => onChange({ kickoff_at })} />
      )}
      <div className="grid grid-cols-2 gap-2">
        <Field label="Local" value={draft.home_team ?? ""} onChange={(home_team) => onChange({ home_team })} />
        <Field label="Visitante" value={draft.away_team ?? ""} onChange={(away_team) => onChange({ away_team })} />
      </div>
      <Field label="Sede" value={draft.venue ?? ""} onChange={(venue) => onChange({ venue })} />
      {withResult && (
        <div className="grid grid-cols-2 gap-2">
          <Field
            label="Goles local"
            type="number"
            value={draft.home_score ?? ""}
            onChange={(v) => onChange({ home_score: v === "" ? null : Number(v) })}
          />
          <Field
            label="Goles visitante"
            type="number"
            value={draft.away_score ?? ""}
            onChange={(v) => onChange({ away_score: v === "" ? null : Number(v) })}
          />
        </div>
      )}
    </div>
  );
}

function Field({
  label,
  value,
  onChange,
  type = "text",
}: {
  label: string;
  value: string | number;
  onChange: (value: string) => void;
  type?: string;
}) {
  return (
    <div className="space-y-1">
      <Label className="text-[11px] text-yellow-300">{label}</Label>
      <Input type={type} value={value} onChange={(e) => onChange(e.target.value)} className="chutu-input" />
    </div>
  );
}
