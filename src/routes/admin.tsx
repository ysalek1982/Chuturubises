import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect } from "react";
import { AppShell } from "@/components/AppShell";
import { PageHeader } from "@/components/PageHeader";
import { useAuth } from "@/lib/auth";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { BestJunteCard } from "@/components/BestJunteCard";
import { MembersTab } from "@/components/admin/MembersTab";
import { EventsTab } from "@/components/admin/EventsTab";
import { FinanceTab } from "@/components/admin/FinanceTab";
import { AwardsTab } from "@/components/admin/AwardsTab";
import { WorldCupTab } from "@/components/admin/WorldCupTab";
import { ensureWorldCupMatchesSeeded } from "@/lib/world-cup-seed";
import { toast } from "sonner";

export const Route = createFileRoute("/admin")({
  ssr: false,
  head: () => ({ meta: [{ title: "Panel Admin · Chuturubises Jrs." }] }),
  component: AdminPage,
});

function AdminPage() {
  const { isAdmin, canManageFinance, loading } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (!loading && !canManageFinance) navigate({ to: "/" });
  }, [loading, canManageFinance, navigate]);

  useEffect(() => {
    if (loading || !isAdmin) return;
    ensureWorldCupMatchesSeeded()
      .then((result) => {
        if (result.seeded) toast.success("Penca publicada para los fraternos");
      })
      .catch(() => toast.error("No se pudo publicar la Penca. Revisa permisos de Supabase."));
  }, [loading, isAdmin]);

  if (loading) return null;
  if (!canManageFinance) return null;

  if (!isAdmin) {
    return (
      <AppShell>
        <PageHeader title="Panel Finanzas" subtitle="Tesorero - Control de pagos" />
        <div className="px-4">
          <FinanceTab />
        </div>
      </AppShell>
    );
  }

  return (
    <AppShell>
      <PageHeader title="Panel Admin" subtitle="Comando del enjambre" />
      <div className="px-4">
        <BestJunteCard />
        <Tabs defaultValue="members" className="w-full">
          <TabsList className="grid w-full grid-cols-5 bg-neutral-900">
            <TabsTrigger value="members" className="text-[10px] data-[state=active]:bg-yellow-400 data-[state=active]:text-black">
              Fraternos
            </TabsTrigger>
            <TabsTrigger value="events" className="text-[10px] data-[state=active]:bg-yellow-400 data-[state=active]:text-black">
              Eventos
            </TabsTrigger>
            <TabsTrigger value="finance" className="text-[10px] data-[state=active]:bg-yellow-400 data-[state=active]:text-black">
              Finanzas
            </TabsTrigger>
            <TabsTrigger value="worldcup" className="text-[10px] data-[state=active]:bg-yellow-400 data-[state=active]:text-black">
              Penca
            </TabsTrigger>
            <TabsTrigger value="awards" className="text-[10px] data-[state=active]:bg-yellow-400 data-[state=active]:text-black">
              Premios
            </TabsTrigger>
          </TabsList>
          <TabsContent value="members" className="mt-4">
            <MembersTab />
          </TabsContent>
          <TabsContent value="events" className="mt-4">
            <EventsTab />
          </TabsContent>
          <TabsContent value="finance" className="mt-4">
            <FinanceTab />
          </TabsContent>
          <TabsContent value="worldcup" className="mt-4">
            <WorldCupTab />
          </TabsContent>
          <TabsContent value="awards" className="mt-4">
            <AwardsTab />
          </TabsContent>
        </Tabs>
      </div>
    </AppShell>
  );
}
