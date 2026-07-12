import { useCallback, useEffect, useMemo, useState } from "react";
import { CheckCircle2, CircleHelp, Users, XCircle } from "lucide-react";
import { toast } from "sonner";
import { supabase, type AttendanceStatus, type TurnAttendance } from "@/lib/supabase";
import { cn } from "@/lib/utils";

const OPTIONS = [
  {
    status: "going" as const,
    label: "Voy",
    icon: CheckCircle2,
    active: "border-[#A7FF3D]/60 bg-[#A7FF3D]/18 text-[#D9FF9E]",
  },
  {
    status: "maybe" as const,
    label: "Tal vez",
    icon: CircleHelp,
    active: "border-[#FFD60A]/60 bg-[#FFD60A]/16 text-[#FFE66D]",
  },
  {
    status: "not_going" as const,
    label: "No puedo",
    icon: XCircle,
    active: "border-[#FF5CAD]/60 bg-[#FF2E93]/14 text-[#FF8AC2]",
  },
];

export function TurnAttendancePulse({ turnId, profileId }: { turnId: string; profileId: string }) {
  const [rows, setRows] = useState<TurnAttendance[]>([]);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState<AttendanceStatus | null>(null);
  const [available, setAvailable] = useState(true);

  const load = useCallback(async () => {
    const { data, error } = await supabase
      .from("turn_attendance")
      .select("*")
      .eq("turn_id", turnId);

    if (error) {
      setAvailable(false);
    } else {
      setRows((data as TurnAttendance[]) ?? []);
      setAvailable(true);
    }
    setLoading(false);
  }, [turnId]);

  useEffect(() => {
    void load();

    const channel = supabase
      .channel(`turn_attendance_${turnId}`)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "turn_attendance",
          filter: `turn_id=eq.${turnId}`,
        },
        () => void load(),
      )
      .subscribe();

    return () => {
      void supabase.removeChannel(channel);
    };
  }, [load, turnId]);

  const counts = useMemo(
    () => ({
      going: rows.filter((row) => row.status === "going").length,
      maybe: rows.filter((row) => row.status === "maybe").length,
      notGoing: rows.filter((row) => row.status === "not_going").length,
    }),
    [rows],
  );
  const myStatus = rows.find((row) => row.profile_id === profileId)?.status ?? null;

  const respond = async (status: AttendanceStatus) => {
    if (busy || status === myStatus) return;
    const previous = rows;
    const existing = rows.find((row) => row.profile_id === profileId);
    const optimistic: TurnAttendance = {
      id: existing?.id ?? `local-${profileId}`,
      turn_id: turnId,
      profile_id: profileId,
      status,
      updated_at: new Date().toISOString(),
    };

    setBusy(status);
    setRows((current) => [...current.filter((row) => row.profile_id !== profileId), optimistic]);

    const { error } = await supabase.from("turn_attendance").upsert(
      {
        turn_id: turnId,
        profile_id: profileId,
        status,
        updated_at: new Date().toISOString(),
      },
      { onConflict: "turn_id,profile_id" },
    );

    if (error) {
      setRows(previous);
      toast.error("No pudimos guardar tu asistencia");
    } else {
      toast.success(status === "going" ? "Asistencia confirmada" : "Respuesta actualizada");
    }
    setBusy(null);
  };

  if (!available) return null;

  return (
    <div className="relative mt-4 rounded-2xl border border-[#00E0FF]/25 bg-black/30 p-3">
      <div className="flex items-center justify-between gap-3">
        <div>
          <p className="flex items-center gap-1.5 text-[10px] font-black uppercase tracking-[0.2em] text-[#00E0FF]">
            <Users className="h-3.5 w-3.5" /> Asistencia al junte
          </p>
          <p className="mt-1 text-xs font-bold text-white/60">
            {loading
              ? "Contando al enjambre..."
              : `${counts.going} confirmado${counts.going === 1 ? "" : "s"} · ${counts.maybe} tal vez`}
          </p>
        </div>
        {!loading && counts.going > 0 && (
          <span className="grid h-10 min-w-10 place-items-center rounded-xl border border-[#A7FF3D]/35 bg-[#A7FF3D]/10 px-2 text-sm font-black text-[#D9FF9E]">
            {counts.going}
          </span>
        )}
      </div>

      <div className="mt-3 grid grid-cols-3 gap-1.5" role="group" aria-label="Confirmar asistencia">
        {OPTIONS.map(({ status, label, icon: Icon, active }) => {
          const selected = myStatus === status;
          return (
            <button
              key={status}
              type="button"
              aria-pressed={selected}
              disabled={loading || busy !== null}
              onClick={() => void respond(status)}
              className={cn(
                "flex min-h-12 items-center justify-center gap-1.5 rounded-xl border px-2 text-[10px] font-black uppercase tracking-wide transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#FFD60A] disabled:opacity-55",
                selected
                  ? active
                  : "border-white/10 bg-white/[0.035] text-white/55 hover:border-white/25 hover:text-white",
              )}
            >
              <Icon className="h-3.5 w-3.5 shrink-0" />
              <span>{busy === status ? "Guardando" : label}</span>
            </button>
          );
        })}
      </div>
    </div>
  );
}
