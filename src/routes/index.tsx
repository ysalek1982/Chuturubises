import { createFileRoute, Link } from "@tanstack/react-router";
import { CalendarDays, Camera, Dices } from "lucide-react";
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
      { title: "Chuturubises Jrs. - Muro" },
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
                Carnaval de cancha
              </span>
              <h2 className="chutu-display mt-3 text-5xl leading-none text-[#FFD60A]">
                Fraternos en guardia
              </h2>
              <p className="mt-2 text-sm leading-relaxed text-neutral-200">
                Socios, turnos, fotos y juntes con aguijon, parrilla, comparsa y espiritu futbolero.
              </p>
            </div>
          </div>
          <div className="mt-3 grid grid-cols-3 gap-2">
            <QuickAction to="/sorteo" label="Sorteo" icon={Dices} tone="gold" />
            <QuickAction to="/calendario" label="Turnos" icon={CalendarDays} tone="green" />
            <QuickAction to="/galeria" label="Album" icon={Camera} tone="cyan" />
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

function QuickAction({
  to,
  label,
  icon: Icon,
  tone,
}: {
  to: "/sorteo" | "/calendario" | "/galeria";
  label: string;
  icon: typeof Dices;
  tone: "gold" | "green" | "cyan";
}) {
  const toneClass =
    tone === "green"
      ? "bg-[#14A538] text-white"
      : tone === "cyan"
        ? "bg-[#00E0FF] text-black"
        : "bg-[#FFD60A] text-black";

  return (
    <Link to={to} className="chutu-action-tile rounded-[1.15rem] px-2 py-3 text-center transition hover:-translate-y-0.5">
      <span className={`mx-auto grid h-10 w-10 place-items-center rounded-xl ${toneClass}`}>
        <Icon className="h-5 w-5" />
      </span>
      <span className="mt-2 block truncate text-[10px] font-black uppercase tracking-widest text-white">
        {label}
      </span>
    </Link>
  );
}
