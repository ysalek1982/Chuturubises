import { useEffect, useState } from "react";
import { Clock, TrendingUp, Wallet } from "lucide-react";
import { supabase, type Fee, type FeePayment, type Profile } from "@/lib/supabase";

type Summary = {
  recaudado: number;
  pendiente: number;
  total: number;
  paidCount: number;
  pendingCount: number;
};

export function CajaStatusCard() {
  const [summary, setSummary] = useState<Summary | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      const [{ data: fees }, { data: payments }, { data: profiles }] = await Promise.all([
        supabase.from("fees").select("id, amount"),
        supabase.from("fee_payments").select("fee_id, profile_id, status, amount_due, amount_paid"),
        supabase.from("profiles").select("id").neq("approval_status", "rejected"),
      ]);
      const feeList = (fees as Pick<Fee, "id" | "amount">[] | null) ?? [];
      const profileList = (profiles as Pick<Profile, "id">[] | null) ?? [];
      const paymentMap = new Map<string, Pick<FeePayment, "status" | "amount_due" | "amount_paid">>();

      ((payments as Pick<FeePayment, "fee_id" | "profile_id" | "status" | "amount_due" | "amount_paid">[]) ?? []).forEach(
        (payment) => {
          paymentMap.set(`${payment.fee_id}:${payment.profile_id}`, payment);
        },
      );

      let recaudado = 0;
      let pendiente = 0;
      let paidCount = 0;
      let pendingCount = 0;

      feeList.forEach((fee) => {
        profileList.forEach((profile) => {
          const payment = paymentMap.get(`${fee.id}:${profile.id}`);
          const amountDue = Number(payment?.amount_due && payment.amount_due > 0 ? payment.amount_due : fee.amount);
          const amountPaid =
            Number(payment?.amount_paid ?? 0) > 0
              ? Number(payment?.amount_paid)
              : payment?.status === "paid"
                ? amountDue
                : 0;
          const balance = Math.max(amountDue - amountPaid, 0);
          recaudado += amountPaid;
          pendiente += balance;
          if (balance <= 0 && amountDue > 0) paidCount += 1;
          else pendingCount += 1;
        });
      });

      setSummary({
        recaudado,
        pendiente,
        total: recaudado + pendiente,
        paidCount,
        pendingCount,
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
            <p className="text-[10px] font-bold text-neutral-500">Transparencia de la fraternidad</p>
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
      </div>
    </section>
  );
}
