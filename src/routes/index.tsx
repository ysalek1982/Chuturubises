import { createFileRoute, Link } from "@tanstack/react-router";
import { Dices } from "lucide-react";
import { AppShell } from "@/components/AppShell";
import { AwardsBanner } from "@/components/AwardsBanner";
import { MuroGrid } from "@/components/muro/MuroGrid";
import { PageHeader } from "@/components/PageHeader";
import { UpcomingEvents } from "@/components/UpcomingEvents";
import { WinnerBanner } from "@/components/WinnerBanner";

export const Route = createFileRoute("/")({
  ssr: false,
  head: () => ({
    meta: [
      { title: "Chuturubises Jrs. · Muro" },
      { name: "description", content: "Muro de fraternos de la Fraternidad Chuturubises Jrs." },
    ],
  }),
  component: Muro,
});

function Muro() {
  return (
    <AppShell>
      <div className="min-h-dvh">
        <PageHeader title="Muro" subtitle="Chuturubises Jrs." />
        <div className="px-4 pt-4">
          <div className="chutu-carnival-card rounded-[1.65rem] p-4">
            <div
              aria-hidden
              className="absolute inset-x-0 top-0 h-1 bg-gradient-to-r from-[#FF2E93] via-[#FFD60A] to-[#00E0FF]"
            />
            <div className="relative">
              <span className="chutu-ribbon rounded-full px-3 py-1 text-[10px] font-black uppercase tracking-[0.22em]">
                Carnaval cruceño
              </span>
              <h2 className="chutu-display mt-3 text-5xl leading-none text-[#FFD60A]">
                Fraternos en guardia
              </h2>
              <p className="mt-2 text-sm leading-relaxed text-neutral-200">
                Muro oficial de socios, juntes y novedades con aguijon, parrilla y comparsa.
              </p>
            </div>
          </div>
          <Link
            to="/sorteo"
            className="chutu-panel mt-3 flex items-center gap-3 rounded-[1.35rem] p-4 transition hover:-translate-y-0.5"
          >
            <div className="grid h-12 w-12 shrink-0 place-items-center rounded-xl bg-[#FFD60A] text-black">
              <Dices className="h-6 w-6" />
            </div>
            <div className="min-w-0 flex-1">
              <p className="chutu-eyebrow text-[#FFD60A]">Sorteo de fraternidad</p>
              <p className="mt-1 text-sm font-bold text-white">Arma turnos, juntes y responsabilidades con sabor chuturubis.</p>
            </div>
          </Link>
        </div>
        <AwardsBanner />
        <WinnerBanner />
        <UpcomingEvents />
        <MuroGrid />
      </div>
    </AppShell>
  );
}
