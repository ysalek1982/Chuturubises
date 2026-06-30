import { useEffect, useState } from "react";
import { Link } from "@tanstack/react-router";
import { Trophy } from "lucide-react";
import { loadAwardsSettings } from "@/lib/awards";

export function AwardsBanner() {
  const [show, setShow] = useState(false);
  const [year, setYear] = useState<number>(new Date().getFullYear());

  useEffect(() => {
    loadAwardsSettings().then((s) => {
      if (s.isOpen) {
        setShow(true);
        setYear(s.year);
      }
    });
  }, []);

  if (!show) return null;

  return (
    <Link
      to="/premios"
      className="chutu-panel group relative mx-4 mt-4 block overflow-hidden rounded-[1.4rem] p-4 transition hover:-translate-y-0.5"
    >
      <div
        aria-hidden
        className="absolute inset-x-0 top-0 h-1 bg-gradient-to-r from-[#FFC400] via-[#FF2E93] to-[#00E0FF]"
      />
      <div className="flex items-center gap-3">
        <div className="grid h-12 w-12 shrink-0 place-items-center rounded-2xl bg-[#FFC400] text-black shadow-[0_12px_25px_rgba(255,196,0,0.25)]">
          <Trophy className="h-6 w-6" />
        </div>
        <div className="min-w-0 flex-1">
          <p className="chutu-display truncate text-2xl leading-none text-[#FFC400]">
            Premios Chuturubises {year}
          </p>
          <p className="mt-1 text-[11px] font-bold uppercase tracking-wider text-neutral-300">
            Votaciones abiertas · toca para votar 🐝
          </p>
        </div>
        <span className="text-2xl transition group-hover:rotate-6">🏆</span>
      </div>
    </Link>
  );
}
