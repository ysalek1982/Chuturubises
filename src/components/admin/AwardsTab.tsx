import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";
import { Trophy, Lock, Unlock } from "lucide-react";
import { supabase } from "@/lib/supabase";
import { AWARD_CATEGORIES, loadAwardsSettings, saveAwardsSettings } from "@/lib/awards";

export function AwardsTab() {
  const [open, setOpen] = useState(false);
  const [year, setYear] = useState<number>(new Date().getFullYear());
  const [busy, setBusy] = useState(false);
  const [counts, setCounts] = useState<Record<string, number>>({});

  const load = async () => {
    const s = await loadAwardsSettings();
    setOpen(s.isOpen);
    setYear(s.year);
    const { data: votes } = await supabase
      .from("awards_votes")
      .select("category")
      .eq("year", s.year);
    const c: Record<string, number> = {};
    ((votes as { category: string }[]) ?? []).forEach((v) => {
      c[v.category] = (c[v.category] ?? 0) + 1;
    });
    setCounts(c);
  };

  useEffect(() => {
    load();
  }, []);

  const toggle = async (next: boolean) => {
    setBusy(true);
    const { error } = await saveAwardsSettings(next, year);
    setBusy(false);
    if (error) return toast.error(error.message);
    setOpen(next);
    toast.success(next ? "¡Votaciones ABIERTAS! 🎉" : "Votaciones cerradas — revela a los ganadores 🏆");
  };

  return (
    <div className="space-y-5 rounded-2xl border border-[#FFC400]/30 bg-[#111111] p-5">
      <div className="flex items-center gap-3">
        <Trophy className="h-7 w-7 text-[#FFC400]" />
        <div>
          <h3 className="text-xl font-black uppercase text-[#FFC400]" style={{ fontFamily: "Bangers, Impact, sans-serif", letterSpacing: "0.05em" }}>
            Premios Chuturubises
          </h3>
          <p className="text-xs text-neutral-400">Gala anual de la chacota oficial 🐝</p>
        </div>
      </div>

      <div className="flex items-end gap-3">
        <div className="flex-1">
          <label className="text-[10px] font-bold uppercase tracking-wider text-neutral-400">Año de la gala</label>
          <Input
            type="number"
            value={year}
            onChange={(e) => setYear(parseInt(e.target.value || "0", 10))}
            className="mt-1 border-[#FFC400]/40 bg-black text-white"
          />
        </div>
        <div className={`rounded-full px-4 py-2 text-xs font-bold uppercase ${open ? "bg-[#FFC400] text-black" : "bg-neutral-800 text-neutral-400"}`}>
          {open ? "ABIERTAS" : "CERRADAS"}
        </div>
      </div>

      <Button
        onClick={() => toggle(!open)}
        disabled={busy}
        className={`h-16 w-full text-lg font-black uppercase tracking-wider ${
          open ? "bg-gradient-to-r from-red-600 to-pink-600 text-white hover:opacity-90" : "bg-gradient-to-r from-[#FFC400] to-amber-500 text-black hover:opacity-90"
        }`}
        style={{ fontFamily: "Bangers, Impact, sans-serif" }}
      >
        {open ? (
          <>
            <Lock className="mr-2 h-5 w-5" /> Cerrar votaciones y revelar
          </>
        ) : (
          <>
            <Unlock className="mr-2 h-5 w-5" /> Abrir votaciones {year}
          </>
        )}
      </Button>

      <div className="space-y-2">
        <p className="text-[10px] font-bold uppercase tracking-wider text-neutral-400">Votos recibidos ({year})</p>
        <ul className="space-y-1">
          {AWARD_CATEGORIES.map((c) => (
            <li key={c.key} className="flex items-center justify-between rounded-lg bg-black/60 px-3 py-2 text-sm">
              <span className="text-neutral-200">
                {c.emoji} {c.title}
              </span>
              <span className="font-black text-[#FFC400]">{counts[c.key] ?? 0}</span>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}
