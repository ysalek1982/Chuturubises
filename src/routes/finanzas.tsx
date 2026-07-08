import { createFileRoute, Link } from "@tanstack/react-router";
import { ShieldCheck } from "lucide-react";
import { AppShell } from "@/components/AppShell";
import { Button } from "@/components/ui/button";
import { CajaStatusCard } from "@/components/CajaStatusCard";
import { MisCuotas } from "@/components/MisCuotas";
import { PageHeader } from "@/components/PageHeader";
import { useAuth } from "@/lib/auth";

export const Route = createFileRoute("/finanzas")({
  ssr: false,
  head: () => ({ meta: [{ title: "Finanzas - Chuturubises Jrs." }] }),
  component: FinanzasPage,
});

function FinanzasPage() {
  const { canManageFinance } = useAuth();

  return (
    <AppShell>
      <div className="min-h-dvh">
        <PageHeader title="Finanzas" subtitle="Cuotas, QR y comprobantes" />
        <div className="space-y-4 px-4 pb-6 pt-4">
          {canManageFinance && (
            <Button
              asChild
              className="h-11 w-full rounded-xl bg-cyan-300 font-black uppercase tracking-wider text-black hover:bg-cyan-200"
            >
              <Link to="/admin">
                <ShieldCheck className="h-4 w-4" /> Abrir panel del tesorero
              </Link>
            </Button>
          )}
          <CajaStatusCard />
          <MisCuotas showEmpty />
        </div>
      </div>
    </AppShell>
  );
}
