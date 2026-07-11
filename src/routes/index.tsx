import { createFileRoute } from "@tanstack/react-router";
import { AppShell } from "@/components/AppShell";
import { AwardsBanner } from "@/components/AwardsBanner";
import { HomeCommandCenter } from "@/components/HomeCommandCenter";
import { MuroGrid } from "@/components/muro/MuroGrid";
import { PageHeader } from "@/components/PageHeader";
import { PhotoAlbum } from "@/components/PhotoAlbum";

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
        <HomeCommandCenter />
        <AwardsBanner />
        <MuroGrid />
        <PhotoAlbum compact />
      </div>
    </AppShell>
  );
}
