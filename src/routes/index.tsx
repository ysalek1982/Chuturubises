import { createFileRoute } from "@tanstack/react-router";
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
              <div className="mt-4 grid grid-cols-3 gap-2">
                {["Junte", "Caja", "Turnos"].map((item) => (
                  <div key={item} className="rounded-xl border border-white/10 bg-white/[0.045] px-2 py-2 text-center">
                    <p className="text-[10px] font-black uppercase tracking-widest text-[#00E0FF]">{item}</p>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
        <AwardsBanner />
        <WinnerBanner />
        <UpcomingEvents />
        <MuroGrid />
      </div>
    </AppShell>
  );
}
