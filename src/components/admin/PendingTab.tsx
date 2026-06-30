import { useEffect, useState } from "react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/lib/auth";
import { supabase, type Profile } from "@/lib/supabase";
import { toast } from "sonner";

export function PendingTab() {
  const { user } = useAuth();
  const [pending, setPending] = useState<Profile[]>([]);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  const load = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from("profiles")
      .select("*")
      .eq("approval_status", "pending")
      .order("created_at", { ascending: true });
    setLoading(false);
    if (error) toast.error(error.message);
    else setPending((data as Profile[]) ?? []);
  };

  useEffect(() => {
    load();
  }, []);

  const setStatus = async (id: string, approval_status: "approved" | "rejected") => {
    setBusyId(id);
    const { error } = await supabase
      .from("profiles")
      .update({
        approval_status,
        approved_at: approval_status === "approved" ? new Date().toISOString() : null,
        approved_by: approval_status === "approved" ? user?.id : null,
      })
      .eq("id", id);
    setBusyId(null);
    if (error) toast.error(error.message);
    else {
      toast.success(approval_status === "approved" ? "Aprobado" : "Rechazado");
      load();
    }
  };

  if (loading) return <p className="text-sm text-neutral-500">Cargando...</p>;
  if (!pending.length)
    return (
      <div className="rounded-xl border border-yellow-400/20 bg-neutral-950 p-6 text-center text-sm text-neutral-400">
        No hay solicitudes pendientes. 🐝
      </div>
    );

  return (
    <ul className="space-y-3">
      {pending.map((m) => (
        <li key={m.id} className="rounded-xl border border-neutral-800 bg-neutral-950 p-3">
          <div className="flex items-center gap-3">
            <Avatar className="h-12 w-12 border border-yellow-400/40">
              <AvatarImage src={m.avatar_url ?? undefined} className="object-cover" />
              <AvatarFallback className="bg-neutral-800 text-yellow-400">🐝</AvatarFallback>
            </Avatar>
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-bold text-yellow-300">@{m.nickname}</p>
              <p className="truncate text-xs text-neutral-400">{m.full_name}</p>
            </div>
          </div>
          <div className="mt-3 grid grid-cols-2 gap-2">
            <Button
              onClick={() => setStatus(m.id, "approved")}
              disabled={busyId === m.id}
              className="bg-yellow-400 font-bold text-black hover:bg-yellow-300"
            >
              Aprobar
            </Button>
            <Button
              onClick={() => setStatus(m.id, "rejected")}
              disabled={busyId === m.id}
              variant="outline"
              className="border-neutral-700 bg-transparent text-neutral-300 hover:bg-neutral-900"
            >
              Rechazar
            </Button>
          </div>
        </li>
      ))}
    </ul>
  );
}
