import { useEffect, useMemo, useRef, useState } from "react";
import {
  AlertCircle,
  Camera,
  CheckCircle2,
  Clock,
  QrCode,
  Upload,
  WalletCards,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import {
  Table,
  TableBody,
  TableCell,
  TableFooter,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { useAuth } from "@/lib/auth";
import { compressImage } from "@/lib/image-compress";
import { sendFinancePush } from "@/lib/push-notifications";
import { supabase } from "@/lib/supabase";
import { toast } from "sonner";

type FinanceLedgerRow = {
  fee_id: string;
  fee_title: string;
  fee_amount: number;
  fee_due_date: string | null;
  fee_status: "open" | "closed" | "archived";
  payment_qr_url: string | null;
  profile_id: string;
  nickname: string | null;
  full_name: string | null;
  tshirt_size: string | null;
  amount_due: number;
  first_payment: number;
  second_payment: number;
  extra_paid: number;
  refund_amount: number;
  amount_paid: number;
  reviewing_amount: number;
  balance: number;
  payment_status: "paid" | "reviewing" | "pending";
};

type FeeGroup = {
  feeId: string;
  title: string;
  amount: number;
  dueDate: string | null;
  status: "open" | "closed" | "archived";
  qrUrl: string | null;
  rows: FinanceLedgerRow[];
};

type MisCuotasProps = {
  showEmpty?: boolean;
};

const money = (value: number | null | undefined) => Number(value ?? 0).toFixed(2);
const moneyCompact = (value: number | null | undefined) => {
  const amount = Number(value ?? 0);
  return Number.isInteger(amount) ? amount.toFixed(0) : amount.toFixed(2);
};
const shirtSize = (value: string | null | undefined) => value?.trim().toUpperCase() || "-";

function displayName(row: FinanceLedgerRow) {
  return (row.nickname || row.full_name || "Fraterno").trim();
}

export function MisCuotas({ showEmpty = false }: MisCuotasProps) {
  const { user } = useAuth();
  const [ledgerRows, setLedgerRows] = useState<FinanceLedgerRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [qrUrl, setQrUrl] = useState<string | null>(null);
  const [qrOpen, setQrOpen] = useState(false);
  const [activeQrUrl, setActiveQrUrl] = useState<string | null>(null);
  const [uploadingFeeId, setUploadingFeeId] = useState<string | null>(null);
  const [amountByFee, setAmountByFee] = useState<Record<string, string>>({});
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const cameraInputRef = useRef<HTMLInputElement | null>(null);
  const pendingFeeRef = useRef<string | null>(null);

  const reload = async () => {
    if (!user) return;
    const [{ data: ledger, error }, { data: qr }] = await Promise.all([
      supabase.rpc("get_active_finance_ledger"),
      supabase
        .from("fraternity_settings")
        .select("value")
        .eq("key", "payment_qr_url")
        .maybeSingle(),
    ]);
    if (error) {
      toast.error(error.message);
      setLedgerRows([]);
    } else {
      setLedgerRows((ledger as FinanceLedgerRow[]) ?? []);
    }
    setQrUrl((qr?.value as string) || null);
    setLoading(false);
  };

  useEffect(() => {
    reload();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user]);

  const groups = useMemo<FeeGroup[]>(() => {
    const map = new Map<string, FeeGroup>();
    ledgerRows.forEach((row) => {
      const group =
        map.get(row.fee_id) ??
        ({
          feeId: row.fee_id,
          title: row.fee_title,
          amount: Number(row.fee_amount),
          dueDate: row.fee_due_date,
          status: row.fee_status,
          qrUrl: row.payment_qr_url,
          rows: [],
        } satisfies FeeGroup);
      group.rows.push(row);
      map.set(row.fee_id, group);
    });
    return [...map.values()].map((group) => ({
      ...group,
      rows: group.rows.sort((a, b) => displayName(a).localeCompare(displayName(b), "es")),
    }));
  }, [ledgerRows]);

  const ownRows = useMemo(
    () => ledgerRows.filter((row) => row.profile_id === user?.id),
    [ledgerRows, user?.id],
  );

  const pendingTotal = ownRows.reduce((sum, row) => sum + Number(row.balance), 0);
  const reviewingTotal = ownRows.reduce((sum, row) => sum + Number(row.reviewing_amount), 0);
  const allPaid = ownRows.length > 0 && pendingTotal === 0;
  const ownRowMap = new Map(ownRows.map((row) => [row.fee_id, row]));

  if (loading) return null;

  if (!groups.length) {
    if (!showEmpty) return null;
    return (
      <section className="chutu-panel rounded-[1.45rem] p-4">
        <p className="chutu-eyebrow text-[#FFD60A]">Finanzas</p>
        <h3 className="mt-1 text-lg font-black text-white">Sin cobros activos</h3>
        <p className="mt-2 text-sm text-neutral-400">
          Cuando el tesorero habilite una cuota, aparecera aqui la tabla de obligacion.
        </p>
      </section>
    );
  }

  const openUpload = (feeId: string, source: "camera" | "gallery") => {
    const row = ownRowMap.get(feeId);
    if (!row || Number(row.balance) <= 0) return toast.error("Esta cuota ya esta pagada");
    const current = amountByFee[feeId] ?? money(row.balance);
    const numericAmount = Number(current);
    if (!Number.isFinite(numericAmount) || numericAmount <= 0) {
      return toast.error("Indica el monto del abono");
    }
    if (numericAmount > Number(row.balance)) {
      return toast.error("El abono supera el saldo deudor");
    }

    pendingFeeRef.current = feeId;
    setAmountByFee((prev) => ({ ...prev, [feeId]: money(numericAmount) }));
    if (source === "camera") cameraInputRef.current?.click();
    else fileInputRef.current?.click();
  };

  const handleFile = async (file: File) => {
    if (!user || !pendingFeeRef.current) return;
    const feeId = pendingFeeRef.current;
    const row = ownRowMap.get(feeId);
    const numericAmount = Number(amountByFee[feeId] ?? row?.balance ?? 0);
    if (!row || !Number.isFinite(numericAmount) || numericAmount <= 0) {
      toast.error("Monto de abono invalido");
      return;
    }

    setUploadingFeeId(feeId);
    let uploadedPath: string | null = null;
    try {
      const { blob, type } = await compressImage(file, 1200, 0.85);
      const path = `${user.id}/${feeId}-${Date.now()}.jpg`;
      const { error: upErr } = await supabase.storage
        .from("receipts")
        .upload(path, blob, { contentType: type, upsert: true });
      if (upErr) throw upErr;
      uploadedPath = path;

      const { error } = await supabase.rpc("submit_fee_payment_receipt", {
        p_fee_id: feeId,
        p_amount: numericAmount,
        p_receipt_url: path,
      });
      if (error) throw error;

      toast.success("Comprobante enviado a revision");
      void sendFinancePush();
      await reload();
    } catch (e) {
      if (uploadedPath) await supabase.storage.from("receipts").remove([uploadedPath]);
      const msg = e instanceof Error ? e.message : "Error al subir comprobante";
      toast.error(msg);
    } finally {
      setUploadingFeeId(null);
      pendingFeeRef.current = null;
      if (fileInputRef.current) fileInputRef.current.value = "";
      if (cameraInputRef.current) cameraInputRef.current.value = "";
    }
  };

  return (
    <section className="chutu-panel rounded-[1.45rem] p-4">
      <div className="mb-3 flex items-center justify-between gap-3">
        <div>
          <p className="chutu-eyebrow text-[#FFD60A]">Finanzas</p>
          <h3 className="mt-1 text-lg font-black text-white">
            {allPaid ? "Al dia con la fraternidad" : `Mi saldo Bs ${money(pendingTotal)}`}
          </h3>
          {reviewingTotal > 0 && (
            <p className="mt-1 text-[11px] font-bold text-amber-300">
              Bs {money(reviewingTotal)} pendiente de revision del tesorero
            </p>
          )}
        </div>
        {allPaid ? (
          <span className="grid h-11 w-11 place-items-center rounded-2xl border border-green-400/35 bg-green-400/10 text-green-300">
            <CheckCircle2 className="h-5 w-5" />
          </span>
        ) : (
          <span className="grid h-11 w-11 place-items-center rounded-2xl border border-red-400/35 bg-red-400/10 text-red-300">
            <AlertCircle className="h-5 w-5" />
          </span>
        )}
      </div>

      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={(e) => e.target.files?.[0] && handleFile(e.target.files[0])}
      />
      <input
        ref={cameraInputRef}
        type="file"
        accept="image/*"
        capture="environment"
        className="hidden"
        onChange={(e) => e.target.files?.[0] && handleFile(e.target.files[0])}
      />

      <div className="space-y-4">
        {groups.map((group) => {
          const ownRow = ownRowMap.get(group.feeId);
          const groupTotals = group.rows.reduce(
            (acc, row) => {
              acc.total += Number(row.amount_due);
              acc.first += Number(row.first_payment);
              acc.second += Number(row.second_payment) + Number(row.extra_paid);
              acc.refund += Number(row.refund_amount);
              acc.paid += Number(row.amount_paid);
              acc.balance += Number(row.balance);
              return acc;
            },
            { total: 0, first: 0, second: 0, refund: 0, paid: 0, balance: 0 },
          );
          const uploadAmount = ownRow
            ? (amountByFee[group.feeId] ?? money(ownRow.balance))
            : "0.00";
          const groupQrUrl = group.qrUrl || qrUrl;

          return (
            <div
              key={group.feeId}
              className="overflow-hidden rounded-2xl border border-yellow-400/25 bg-neutral-950"
            >
              <div className="border-b border-yellow-400/15 bg-black/35 p-3">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="flex items-center gap-2 text-sm font-black text-yellow-300">
                      <WalletCards className="h-4 w-4" /> {group.title}
                    </p>
                    <p className="mt-1 text-[11px] text-neutral-400">
                      Obligacion por fraterno Bs {money(group.amount)}
                      {group.dueDate
                        ? ` - vence ${new Date(group.dueDate).toLocaleDateString("es-BO")}`
                        : ""}
                    </p>
                  </div>
                  <span className="rounded-full border border-cyan-300/30 bg-cyan-300/10 px-2 py-1 text-[10px] font-black text-cyan-200">
                    Activa
                  </span>
                </div>
              </div>

              <Table wrapperClassName="overflow-hidden" className="table-fixed text-[10px]">
                <TableHeader>
                  <TableRow className="border-yellow-400/20 bg-yellow-400 text-black hover:bg-yellow-400">
                    <TableHead className="w-[7%] px-1 text-center font-black text-black">
                      No
                    </TableHead>
                    <TableHead className="w-[23%] px-1 font-black text-black">Nick</TableHead>
                    <TableHead className="w-[12%] px-1 text-right font-black text-black">
                      Total
                    </TableHead>
                    <TableHead className="w-[12%] px-1 text-right font-black text-black">
                      1er
                    </TableHead>
                    <TableHead className="w-[12%] px-1 text-right font-black text-black">
                      2do
                    </TableHead>
                    <TableHead className="w-[10%] px-1 text-right font-black text-black">
                      Dev.
                    </TableHead>
                    <TableHead className="w-[11%] px-1 text-center font-black text-black">
                      T
                    </TableHead>
                    <TableHead className="w-[13%] px-1 text-right font-black text-black">
                      Debe
                    </TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {group.rows.map((row, index) => {
                    const isMe = row.profile_id === user?.id;
                    const paid = row.payment_status === "paid";
                    return (
                      <TableRow
                        key={`${row.fee_id}-${row.profile_id}`}
                        className={`border-neutral-800 ${
                          isMe
                            ? "bg-cyan-300/10 hover:bg-cyan-300/15"
                            : paid
                              ? "bg-green-500/5 hover:bg-green-500/10"
                              : "bg-neutral-950 hover:bg-neutral-900"
                        }`}
                      >
                        <TableCell className="px-1 py-1 text-center font-bold text-neutral-500">
                          {index + 1}
                        </TableCell>
                        <TableCell className="px-1 py-1">
                          <p className="truncate font-black text-neutral-100">{displayName(row)}</p>
                        </TableCell>
                        <TableCell className="px-1 py-1 text-right font-black text-neutral-100">
                          {moneyCompact(row.amount_due)}
                        </TableCell>
                        <TableCell className="px-1 py-1 text-right font-bold text-green-300">
                          {Number(row.first_payment) > 0 ? moneyCompact(row.first_payment) : "-"}
                        </TableCell>
                        <TableCell className="px-1 py-1 text-right font-bold text-green-300">
                          {Number(row.second_payment) > 0
                            ? moneyCompact(row.second_payment)
                            : Number(row.extra_paid) > 0
                              ? `+${moneyCompact(row.extra_paid)}`
                              : "-"}
                        </TableCell>
                        <TableCell className="px-1 py-1 text-right font-black text-red-300">
                          {Number(row.refund_amount) > 0 ? moneyCompact(row.refund_amount) : "-"}
                        </TableCell>
                        <TableCell className="px-1 py-1 text-center font-black text-cyan-200">
                          {shirtSize(row.tshirt_size)}
                        </TableCell>
                        <TableCell
                          className={`px-1 py-1 text-right font-black ${
                            Number(row.balance) <= 0 ? "text-green-300" : "text-red-300"
                          }`}
                        >
                          {moneyCompact(row.balance)}
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
                <TableFooter className="border-yellow-400/25 bg-yellow-400 text-black">
                  <TableRow className="hover:bg-yellow-400">
                    <TableCell colSpan={2} className="px-1 py-1 text-right font-black">
                      TOTALES
                    </TableCell>
                    <TableCell className="px-1 py-1 text-right font-black">
                      {moneyCompact(groupTotals.total)}
                    </TableCell>
                    <TableCell className="px-1 py-1 text-right font-black">
                      {moneyCompact(groupTotals.first)}
                    </TableCell>
                    <TableCell className="px-1 py-1 text-right font-black">
                      {moneyCompact(groupTotals.second)}
                    </TableCell>
                    <TableCell className="px-1 py-1 text-right font-black">
                      {groupTotals.refund > 0 ? moneyCompact(groupTotals.refund) : "-"}
                    </TableCell>
                    <TableCell className="px-1 py-1 text-center font-black">-</TableCell>
                    <TableCell className="px-1 py-1 text-right font-black">
                      {moneyCompact(groupTotals.balance)}
                    </TableCell>
                  </TableRow>
                </TableFooter>
              </Table>

              {ownRow && Number(ownRow.balance) > 0 && (
                <div className="border-t border-yellow-400/15 bg-black/25 p-3">
                  <div className="mb-2 flex items-center gap-2 rounded-xl border border-red-400/25 bg-red-400/8 px-3 py-2">
                    <Clock className="h-4 w-4 text-red-300" />
                    <p className="text-xs font-bold text-neutral-200">
                      Tu saldo para este cobro es Bs {money(ownRow.balance)}.
                    </p>
                  </div>
                  <div className="grid grid-cols-[1fr_auto] items-center gap-2">
                    <Input
                      type="number"
                      inputMode="decimal"
                      min="1"
                      max={ownRow.balance}
                      value={uploadAmount}
                      onChange={(e) =>
                        setAmountByFee((prev) => ({ ...prev, [group.feeId]: e.target.value }))
                      }
                      className="h-9 border-neutral-800 bg-neutral-950 text-xs font-bold"
                    />
                    <span className="text-[10px] font-black uppercase tracking-widest text-neutral-500">
                      Abono Bs
                    </span>
                  </div>
                  <div className="mt-2 grid grid-cols-3 gap-2">
                    {groupQrUrl && (
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => {
                          setActiveQrUrl(groupQrUrl);
                          setQrOpen(true);
                        }}
                        className="chutu-outline h-9 rounded-xl px-2 text-[10px] font-black"
                      >
                        <QrCode className="h-3.5 w-3.5" /> QR
                      </Button>
                    )}
                    <Button
                      size="sm"
                      onClick={() => openUpload(group.feeId, "camera")}
                      disabled={uploadingFeeId === group.feeId}
                      className="chutu-primary h-9 rounded-xl px-2 text-[10px] font-black"
                    >
                      <Camera className="h-3.5 w-3.5" /> Cámara
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => openUpload(group.feeId, "gallery")}
                      disabled={uploadingFeeId === group.feeId}
                      className="chutu-outline h-9 rounded-xl px-2 text-[10px] font-black"
                    >
                      <Upload className="h-3.5 w-3.5" />
                      {uploadingFeeId === group.feeId ? "..." : "Galería"}
                    </Button>
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>

      <Dialog open={qrOpen} onOpenChange={setQrOpen}>
        <DialogContent className="border-yellow-400/40 bg-neutral-950">
          <DialogHeader>
            <DialogTitle className="text-yellow-400">QR de pago</DialogTitle>
          </DialogHeader>
          {activeQrUrl && (
            <img
              src={activeQrUrl}
              alt="QR bancario de la fraternidad"
              className="mx-auto max-h-[60vh] w-full rounded-lg border border-yellow-400/30 bg-white object-contain p-2"
            />
          )}
          <p className="text-center text-[11px] text-neutral-400">
            Realiza la transferencia y sube tu comprobante para validar el abono.
          </p>
        </DialogContent>
      </Dialog>
    </section>
  );
}
