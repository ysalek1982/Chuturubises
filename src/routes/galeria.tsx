import { createFileRoute } from "@tanstack/react-router";
import { AppShell } from "@/components/AppShell";
import { PageHeader } from "@/components/PageHeader";
import { PhotoAlbum } from "@/components/PhotoAlbum";

export const Route = createFileRoute("/galeria")({
  ssr: false,
  head: () => ({ meta: [{ title: "Album - Chuturubises Jrs." }] }),
  component: GaleriaPage,
});

function GaleriaPage() {
  return (
    <AppShell>
      <PageHeader title="Album" subtitle="Recuerdos del enjambre" />
      <PhotoAlbum />
    </AppShell>
  );
}
