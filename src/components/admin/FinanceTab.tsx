import { useEffect, useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import {
  Table,
  TableBody,
  TableCell,
  TableFooter,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Textarea } from "@/components/ui/textarea";
import {
  Banknote,
  BarChart3,
  Check,
  CheckCircle2,
  FileDown,
  FilePenLine,
  ListFilter,
  Lock,
  Pencil,
  Plus,
  RefreshCw,
  RotateCcw,
  Target,
  Trash2,
  Undo2,
  WalletCards,
  X,
} from "lucide-react";
import {
  supabase,
  type Fee,
  type FeePayment,
  type FeePaymentEntry,
  type Profile,
} from "@/lib/supabase";
import { toast } from "sonner";
import { sendFinancePush } from "@/lib/push-notifications";
import { QrSettingsCard } from "./QrSettingsCard";
import { ReceiptsReviewCard } from "./ReceiptsReviewCard";

type LedgerRow = {
  member: Profile;
  payment: FeePayment | null;
  entries: FeePaymentEntry[];
  amountDue: number;
  amountPaid: number;
  firstPayment: number;
  secondPayment: number;
  extraPaid: number;
  refundAmount: number;
  reviewingAmount: number;
  balance: number;
  status: "paid" | "reviewing" | "pending";
};

type CampaignStatusFilter = "all" | "open" | "closed" | "archived";

const CAMPAIGN_PRESETS = [
  { title: "Camisas Chutus", amount: "200" },
  { title: "Cuota mensual", amount: "50" },
  { title: "Turno Chuturubi", amount: "100" },
  { title: "Fondo carnavalero", amount: "150" },
  { title: "Multa", amount: "20" },
];

const STATUS_FILTERS: Array<{ value: CampaignStatusFilter; label: string }> = [
  { value: "all", label: "Todas" },
  { value: "open", label: "Abiertas" },
  { value: "closed", label: "Cerradas" },
  { value: "archived", label: "Archivadas" },
];

const money = (value: number | null | undefined) => Number(value ?? 0).toFixed(2);
const moneyCompact = (value: number | null | undefined) => {
  const amount = Number(value ?? 0);
  return Number.isInteger(amount) ? amount.toFixed(0) : amount.toFixed(2);
};
const shirtSize = (value: string | null | undefined) => value?.trim().toUpperCase() || "-";

const byDate = (a: FeePaymentEntry, b: FeePaymentEntry) =>
  new Date(a.approved_at ?? a.created_at).getTime() -
  new Date(b.approved_at ?? b.created_at).getTime();

function feeStatus(fee: Fee | null) {
  return fee?.status ?? (fee?.is_active ? "open" : "closed");
}

function campaignStateLabel(fee: Fee | null) {
  const status = feeStatus(fee);
  if (status === "archived") return "Archivada";
  if (status === "closed") return "Cerrada";
  return fee?.is_active ? "Visible" : "Oculta";
}

export function FinanceTab() {
  const [fees, setFees] = useState<Fee[]>([]);
  const [selectedFee, setSelectedFee] = useState<string | null>(null);
  const [campaignStatusFilter, setCampaignStatusFilter] = useState<CampaignStatusFilter>("open");
  const [members, setMembers] = useState<Profile[]>([]);
  const [payments, setPayments] = useState<FeePayment[]>([]);
  const [entries, setEntries] = useState<FeePaymentEntry[]>([]);
  const [title, setTitle] = useState("Camisas Chutus");
  const [amount, setAmount] = useState("200");
  const [dueDate, setDueDate] = useState("");
  const [busy, setBusy] = useState(false);
  const [editingFeeName, setEditingFeeName] = useState(false);
  const [feeNameDraft, setFeeNameDraft] = useState("");
  const [renamingFee, setRenamingFee] = useState(false);
  const [feeEditOpen, setFeeEditOpen] = useState(false);
  const [feeEditTitle, setFeeEditTitle] = useState("");
  const [feeEditAmount, setFeeEditAmount] = useState("");
  const [feeEditDueDate, setFeeEditDueDate] = useState("");
  const [feeEditActive, setFeeEditActive] = useState(true);
  const [feeEditBusy, setFeeEditBusy] = useState(false);
  const [feeActionBusy, setFeeActionBusy] = useState(false);
  const [manualTarget, setManualTarget] = useState<LedgerRow | null>(null);
  const [manualAmount, setManualAmount] = useState("");
  const [manualNotes, setManualNotes] = useState("");
  const [manualBusy, setManualBusy] = useState(false);
  const [refundTarget, setRefundTarget] = useState<LedgerRow | null>(null);
  const [refundAmount, setRefundAmount] = useState("");
  const [refundNotes, setRefundNotes] = useState("");
  const [refundBusy, setRefundBusy] = useState(false);

  const loadFees = async () => {
    const { data } = await supabase
      .from("fees")
      .select("*")
      .order("is_active", { ascending: false })
      .order("created_at", { ascending: false });
    const list = (data as Fee[]) ?? [];
    setFees(list);
    if (!selectedFee && list[0]) {
      const firstOpen = list.find((item) => feeStatus(item) === "open") ?? list[0];
      setSelectedFee(firstOpen.id);
    }
  };

  const loadMembers = async () => {
    const { data } = await supabase
      .from("profiles")
      .select("*")
      .neq("approval_status", "rejected")
      .order("full_name");
    setMembers((data as Profile[]) ?? []);
  };

  const loadPayments = async (feeId: string) => {
    const [{ data: p }, { data: e }] = await Promise.all([
      supabase.from("fee_payments").select("*").eq("fee_id", feeId),
      supabase.from("fee_payment_entries").select("*").eq("fee_id", feeId),
    ]);
    setPayments((p as FeePayment[]) ?? []);
    setEntries((e as FeePaymentEntry[]) ?? []);
  };

  useEffect(() => {
    loadFees();
    loadMembers();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (selectedFee) loadPayments(selectedFee);
  }, [selectedFee]);

  const applyPreset = (preset: (typeof CAMPAIGN_PRESETS)[number]) => {
    setTitle(preset.title);
    setAmount(preset.amount);
  };

  const createFee = async () => {
    if (!title.trim() || !amount) return toast.error("Titulo y monto son obligatorios");
    const numericAmount = Number(amount);
    if (!Number.isFinite(numericAmount) || numericAmount <= 0) {
      return toast.error("El monto debe ser mayor a cero");
    }

    setBusy(true);
    const { data, error } = await supabase
      .from("fees")
      .insert({
        title: title.trim(),
        item_label: title.trim(),
        amount: numericAmount,
        due_date: dueDate || null,
        is_active: true,
        status: "open",
      })
      .select()
      .maybeSingle();
    setBusy(false);
    if (error) return toast.error(error.message);

    toast.success("Campana financiera creada");
    if (data) {
      await supabase.rpc("sync_fee_obligations", { p_fee_id: (data as Fee).id });
    }
    setTitle("");
    setAmount("");
    setDueDate("");
    await loadFees();
    if (data) setSelectedFee((data as Fee).id);
  };

  const archiveOrDeleteFee = async (id: string) => {
    if (
      !confirm(
        "Eliminar este cobro? Si tiene movimientos quedara archivado para no perder historial.",
      )
    )
      return;
    const { data, error } = await supabase.rpc("archive_or_delete_fee", { p_fee_id: id });
    if (error) return toast.error(error.message);
    toast.success(data === "deleted" ? "Cobro eliminado" : "Cobro archivado");
    setSelectedFee(null);
    setPayments([]);
    setEntries([]);
    await loadFees();
  };

  const toggleFeeActive = async (nextActive: boolean) => {
    if (!fee) return;
    const { error } = await supabase.rpc("set_fee_active", {
      p_fee_id: fee.id,
      p_is_active: nextActive,
    });
    if (error) return toast.error(error.message);
    toast.success(nextActive ? "Cobro habilitado para fraternos" : "Cobro oculto para fraternos");
    await loadFees();
    await loadPayments(fee.id);
  };

  const syncObligations = async () => {
    if (!fee) return;
    const { data, error } = await supabase.rpc("sync_fee_obligations", { p_fee_id: fee.id });
    if (error) return toast.error(error.message);
    toast.success(`Obligaciones actualizadas: ${Number(data ?? 0)} nuevo(s)`);
    await loadPayments(fee.id);
  };

  const fee = fees.find((f) => f.id === selectedFee) ?? null;

  const filteredFees = useMemo(
    () =>
      fees.filter((item) =>
        campaignStatusFilter === "all" ? true : feeStatus(item) === campaignStatusFilter,
      ),
    [campaignStatusFilter, fees],
  );

  useEffect(() => {
    setFeeNameDraft(fee?.title ?? "");
    setFeeEditTitle(fee?.title ?? "");
    setFeeEditAmount(fee ? String(Number(fee.amount ?? 0)) : "");
    setFeeEditDueDate(fee?.due_date ?? "");
    setFeeEditActive(Boolean(fee?.is_active));
    setEditingFeeName(false);
  }, [fee]);

  const updateFeeName = async () => {
    if (!fee) return;
    const nextName = feeNameDraft.trim();
    if (!nextName) return toast.error("El nombre del cobro es obligatorio");
    if (nextName === fee.title) {
      setEditingFeeName(false);
      return;
    }

    setRenamingFee(true);
    const { error } = await supabase.rpc("update_fee_title", {
      p_fee_id: fee.id,
      p_title: nextName,
    });
    setRenamingFee(false);
    if (error) return toast.error(error.message);

    toast.success("Nombre del cobro actualizado");
    setEditingFeeName(false);
    await loadFees();
  };

  const ledgerRows = useMemo<LedgerRow[]>(() => {
    if (!fee) return [];
    const paymentMap = new Map(payments.map((p) => [p.profile_id, p]));
    const entryMap = new Map<string, FeePaymentEntry[]>();
    entries.forEach((entry) => {
      const list = entryMap.get(entry.profile_id) ?? [];
      list.push(entry);
      entryMap.set(entry.profile_id, list);
    });

    return members.map((member) => {
      const payment = paymentMap.get(member.id) ?? null;
      const memberEntries = (entryMap.get(member.id) ?? []).slice();
      const paidEntries = memberEntries
        .filter((entry) => entry.status === "paid" && entry.payment_method !== "refund")
        .sort(byDate);
      const refundEntries = memberEntries.filter(
        (entry) => entry.status === "paid" && entry.payment_method === "refund",
      );
      const reviewingEntries = memberEntries.filter((entry) => entry.status === "reviewing");
      const amountDue = Number(
        payment?.amount_due && payment.amount_due > 0 ? payment.amount_due : fee.amount,
      );
      const entryPaid = paidEntries.reduce((sum, entry) => sum + Number(entry.amount), 0);
      const refundAmount = refundEntries.reduce((sum, entry) => sum + Number(entry.amount), 0);
      const legacyPaid =
        paidEntries.length === 0 && payment?.status === "paid"
          ? Number(payment.amount_paid && payment.amount_paid > 0 ? payment.amount_paid : amountDue)
          : 0;
      const amountPaid =
        Number(payment?.amount_paid ?? 0) > 0
          ? Number(payment?.amount_paid)
          : Math.max(entryPaid + legacyPaid - refundAmount, 0);
      const firstPayment = Number(paidEntries[0]?.amount ?? (legacyPaid > 0 ? legacyPaid : 0));
      const secondPayment = Number(paidEntries[1]?.amount ?? 0);
      const extraPaid = paidEntries.slice(2).reduce((sum, entry) => sum + Number(entry.amount), 0);
      const reviewingAmount = reviewingEntries.reduce(
        (sum, entry) => sum + Number(entry.amount),
        0,
      );
      const balance = Math.max(amountDue - amountPaid, 0);
      const status = balance <= 0 ? "paid" : reviewingAmount > 0 ? "reviewing" : "pending";

      return {
        member,
        payment,
        entries: memberEntries,
        amountDue,
        amountPaid,
        firstPayment,
        secondPayment,
        extraPaid,
        refundAmount,
        reviewingAmount,
        balance,
        status,
      };
    });
  }, [entries, fee, members, payments]);

  const totals = ledgerRows.reduce(
    (acc, row) => {
      acc.amountDue += row.amountDue;
      acc.amountPaid += row.amountPaid;
      acc.firstPayment += row.firstPayment;
      acc.secondPayment += row.secondPayment;
      acc.extraPaid += row.extraPaid;
      acc.refundAmount += row.refundAmount;
      acc.reviewingAmount += row.reviewingAmount;
      acc.balance += row.balance;
      if (row.status === "paid") acc.paidCount += 1;
      if (row.status === "reviewing") acc.reviewingCount += 1;
      return acc;
    },
    {
      amountDue: 0,
      amountPaid: 0,
      firstPayment: 0,
      secondPayment: 0,
      extraPaid: 0,
      refundAmount: 0,
      reviewingAmount: 0,
      balance: 0,
      paidCount: 0,
      reviewingCount: 0,
    },
  );

  const selectedProgress =
    totals.amountDue > 0
      ? Math.min(100, Math.round((totals.amountPaid / totals.amountDue) * 100))
      : 0;
  const readyToClose = ledgerRows.length > 0 && totals.balance <= 0 && totals.reviewingAmount <= 0;
  const feeCounts = fees.reduce(
    (acc, item) => {
      const status = feeStatus(item);
      acc.total += 1;
      if (status === "open") acc.open += 1;
      if (status === "closed") acc.closed += 1;
      if (status === "archived") acc.archived += 1;
      return acc;
    },
    { total: 0, open: 0, closed: 0, archived: 0 },
  );

  const exportCampaignCsv = () => {
    if (!fee || !ledgerRows.length) return toast.error("No hay datos para exportar");
    const escapeCsv = (value: string | number | null | undefined) => {
      const text = String(value ?? "");
      return /[",\r\n;]/.test(text) ? `"${text.replace(/"/g, '""')}"` : text;
    };
    const headers = [
      "No",
      "Nick",
      "Nombre",
      "Talla",
      "Total",
      "1er pago",
      "2do pago",
      "Extra",
      "Devuelto",
      "Pagado neto",
      "En revision",
      "Saldo",
      "Estado",
    ];
    const rows = ledgerRows.map((row, index) => [
      index + 1,
      row.member.nickname || row.member.full_name,
      row.member.full_name,
      shirtSize(row.member.tshirt_size),
      money(row.amountDue),
      money(row.firstPayment),
      money(row.secondPayment),
      money(row.extraPaid),
      money(row.refundAmount),
      money(row.amountPaid),
      money(row.reviewingAmount),
      money(row.balance),
      row.status,
    ]);
    const csv = [headers, ...rows].map((row) => row.map(escapeCsv).join(";")).join("\r\n");
    const blob = new Blob([`\uFEFF${csv}`], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    const safeName = fee.title
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-|-$/g, "");
    link.href = url;
    link.download = `${safeName || "campana"}-finanzas.csv`;
    link.click();
    URL.revokeObjectURL(url);
  };

  const openFeeEditor = () => {
    if (!fee) return;
    setFeeEditTitle(fee.title);
    setFeeEditAmount(String(Number(fee.amount ?? 0)));
    setFeeEditDueDate(fee.due_date ?? "");
    setFeeEditActive(Boolean(fee.is_active));
    setFeeEditOpen(true);
  };

  const updateFeeDetails = async () => {
    if (!fee) return;
    const numericAmount = Number(feeEditAmount);
    if (!feeEditTitle.trim()) return toast.error("El nombre del cobro es obligatorio");
    if (!Number.isFinite(numericAmount) || numericAmount <= 0) {
      return toast.error("El monto debe ser mayor a cero");
    }

    setFeeEditBusy(true);
    const { error } = await supabase.rpc("update_fee_details", {
      p_fee_id: fee.id,
      p_title: feeEditTitle.trim(),
      p_amount: numericAmount,
      p_due_date: feeEditDueDate || null,
      p_is_active: feeEditActive,
    });
    setFeeEditBusy(false);
    if (error) return toast.error(error.message);

    toast.success("Parametros actualizados");
    setFeeEditOpen(false);
    await loadFees();
    await loadPayments(fee.id);
  };

  const closeFee = async () => {
    if (!fee) return;
    if (totals.balance > 0 && !confirm("Aún hay saldo pendiente. ¿Cerrar de todas formas?")) return;
    setFeeActionBusy(true);
    const { error } = await supabase.rpc("close_fee", { p_fee_id: fee.id });
    setFeeActionBusy(false);
    if (error) return toast.error(error.message);
    toast.success("Cobro cerrado");
    void sendFinancePush();
    await loadFees();
    await loadPayments(fee.id);
  };

  const reopenFee = async () => {
    if (!fee) return;
    setFeeActionBusy(true);
    const { error } = await supabase.rpc("reopen_fee", { p_fee_id: fee.id });
    setFeeActionBusy(false);
    if (error) return toast.error(error.message);
    toast.success("Cobro reabierto");
    await loadFees();
    await loadPayments(fee.id);
  };

  const openManualPayment = (row: LedgerRow) => {
    setManualTarget(row);
    setManualAmount(row.balance > 0 ? money(row.balance) : money(row.amountDue));
    setManualNotes("");
  };

  const openRefund = (row: LedgerRow) => {
    if (row.amountPaid <= 0) return toast.error("Este fraterno no tiene pagos para devolver");
    setRefundTarget(row);
    setRefundAmount(money(row.amountPaid));
    setRefundNotes("");
  };

  const registerManualPayment = async () => {
    if (!manualTarget || !selectedFee) return;
    const numericAmount = Number(manualAmount);
    if (!Number.isFinite(numericAmount) || numericAmount <= 0) {
      return toast.error("El abono debe ser mayor a cero");
    }
    if (numericAmount > manualTarget.balance && manualTarget.balance > 0) {
      return toast.error("El abono supera el saldo deudor");
    }

    setManualBusy(true);
    const { error } = await supabase.rpc("register_fee_payment_manual", {
      p_fee_id: selectedFee,
      p_profile_id: manualTarget.member.id,
      p_amount: numericAmount,
      p_notes: manualNotes.trim() || null,
    });
    setManualBusy(false);
    if (error) return toast.error(error.message);

    toast.success("Deposito registrado como aprobado");
    void sendFinancePush();
    setManualTarget(null);
    await loadPayments(selectedFee);
  };

  const registerRefund = async () => {
    if (!refundTarget || !selectedFee) return;
    const numericAmount = Number(refundAmount);
    if (!Number.isFinite(numericAmount) || numericAmount <= 0) {
      return toast.error("La devolucion debe ser mayor a cero");
    }
    if (numericAmount > refundTarget.amountPaid) {
      return toast.error("La devolucion supera lo pagado por el fraterno");
    }

    setRefundBusy(true);
    const { error } = await supabase.rpc("register_fee_refund", {
      p_fee_id: selectedFee,
      p_profile_id: refundTarget.member.id,
      p_amount: numericAmount,
      p_notes: refundNotes.trim() || null,
    });
    setRefundBusy(false);
    if (error) return toast.error(error.message);

    toast.success("Devolucion registrada");
    void sendFinancePush();
    setRefundTarget(null);
    await loadPayments(selectedFee);
  };

  return (
    <div className="space-y-4">
      <div className="overflow-hidden rounded-2xl border border-cyan-300/25 bg-[radial-gradient(circle_at_top_left,rgba(0,224,255,0.16),transparent_38%),linear-gradient(135deg,rgba(255,214,10,0.12),rgba(255,46,147,0.08),rgba(0,0,0,0.45))] p-4">
        <div className="flex items-start justify-between gap-3">
          <div>
            <p className="flex items-center gap-2 text-xs font-black uppercase tracking-widest text-cyan-200">
              <WalletCards className="h-4 w-4" /> Tesoreria profesional
            </p>
            <h2 className="mt-2 text-2xl font-black leading-none text-white">
              Campanas financieras
            </h2>
            <p className="mt-2 text-sm font-semibold text-neutral-300">
              Crea cobros por evento, QR propio, comprobantes, devoluciones y cierre con historial.
            </p>
          </div>
          <div className="grid h-12 w-12 shrink-0 place-items-center rounded-2xl bg-[#FFD60A] text-black shadow-[0_0_28px_rgba(255,214,10,0.28)]">
            <BarChart3 className="h-5 w-5" />
          </div>
        </div>
        <div className="mt-4 grid grid-cols-3 gap-2">
          <div className="rounded-xl border border-white/10 bg-black/30 p-2">
            <p className="text-[9px] font-black uppercase tracking-widest text-neutral-500">
              Abiertas
            </p>
            <p className="text-lg font-black text-[#FFD60A]">{feeCounts.open}</p>
          </div>
          <div className="rounded-xl border border-white/10 bg-black/30 p-2">
            <p className="text-[9px] font-black uppercase tracking-widest text-neutral-500">
              Cerradas
            </p>
            <p className="text-lg font-black text-cyan-200">{feeCounts.closed}</p>
          </div>
          <div className="rounded-xl border border-white/10 bg-black/30 p-2">
            <p className="text-[9px] font-black uppercase tracking-widest text-neutral-500">
              Archivo
            </p>
            <p className="text-lg font-black text-red-200">{feeCounts.archived}</p>
          </div>
        </div>
      </div>

      <ReceiptsReviewCard onChanged={() => selectedFee && loadPayments(selectedFee)} />

      <div className="space-y-3 rounded-2xl border border-yellow-400/30 bg-neutral-950 p-3">
        <div className="flex items-center justify-between gap-2">
          <p className="flex items-center gap-2 text-xs font-black uppercase tracking-widest text-yellow-400">
            <Plus className="h-4 w-4" /> Nueva campana
          </p>
          <span className="rounded-full border border-cyan-300/25 bg-cyan-300/10 px-2 py-1 text-[10px] font-black text-cyan-200">
            {members.length} fraternos
          </span>
        </div>
        <div className="flex gap-2 overflow-x-auto pb-1">
          {CAMPAIGN_PRESETS.map((preset) => (
            <button
              key={preset.title}
              type="button"
              onClick={() => applyPreset(preset)}
              className="shrink-0 rounded-full border border-white/10 bg-white/[0.035] px-3 py-1.5 text-[10px] font-black uppercase tracking-wider text-neutral-300 transition hover:border-yellow-300/45 hover:text-yellow-200"
            >
              {preset.title}
            </button>
          ))}
        </div>
        <div className="space-y-1.5">
          <Label className="text-yellow-300">Nombre de la campana</Label>
          <Input
            placeholder="Camisas Chutus"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            className="border-neutral-800 bg-neutral-900"
          />
        </div>
        <div className="grid grid-cols-2 gap-2">
          <div className="space-y-1.5">
            <Label className="text-yellow-300">Total por socio (Bs)</Label>
            <Input
              type="number"
              inputMode="decimal"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              className="border-neutral-800 bg-neutral-900"
            />
          </div>
          <div className="space-y-1.5">
            <Label className="text-yellow-300">Vence</Label>
            <Input
              type="date"
              value={dueDate}
              onChange={(e) => setDueDate(e.target.value)}
              className="border-neutral-800 bg-neutral-900"
            />
          </div>
        </div>
        <Button
          onClick={createFee}
          disabled={busy}
          className="chutu-primary w-full rounded-xl font-black uppercase tracking-widest"
        >
          Crear campana y tabla
        </Button>
      </div>

      {fees.length > 0 && (
        <div className="space-y-3">
          <div className="rounded-2xl border border-white/10 bg-black/25 p-3">
            <div className="mb-3 flex items-center justify-between gap-2">
              <p className="flex items-center gap-2 text-xs font-black uppercase tracking-widest text-neutral-300">
                <ListFilter className="h-4 w-4 text-cyan-200" /> Campanas
              </p>
              <span className="text-[10px] font-bold text-neutral-500">
                {filteredFees.length}/{fees.length}
              </span>
            </div>
            <div className="mb-3 grid grid-cols-4 gap-1.5">
              {STATUS_FILTERS.map((filter) => (
                <button
                  key={filter.value}
                  type="button"
                  onClick={() => setCampaignStatusFilter(filter.value)}
                  className={`rounded-xl border px-1.5 py-2 text-[9px] font-black uppercase tracking-wider transition ${
                    campaignStatusFilter === filter.value
                      ? "border-yellow-300 bg-yellow-300 text-black"
                      : "border-white/10 bg-white/[0.035] text-neutral-400 hover:text-neutral-100"
                  }`}
                >
                  {filter.label}
                </button>
              ))}
            </div>
            <div className="grid gap-2">
              {filteredFees.map((f) => (
                <button
                  key={f.id}
                  onClick={() => setSelectedFee(f.id)}
                  className={`rounded-xl border p-3 text-left transition ${
                    selectedFee === f.id
                      ? "border-yellow-400 bg-yellow-400/12 shadow-[0_0_24px_rgba(255,214,10,0.14)]"
                      : "border-neutral-800 bg-neutral-950 hover:border-neutral-600"
                  }`}
                >
                  <div className="flex items-center justify-between gap-2">
                    <span className="truncate text-sm font-black text-white">{f.title}</span>
                    <span className="rounded-full border border-white/10 bg-black/35 px-2 py-0.5 text-[10px] font-black text-yellow-200">
                      Bs {Number(f.amount).toFixed(0)}
                    </span>
                  </div>
                  <div className="mt-2 flex items-center justify-between gap-2 text-[10px] font-bold text-neutral-500">
                    <span>{campaignStateLabel(f)}</span>
                    <span>
                      {f.due_date
                        ? `Vence ${new Date(f.due_date).toLocaleDateString("es-BO")}`
                        : "Sin vencimiento"}
                    </span>
                  </div>
                </button>
              ))}
              {filteredFees.length === 0 && (
                <p className="rounded-xl border border-white/10 bg-white/[0.035] p-3 text-sm font-bold text-neutral-500">
                  No hay campanas en este estado.
                </p>
              )}
            </div>
          </div>

          {fee && (
            <div className="overflow-hidden rounded-xl border border-yellow-400/30 bg-neutral-950">
              <div className="flex flex-wrap items-center justify-between gap-3 border-b border-yellow-400/15 bg-black/35 p-3">
                <div>
                  <div className="flex flex-wrap items-center gap-2">
                    {editingFeeName ? (
                      <div className="flex min-w-0 flex-1 items-center gap-1">
                        <Input
                          value={feeNameDraft}
                          onChange={(e) => setFeeNameDraft(e.target.value)}
                          onKeyDown={(e) => {
                            if (e.key === "Enter") void updateFeeName();
                            if (e.key === "Escape") {
                              setFeeNameDraft(fee.title);
                              setEditingFeeName(false);
                            }
                          }}
                          className="h-8 min-w-40 border-yellow-400/35 bg-neutral-950 text-sm font-black text-yellow-200"
                        />
                        <Button
                          onClick={updateFeeName}
                          disabled={renamingFee}
                          size="icon"
                          variant="outline"
                          aria-label="Guardar nombre del cobro"
                          className="h-8 w-8 border-green-400/35 bg-green-400/10 text-green-200 hover:bg-green-400/20"
                        >
                          <Check className="h-4 w-4" aria-hidden="true" />
                        </Button>
                        <Button
                          onClick={() => {
                            setFeeNameDraft(fee.title);
                            setEditingFeeName(false);
                          }}
                          size="icon"
                          variant="outline"
                          aria-label="Cancelar edicion del nombre"
                          className="h-8 w-8 border-neutral-700 bg-transparent text-neutral-300 hover:bg-neutral-800"
                        >
                          <X className="h-4 w-4" aria-hidden="true" />
                        </Button>
                      </div>
                    ) : (
                      <button
                        type="button"
                        onClick={() => setEditingFeeName(true)}
                        className="group inline-flex min-w-0 items-center gap-1.5 text-left text-sm font-black text-yellow-300"
                        title="Editar nombre del cobro"
                      >
                        <span className="truncate">{fee.title}</span>
                        <Pencil className="h-3.5 w-3.5 text-yellow-300/55 transition group-hover:text-yellow-200" />
                      </button>
                    )}
                    <span
                      className={`rounded-full px-2 py-0.5 text-[10px] font-black uppercase tracking-wider ${
                        feeStatus(fee) === "archived"
                          ? "bg-red-400/15 text-red-300"
                          : feeStatus(fee) === "closed"
                            ? "bg-cyan-400/15 text-cyan-200"
                            : fee.is_active
                              ? "bg-green-400/15 text-green-300"
                              : "bg-neutral-700/60 text-neutral-300"
                      }`}
                    >
                      {feeStatus(fee) === "archived"
                        ? "Archivado"
                        : feeStatus(fee) === "closed"
                          ? "Cerrado"
                          : fee.is_active
                            ? "Visible"
                            : "Oculto"}
                    </span>
                  </div>
                  <p className="text-[11px] text-neutral-400">
                    {totals.paidCount}/{members.length} al dia - En revision Bs{" "}
                    {money(totals.reviewingAmount)}
                  </p>
                </div>
                <div className="flex flex-wrap items-center justify-end gap-2">
                  <Button
                    onClick={exportCampaignCsv}
                    size="sm"
                    variant="outline"
                    disabled={!ledgerRows.length}
                    className="h-8 border-green-400/35 bg-transparent px-3 text-[10px] font-black text-green-200 hover:bg-green-400/10"
                  >
                    <FileDown className="h-3.5 w-3.5" /> CSV
                  </Button>
                  <Button
                    onClick={openFeeEditor}
                    size="sm"
                    variant="outline"
                    className="h-8 border-cyan-300/35 bg-transparent px-3 text-[10px] font-black text-cyan-200 hover:bg-cyan-300/10"
                  >
                    <FilePenLine className="h-3.5 w-3.5" /> Parametros
                  </Button>
                  <div className="flex items-center gap-2 rounded-full border border-yellow-400/25 bg-yellow-400/8 px-3 py-1.5">
                    <span className="text-[10px] font-black uppercase tracking-wider text-yellow-200">
                      Habilitado
                    </span>
                    <Switch
                      checked={fee.is_active && feeStatus(fee) === "open"}
                      onCheckedChange={toggleFeeActive}
                      disabled={feeStatus(fee) === "archived" || feeActionBusy}
                    />
                  </div>
                  <Button
                    onClick={syncObligations}
                    size="sm"
                    variant="outline"
                    disabled={feeStatus(fee) === "archived"}
                    className="h-8 border-yellow-400/35 bg-transparent px-3 text-[10px] font-black text-yellow-200 hover:bg-yellow-400/10"
                  >
                    Obligacion
                  </Button>
                  {feeStatus(fee) === "closed" ? (
                    <Button
                      onClick={reopenFee}
                      size="sm"
                      variant="outline"
                      disabled={feeActionBusy}
                      className="h-8 border-green-400/35 bg-transparent px-3 text-[10px] font-black text-green-200 hover:bg-green-400/10"
                    >
                      <RotateCcw className="h-3.5 w-3.5" /> Reabrir
                    </Button>
                  ) : (
                    <Button
                      onClick={closeFee}
                      size="sm"
                      variant="outline"
                      disabled={feeActionBusy || feeStatus(fee) === "archived"}
                      className="h-8 border-cyan-300/35 bg-transparent px-3 text-[10px] font-black text-cyan-200 hover:bg-cyan-300/10"
                    >
                      <Lock className="h-3.5 w-3.5" /> Cerrar
                    </Button>
                  )}
                  <Button
                    onClick={() => selectedFee && loadPayments(selectedFee)}
                    size="icon"
                    variant="outline"
                    aria-label="Actualizar tabla"
                    className="border-cyan-300/35 bg-transparent text-cyan-200 hover:bg-cyan-300/10"
                  >
                    <RefreshCw className="h-4 w-4" aria-hidden="true" />
                  </Button>
                  <Button
                    onClick={() => archiveOrDeleteFee(fee.id)}
                    size="icon"
                    variant="outline"
                    aria-label={`Eliminar o archivar cuota ${fee.title}`}
                    className="border-red-500/40 bg-transparent text-red-300 hover:bg-red-500/10"
                  >
                    <Trash2 className="h-4 w-4" aria-hidden="true" />
                  </Button>
                </div>
              </div>

              <div className="grid gap-3 border-b border-yellow-400/15 bg-black/20 p-3">
                <div className="grid grid-cols-2 gap-2">
                  <div className="rounded-xl border border-green-400/25 bg-green-400/8 p-3">
                    <p className="text-[9px] font-black uppercase tracking-widest text-green-300">
                      Recaudado
                    </p>
                    <p className="mt-1 text-xl font-black text-green-200">
                      Bs {money(totals.amountPaid)}
                    </p>
                  </div>
                  <div className="rounded-xl border border-red-400/25 bg-red-400/8 p-3">
                    <p className="text-[9px] font-black uppercase tracking-widest text-red-300">
                      Pendiente
                    </p>
                    <p className="mt-1 text-xl font-black text-red-200">
                      Bs {money(totals.balance)}
                    </p>
                  </div>
                  <div className="rounded-xl border border-cyan-300/25 bg-cyan-300/8 p-3">
                    <p className="text-[9px] font-black uppercase tracking-widest text-cyan-200">
                      Revision
                    </p>
                    <p className="mt-1 text-xl font-black text-cyan-100">
                      Bs {money(totals.reviewingAmount)}
                    </p>
                  </div>
                  <div className="rounded-xl border border-yellow-400/25 bg-yellow-400/8 p-3">
                    <p className="text-[9px] font-black uppercase tracking-widest text-yellow-200">
                      Avance
                    </p>
                    <p className="mt-1 text-xl font-black text-yellow-100">{selectedProgress}%</p>
                  </div>
                </div>
                <div className="rounded-xl border border-white/10 bg-white/[0.035] p-3">
                  <div className="mb-2 flex items-center justify-between text-[10px] font-black uppercase tracking-widest">
                    <span className="flex items-center gap-1.5 text-neutral-400">
                      <Target className="h-3.5 w-3.5 text-yellow-300" /> Cierre de campana
                    </span>
                    <span
                      className={`inline-flex items-center gap-1 ${readyToClose ? "text-green-300" : "text-yellow-200"}`}
                    >
                      {readyToClose && <CheckCircle2 className="h-3.5 w-3.5" />}
                      {readyToClose ? "Lista para cerrar" : "En cobranza"}
                    </span>
                  </div>
                  <div className="h-3 overflow-hidden rounded-full border border-white/10 bg-black/40">
                    <div
                      className="h-full rounded-full bg-gradient-to-r from-green-500 via-[#FFD60A] to-[#00E0FF] transition-all duration-700"
                      style={{ width: `${selectedProgress}%` }}
                    />
                  </div>
                </div>
              </div>

              <div className="grid gap-3 border-b border-yellow-400/15 bg-black/20 p-3">
                <QrSettingsCard
                  feeId={fee.id}
                  feeTitle={fee.title}
                  feeQrUrl={fee.payment_qr_url ?? null}
                  onChanged={loadFees}
                />
              </div>

              <Table wrapperClassName="overflow-hidden" className="table-fixed text-[10px]">
                <TableHeader>
                  <TableRow className="border-yellow-400/20 bg-yellow-400 text-black hover:bg-yellow-400">
                    <TableHead className="w-[6%] px-1 text-center font-black text-black">
                      No
                    </TableHead>
                    <TableHead className="w-[21%] px-1 font-black text-black">Nick</TableHead>
                    <TableHead className="w-[10%] px-1 text-right font-black text-black">
                      Total
                    </TableHead>
                    <TableHead className="w-[10%] px-1 text-right font-black text-black">
                      1er
                    </TableHead>
                    <TableHead className="w-[10%] px-1 text-right font-black text-black">
                      2do
                    </TableHead>
                    <TableHead className="w-[10%] px-1 text-right font-black text-black">
                      Dev.
                    </TableHead>
                    <TableHead className="w-[8%] px-1 text-center font-black text-black">
                      T
                    </TableHead>
                    <TableHead className="w-[11%] px-1 text-right font-black text-black">
                      Debe
                    </TableHead>
                    <TableHead className="w-[14%] px-1 text-right font-black text-black">
                      Acc.
                    </TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {ledgerRows.map((row, index) => (
                    <TableRow
                      key={row.member.id}
                      className={`border-neutral-800 ${
                        row.status === "paid"
                          ? "bg-green-500/6 hover:bg-green-500/10"
                          : row.status === "reviewing"
                            ? "bg-amber-400/6 hover:bg-amber-400/10"
                            : "bg-neutral-950 hover:bg-neutral-900"
                      }`}
                    >
                      <TableCell className="px-1 py-1 text-center font-bold text-neutral-500">
                        {index + 1}
                      </TableCell>
                      <TableCell className="px-1 py-1">
                        <p className="truncate font-black text-neutral-100">
                          {row.member.nickname || row.member.full_name}
                        </p>
                      </TableCell>
                      <TableCell className="px-1 py-1 text-right font-black text-neutral-100">
                        {moneyCompact(row.amountDue)}
                      </TableCell>
                      <TableCell className="px-1 py-1 text-right font-bold text-green-300">
                        {row.firstPayment > 0 ? moneyCompact(row.firstPayment) : "-"}
                      </TableCell>
                      <TableCell className="px-1 py-1 text-right font-bold text-green-300">
                        {row.secondPayment > 0
                          ? moneyCompact(row.secondPayment)
                          : row.extraPaid > 0
                            ? `+${moneyCompact(row.extraPaid)}`
                            : "-"}
                      </TableCell>
                      <TableCell className="px-1 py-1 text-right font-black text-red-300">
                        {row.refundAmount > 0 ? moneyCompact(row.refundAmount) : "-"}
                      </TableCell>
                      <TableCell className="px-1 py-1 text-center font-black text-cyan-200">
                        {shirtSize(row.member.tshirt_size)}
                      </TableCell>
                      <TableCell
                        className={`px-1 py-1 text-right font-black ${
                          row.balance <= 0 ? "text-green-300" : "text-red-300"
                        }`}
                      >
                        {moneyCompact(row.balance)}
                      </TableCell>
                      <TableCell className="px-1 py-1">
                        <div className="flex justify-end gap-1">
                          <Button
                            size="sm"
                            onClick={() => openManualPayment(row)}
                            disabled={row.balance <= 0 || feeStatus(fee) !== "open"}
                            className="h-7 rounded-lg bg-cyan-300 px-1.5 text-[10px] font-black text-black hover:bg-cyan-200"
                          >
                            <Banknote className="h-3 w-3" />
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => openRefund(row)}
                            disabled={row.amountPaid <= 0 || feeStatus(fee) === "archived"}
                            className="h-7 rounded-lg border-red-400/35 bg-transparent px-1.5 text-red-300 hover:bg-red-400/10"
                          >
                            <Undo2 className="h-3 w-3" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
                <TableFooter className="border-yellow-400/25 bg-yellow-400 text-black">
                  <TableRow className="hover:bg-yellow-400">
                    <TableCell colSpan={2} className="px-1 py-1 text-right font-black">
                      TOTALES
                    </TableCell>
                    <TableCell className="px-1 py-1 text-right font-black">
                      {moneyCompact(totals.amountDue)}
                    </TableCell>
                    <TableCell className="px-1 py-1 text-right font-black">
                      {moneyCompact(totals.firstPayment)}
                    </TableCell>
                    <TableCell className="px-1 py-1 text-right font-black">
                      {moneyCompact(totals.secondPayment + totals.extraPaid)}
                    </TableCell>
                    <TableCell className="px-1 py-1 text-right font-black">
                      {totals.refundAmount > 0 ? moneyCompact(totals.refundAmount) : "-"}
                    </TableCell>
                    <TableCell className="px-1 py-1 text-center font-black">-</TableCell>
                    <TableCell className="px-1 py-1 text-right font-black">
                      {moneyCompact(totals.balance)}
                    </TableCell>
                    <TableCell className="px-1 py-1 text-right font-black">
                      {moneyCompact(totals.amountPaid)}
                    </TableCell>
                  </TableRow>
                </TableFooter>
              </Table>
            </div>
          )}
        </div>
      )}

      <Dialog open={feeEditOpen} onOpenChange={setFeeEditOpen}>
        <DialogContent className="border-cyan-300/35 bg-neutral-950">
          <DialogHeader>
            <DialogTitle className="text-cyan-200">Parametros del cobro</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <div className="space-y-1.5">
              <Label className="text-yellow-300">Nombre</Label>
              <Input
                value={feeEditTitle}
                onChange={(e) => setFeeEditTitle(e.target.value)}
                className="border-neutral-800 bg-neutral-900"
              />
            </div>
            <div className="grid grid-cols-2 gap-2">
              <div className="space-y-1.5">
                <Label className="text-yellow-300">Monto por socio (Bs)</Label>
                <Input
                  type="number"
                  inputMode="decimal"
                  value={feeEditAmount}
                  onChange={(e) => setFeeEditAmount(e.target.value)}
                  className="border-neutral-800 bg-neutral-900"
                />
              </div>
              <div className="space-y-1.5">
                <Label className="text-yellow-300">Vence</Label>
                <Input
                  type="date"
                  value={feeEditDueDate}
                  onChange={(e) => setFeeEditDueDate(e.target.value)}
                  className="border-neutral-800 bg-neutral-900"
                />
              </div>
            </div>
            <div className="flex items-center justify-between rounded-xl border border-yellow-400/20 bg-yellow-400/8 px-3 py-2">
              <div>
                <p className="text-xs font-black uppercase tracking-widest text-yellow-200">
                  Visible para fraternos
                </p>
                <p className="text-[11px] text-neutral-400">
                  Si esta apagado, no aparece para pagar.
                </p>
              </div>
              <Switch checked={feeEditActive} onCheckedChange={setFeeEditActive} />
            </div>
            <Button
              onClick={updateFeeDetails}
              disabled={feeEditBusy}
              className="w-full bg-cyan-300 font-black text-black hover:bg-cyan-200"
            >
              {feeEditBusy ? "Guardando..." : "Guardar parametros"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={!!manualTarget} onOpenChange={(open) => !open && setManualTarget(null)}>
        <DialogContent className="border-yellow-400/40 bg-neutral-950">
          <DialogHeader>
            <DialogTitle className="text-yellow-400">Registrar deposito aprobado</DialogTitle>
          </DialogHeader>
          {manualTarget && (
            <div className="space-y-3">
              <div className="rounded-xl border border-white/10 bg-white/[0.035] p-3">
                <p className="text-sm font-black text-white">
                  {manualTarget.member.nickname || manualTarget.member.full_name}
                </p>
                <p className="text-xs text-neutral-400">
                  Total Bs {money(manualTarget.amountDue)} - Pagado Bs{" "}
                  {money(manualTarget.amountPaid)} - Saldo Bs {money(manualTarget.balance)}
                </p>
              </div>
              <div className="space-y-1.5">
                <Label className="text-yellow-300">Monto recibido (Bs)</Label>
                <Input
                  type="number"
                  inputMode="decimal"
                  value={manualAmount}
                  onChange={(e) => setManualAmount(e.target.value)}
                  className="border-neutral-800 bg-neutral-900"
                />
              </div>
              <div className="space-y-1.5">
                <Label className="text-yellow-300">Nota opcional</Label>
                <Textarea
                  value={manualNotes}
                  onChange={(e) => setManualNotes(e.target.value)}
                  placeholder="Ej: deposito Banco Union, primera cuota de camisa"
                  className="min-h-20 border-neutral-800 bg-neutral-900"
                />
              </div>
              <Button
                onClick={registerManualPayment}
                disabled={manualBusy}
                className="w-full bg-yellow-400 font-black text-black hover:bg-yellow-300"
              >
                {manualBusy ? "Registrando..." : "Registrar como pagado"}
              </Button>
            </div>
          )}
        </DialogContent>
      </Dialog>

      <Dialog open={!!refundTarget} onOpenChange={(open) => !open && setRefundTarget(null)}>
        <DialogContent className="border-red-400/40 bg-neutral-950">
          <DialogHeader>
            <DialogTitle className="text-red-300">Registrar devolucion</DialogTitle>
          </DialogHeader>
          {refundTarget && (
            <div className="space-y-3">
              <div className="rounded-xl border border-white/10 bg-white/[0.035] p-3">
                <p className="text-sm font-black text-white">
                  {refundTarget.member.nickname || refundTarget.member.full_name}
                </p>
                <p className="text-xs text-neutral-400">
                  Pagado Bs {money(refundTarget.amountPaid)} - Ya devuelto Bs{" "}
                  {money(refundTarget.refundAmount)}
                </p>
              </div>
              <div className="space-y-1.5">
                <Label className="text-red-200">Monto a devolver (Bs)</Label>
                <Input
                  type="number"
                  inputMode="decimal"
                  min="1"
                  max={refundTarget.amountPaid}
                  value={refundAmount}
                  onChange={(e) => setRefundAmount(e.target.value)}
                  className="border-neutral-800 bg-neutral-900"
                />
              </div>
              <div className="space-y-1.5">
                <Label className="text-red-200">Motivo o nota</Label>
                <Textarea
                  value={refundNotes}
                  onChange={(e) => setRefundNotes(e.target.value)}
                  placeholder="Ej: devolucion por talla, pago duplicado o ajuste de caja"
                  className="min-h-20 border-neutral-800 bg-neutral-900"
                />
              </div>
              <Button
                onClick={registerRefund}
                disabled={refundBusy}
                className="w-full bg-red-400 font-black text-black hover:bg-red-300"
              >
                {refundBusy ? "Registrando..." : "Registrar devolucion"}
              </Button>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
