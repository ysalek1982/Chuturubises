import { useEffect, useState } from "react";
import { Clock, TrendingUp, Wallet } from "lucide-react";
import { supabase } from "@/lib/supabase";

type Summary = {
  recaudado: number;
  pendiente: number;
  total: number;
  paidCount: number;
  pendingCount: number;
  reviewing: number;
};

type LedgerSummaryRow = {
  amount_due: number;
  amount_paid: number;
  reviewing_amount: number;
  balance: number;
  payment_status: "paid" | "reviewing" | "pending";
};

export function CajaStatusCard() {
  const [summary, setSummary] = useState<Summary | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      const { data, error } = await supabase.rpc("get_active_finance_ledger");
      if (error) {
        setSummary(null);
        setLoading(false);
        return;
      }

      const rows = (data as LedgerSummaryRow[] | null) ?? [];
      const summary = rows.reduce(
        (acc, row) => {
          acc.recaudado += Number(row.amount_paid);
          acc.pendiente += Number(row.balance);
          acc.reviewing += Number(row.reviewing_amount);
          if (row.payment_status === "paid") acc.paidCount += 1;
          else acc.pendingCount += 1;
          return acc;
        },
        { recaudado: 0, pendiente: 0, reviewing: 0, paidCount: 0, pendingCount: 0 },
      );

      setSummary({
        ...summary,
        total: summary.recaudado + summary.pendiente,
      });
      setLoading(false);
    })();
  }, []);

  if (loading || !summary) return null;
  const pct = summary.total > 0 ? Math.round((summary.recaudado / summary.total) * 100) : 0;

  return (
    <section className="chutu-panel overflow-hidden rounded-[1.45rem]">
      <div className="flex items-center justify-between border-b border-yellow-400/15 bg-gradient-to-r from-[#FFC400]/14 to-transparent px-4 py-3">
        <div className="flex items-center gap-3">
          <div className="grid h-10 w-10 place-items-center rounded-2xl bg-[#FFC400] text-black shadow-[0_0_18px_rgba(255,196,0,0.28)]">
            <Wallet className="h-5 w-5" />
          </div>
          <div>
            <p className="chutu-eyebrow text-[#FFC400]">Estado de caja</p>
            <p className="text-[10px] font-bold text-neutral-500">
              Transparencia de la fraternidad
            </p>
          </div>
        </div>
        <span className="rounded-full border border-[#FFC400]/40 bg-black/45 px-3 py-1 text-xs font-black text-[#FFC400]">
          {pct}%
        </span>
      </div>

      <div className="p-4">
        <div className="relative h-4 w-full overflow-hidden rounded-full border border-white/10 bg-black/35">
          <div
            className="absolute inset-y-0 left-0 bg-gradient-to-r from-green-500 via-emerald-300 to-[#FFC400] transition-all duration-700"
            style={{ width: `${pct}%` }}
          />
        </div>
        <div className="mt-1 flex justify-between text-[9px] font-bold uppercase tracking-widest text-neutral-500">
          <span>Recaudado</span>
          <span>Total caja</span>
        </div>

        <div className="mt-4 grid grid-cols-2 gap-3">
          <div className="rounded-2xl border border-green-500/30 bg-green-500/8 p-3">
            <div className="flex items-center gap-1.5 text-[10px] font-black uppercase tracking-widest text-green-400">
              <TrendingUp className="h-3 w-3" /> Recaudado
            </div>
            <p className="mt-1 text-xl font-black text-green-300">
              Bs {summary.recaudado.toFixed(2)}
            </p>
            <p className="text-[10px] text-neutral-500">
              {summary.paidCount} cuota{summary.paidCount === 1 ? "" : "s"} al dia
            </p>
          </div>
          <div className="rounded-2xl border border-[#FFC400]/30 bg-[#FFC400]/8 p-3">
            <div className="flex items-center gap-1.5 text-[10px] font-black uppercase tracking-widest text-[#FFC400]">
              <Clock className="h-3 w-3" /> Pendiente
            </div>
            <p className="mt-1 text-xl font-black text-[#FFC400]">
              Bs {summary.pendiente.toFixed(2)}
            </p>
            <p className="text-[10px] text-neutral-500">
              {summary.pendingCount} saldo{summary.pendingCount === 1 ? "" : "s"} por cobrar
            </p>
          </div>
        </div>

        <div className="mt-3 flex items-center justify-between rounded-xl border border-white/10 bg-white/[0.035] px-3 py-2 text-[11px]">
          <span className="font-bold text-neutral-400">Total comprometido</span>
          <span className="font-black text-neutral-100">Bs {summary.total.toFixed(2)}</span>
        </div>
        {summary.reviewing > 0 && (
          <div className="mt-2 flex items-center justify-between rounded-xl border border-cyan-300/20 bg-cyan-300/8 px-3 py-2 text-[11px]">
            <span className="font-bold text-cyan-200">En revision</span>
            <span className="font-black text-cyan-100">Bs {summary.reviewing.toFixed(2)}</span>
          </div>
        )}
      </div>
    </section>
  );
}
