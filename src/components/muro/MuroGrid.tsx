import { useEffect, useState } from "react";
import { ConfettiBurst } from "@/components/ConfettiBurst";
import { supabase, type Profile } from "@/lib/supabase";
import { PolaroidCard } from "./PolaroidCard";

export function MuroGrid() {
  const [profiles, setProfiles] = useState<Profile[]>([]);
  const [loading, setLoading] = useState(true);
  const [likes, setLikes] = useState<Record<string, boolean>>({});
  const [confettiTrigger, setConfettiTrigger] = useState(0);

  useEffect(() => {
    supabase
      .from("profiles")
      .select("*")
      .neq("approval_status", "rejected")
      .order("created_at", { ascending: false })
      .then(({ data }) => {
        setProfiles((data as Profile[]) ?? []);
        setLoading(false);
      });
    try {
      setLikes(JSON.parse(localStorage.getItem("chutu-likes") ?? "{}"));
    } catch {
      /* noop */
    }
  }, []);

  const toggleLike = (id: string) => {
    setLikes((prev) => {
      const next = { ...prev, [id]: !prev[id] };
      localStorage.setItem("chutu-likes", JSON.stringify(next));
      return next;
    });
    setConfettiTrigger((n) => n + 1);
  };

  const currentMonth = new Date().getMonth() + 1;

  return (
    <section className="px-4 pb-8 pt-8">
      <h3 className="chutu-section-title mb-8 px-1">Galería de socios</h3>
      <ConfettiBurst trigger={confettiTrigger} count={40} />
      {loading ? (
        <p className="rounded-2xl border border-white/10 bg-black/30 p-4 text-sm text-white/55">
          Cargando aguijones...
        </p>
      ) : !profiles.length ? (
        <p className="rounded-2xl border border-yellow-300/20 bg-black/30 p-4 text-sm text-white/60">
          Aún no hay fraternos registrados. Sé el primero del enjambre.
        </p>
      ) : (
        <div className="grid grid-cols-2 gap-x-5 gap-y-12">
          {profiles.map((profile, index) => {
            const birthMonth = profile.birth_date ? Number(profile.birth_date.slice(5, 7)) : null;
            return (
              <PolaroidCard
                key={profile.id}
                profile={profile}
                index={index}
                liked={!!likes[profile.id]}
                isBirthMonth={birthMonth === currentMonth}
                onToggleLike={() => toggleLike(profile.id)}
              />
            );
          })}
        </div>
      )}
    </section>
  );
}
