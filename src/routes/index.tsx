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
          <div className="relative overflow-hidden rounded-[1.65rem] border border-yellow-300/18 bg-black/35 p-4 shadow-[0_18px_50px_rgba(0,0,0,0.32)]">
            <div
              aria-hidden
              className="absolute inset-x-0 top-0 h-1 bg-gradient-to-r from-[#FF2E93] via-[#FFD60A] to-[#00E0FF]"
            />
            <p className="chutu-eyebrow">Casa del enjambre</p>
            <h2 className="chutu-display mt-1 text-4xl leading-none text-[#FFD60A]">
              Fraternos en guardia
            </h2>
            <p className="mt-2 text-sm leading-relaxed text-neutral-300">
              Muro oficial de socios, juntes y novedades de la fraternidad.
            </p>
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
