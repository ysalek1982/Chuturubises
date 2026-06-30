import { useEffect, useState } from "react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/lib/auth";
import { supabase, type Profile } from "@/lib/supabase";
import { toast } from "sonner";

export function MembersTab() {
  const { user } = useAuth();
  const [members, setMembers] = useState<Profile[]>([]);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  const load = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from("profiles")
      .select("*")
      .neq("approval_status", "rejected")
      .order("full_name", { ascending: true });
    setLoading(false);
    if (error) toast.error(error.message);
    else setMembers((data as Profile[]) ?? []);
  };

  useEffect(() => {
    load();
  }, []);

  const revoke = async (id: string) => {
    if (id === user?.id) return toast.error("No puedes revocarte a ti mismo.");
    if (!confirm("¿Revocar acceso a este fraterno?")) return;
    setBusyId(id);
    const { error } = await supabase
      .from("profiles")
      .update({ approval_status: "rejected", approved_at: null, approved_by: null })
      .eq("id", id);
    setBusyId(null);
    if (error) toast.error(error.message);
    else {
      toast.success("Acceso revocado");
      load();
    }
  };

  if (loading) return <p className="text-sm text-neutral-500">Cargando...</p>;
  if (!members.length)
    return <p className="text-sm text-neutral-500">Aún no hay fraternos aprobados.</p>;

  return (
    <ul className="space-y-2">
      {members.map((m) => (
        <li
          key={m.id}
          className="flex items-center gap-3 rounded-xl border border-neutral-800 bg-neutral-950 p-3"
        >
          <Avatar className="h-11 w-11 border border-yellow-400/40">
            <AvatarImage src={m.avatar_url ?? undefined} className="object-cover" />
            <AvatarFallback className="bg-neutral-800 text-yellow-400">🐝</AvatarFallback>
          </Avatar>
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-bold text-yellow-300">@{m.nickname}</p>
            <p className="truncate text-xs text-neutral-400">{m.full_name}</p>
          </div>
          <Button
            onClick={() => revoke(m.id)}
            disabled={busyId === m.id || m.id === user?.id}
            size="sm"
            variant="outline"
            className="border-red-500/40 bg-transparent text-red-300 hover:bg-red-500/10"
          >
            Revocar
          </Button>
        </li>
      ))}
    </ul>
  );
}
