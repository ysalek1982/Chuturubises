import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect } from "react";
import { AppShell } from "@/components/AppShell";
import { PageHeader } from "@/components/PageHeader";
import { useAuth } from "@/lib/auth";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { BestJunteCard } from "@/components/BestJunteCard";
import { PendingTab } from "@/components/admin/PendingTab";
import { MembersTab } from "@/components/admin/MembersTab";
import { EventsTab } from "@/components/admin/EventsTab";
import { FinanceTab } from "@/components/admin/FinanceTab";
import { AwardsTab } from "@/components/admin/AwardsTab";

export const Route = createFileRoute("/admin")({
  ssr: false,
  head: () => ({ meta: [{ title: "Panel Admin · Chuturubises Jrs." }] }),
  component: AdminPage,
});

function AdminPage() {
  const { isAdmin, loading } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (!loading && !isAdmin) navigate({ to: "/" });
  }, [loading, isAdmin, navigate]);

  if (loading) return null;
  if (!isAdmin) return null;

  return (
    <AppShell>
      <PageHeader title="Panel Admin" subtitle="Comando del enjambre" />
      <div className="px-4">
        <BestJunteCard />
        <Tabs defaultValue="pending" className="w-full">
          <TabsList className="grid w-full grid-cols-5 bg-neutral-900">
            <TabsTrigger value="pending" className="text-[10px] data-[state=active]:bg-yellow-400 data-[state=active]:text-black">
              Pendientes
            </TabsTrigger>
            <TabsTrigger value="members" className="text-[10px] data-[state=active]:bg-yellow-400 data-[state=active]:text-black">
              Fraternos
            </TabsTrigger>
            <TabsTrigger value="events" className="text-[10px] data-[state=active]:bg-yellow-400 data-[state=active]:text-black">
              Eventos
            </TabsTrigger>
            <TabsTrigger value="finance" className="text-[10px] data-[state=active]:bg-yellow-400 data-[state=active]:text-black">
              Finanzas
            </TabsTrigger>
            <TabsTrigger value="awards" className="text-[10px] data-[state=active]:bg-yellow-400 data-[state=active]:text-black">
              Premios
            </TabsTrigger>
          </TabsList>
          <TabsContent value="pending" className="mt-4">
            <PendingTab />
          </TabsContent>
          <TabsContent value="members" className="mt-4">
            <MembersTab />
          </TabsContent>
          <TabsContent value="events" className="mt-4">
            <EventsTab />
          </TabsContent>
          <TabsContent value="finance" className="mt-4">
            <FinanceTab />
          </TabsContent>
          <TabsContent value="awards" className="mt-4">
            <AwardsTab />
          </TabsContent>
        </Tabs>
      </div>
    </AppShell>
  );
}
