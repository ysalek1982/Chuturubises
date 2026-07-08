import { useEffect, useMemo, useRef, useState } from "react";
import { AlertCircle, Camera, CheckCircle2, Clock, QrCode, Upload } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { useAuth } from "@/lib/auth";
import { compressImage } from "@/lib/image-compress";
import {
  supabase,
  type Fee,
  type FeePayment,
  type FeePaymentEntry,
} from "@/lib/supabase";
import { toast } from "sonner";

type FeeRow = {
  fee: Fee;
  payment: FeePayment | null;
  entries: FeePaymentEntry[];
  amountDue: number;
  amountPaid: number;
  reviewingAmount: number;
  balance: number;
  status: "paid" | "reviewing" | "pending";
};

const money = (value: number | null | undefined) => Number(value ?? 0).toFixed(2);

export function MisCuotas() {
  const { user } = useAuth();
  const [fees, setFees] = useState<Fee[]>([]);
  const [payments, setPayments] = useState<FeePayment[]>([]);
  const [entries, setEntries] = useState<FeePaymentEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [qrUrl, setQrUrl] = useState<string | null>(null);
  const [qrOpen, setQrOpen] = useState(false);
  const [uploadingFeeId, setUploadingFeeId] = useState<string | null>(null);
  const [amountByFee, setAmountByFee] = useState<Record<string, string>>({});
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const cameraInputRef = useRef<HTMLInputElement | null>(null);
  const pendingFeeRef = useRef<string | null>(null);

  const reload = async () => {
    if (!user) return;
    const [{ data: f }, { data: p }, { data: e }, { data: qr }] = await Promise.all([
      supabase.from("fees").select("*").order("due_date", { ascending: false }),
      supabase.from("fee_payments").select("*").eq("profile_id", user.id),
      supabase.from("fee_payment_entries").select("*").eq("profile_id", user.id),
      supabase.from("fraternity_settings").select("value").eq("key", "payment_qr_url").maybeSingle(),
    ]);
    setFees((f as Fee[]) ?? []);
    setPayments((p as FeePayment[]) ?? []);
    setEntries((e as FeePaymentEntry[]) ?? []);
    setQrUrl((qr?.value as string) || null);
    setLoading(false);
  };

  useEffect(() => {
    reload();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user]);

  const rows = useMemo<FeeRow[]>(() => {
    const payMap = new Map(payments.map((p) => [p.fee_id, p]));
    const entryMap = new Map<string, FeePaymentEntry[]>();
    entries.forEach((entry) => {
      const list = entryMap.get(entry.fee_id) ?? [];
      list.push(entry);
      entryMap.set(entry.fee_id, list);
    });

    return fees.map((fee) => {
      const payment = payMap.get(fee.id) ?? null;
      const feeEntries = entryMap.get(fee.id) ?? [];
      const paidFromEntries = feeEntries
        .filter((entry) => entry.status === "paid")
        .reduce((sum, entry) => sum + Number(entry.amount), 0);
      const reviewingAmount = feeEntries
        .filter((entry) => entry.status === "reviewing")
        .reduce((sum, entry) => sum + Number(entry.amount), 0);
      const amountDue = Number(payment?.amount_due && payment.amount_due > 0 ? payment.amount_due : fee.amount);
      const legacyPaid =
        paidFromEntries === 0 && payment?.status === "paid"
          ? Number(payment.amount_paid && payment.amount_paid > 0 ? payment.amount_paid : amountDue)
          : 0;
      const amountPaid = Number(payment?.amount_paid ?? 0) > 0 ? Number(payment?.amount_paid) : paidFromEntries + legacyPaid;
      const balance = Math.max(amountDue - amountPaid, 0);
      const status = balance <= 0 ? "paid" : reviewingAmount > 0 ? "reviewing" : "pending";

      return {
        fee,
        payment,
        entries: feeEntries,
        amountDue,
        amountPaid,
        reviewingAmount,
        balance,
        status,
      };
    });
  }, [entries, fees, payments]);

  if (loading) return null;
  if (!fees.length) return null;

  const pendingTotal = rows.reduce((sum, row) => sum + row.balance, 0);
  const reviewingTotal = rows.reduce((sum, row) => sum + row.reviewingAmount, 0);
  const allPaid = pendingTotal === 0;
  const rowMap = new Map(rows.map((row) => [row.fee.id, row]));

  const openUpload = (feeId: string, source: "camera" | "gallery") => {
    const row = rowMap.get(feeId);
    if (!row || row.balance <= 0) return toast.error("Esta cuota ya esta pagada");
    const current = amountByFee[feeId] ?? money(row.balance);
    const numericAmount = Number(current);
    if (!Number.isFinite(numericAmount) || numericAmount <= 0) {
      return toast.error("Indica el monto del abono");
    }
    if (numericAmount > row.balance) {
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
    const row = rowMap.get(feeId);
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
          <p className="chutu-eyebrow text-[#FFD60A]">Mis cuotas</p>
          <h3 className="mt-1 text-lg font-black text-white">
            {allPaid ? "Al dia con la fraternidad" : `Saldo Bs ${money(pendingTotal)}`}
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

      <ul className="space-y-2">
        {rows.map((row) => {
          const paid = row.status === "paid";
          const reviewing = row.status === "reviewing";
          const uploadAmount = amountByFee[row.fee.id] ?? money(row.balance);
          const borderClass = paid
            ? "border-green-400/25 bg-green-400/7"
            : reviewing
              ? "border-amber-300/35 bg-amber-300/7"
              : "border-red-400/25 bg-red-400/7";
          return (
            <li key={row.fee.id} className={`rounded-2xl border p-3 text-xs ${borderClass}`}>
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <p className="truncate text-sm font-black text-neutral-100">{row.fee.title}</p>
                  <p className="mt-0.5 text-[10px] font-bold text-neutral-500">
                    {row.fee.due_date
                      ? `Vence ${new Date(row.fee.due_date).toLocaleDateString("es-BO")}`
                      : "Sin vencimiento"}
                  </p>
                  <div className="mt-2 flex flex-wrap gap-1.5">
                    <span className="rounded-full bg-black/25 px-2 py-1 text-[10px] font-black uppercase tracking-wider text-neutral-300">
                      Total Bs {money(row.amountDue)}
                    </span>
                    <span className="rounded-full bg-green-400/10 px-2 py-1 text-[10px] font-black uppercase tracking-wider text-green-300">
                      Pagado Bs {money(row.amountPaid)}
                    </span>
                    {row.reviewingAmount > 0 && (
                      <span className="rounded-full bg-amber-400/10 px-2 py-1 text-[10px] font-black uppercase tracking-wider text-amber-300">
                        Revision Bs {money(row.reviewingAmount)}
                      </span>
                    )}
                  </div>
                </div>
                <p
                  className={`shrink-0 text-right text-lg font-black ${
                    paid ? "text-green-300" : reviewing ? "text-amber-300" : "text-red-300"
                  }`}
                >
                  Bs {money(row.balance)}
                </p>
              </div>

              <p className="mt-2 inline-flex items-center gap-1 rounded-full bg-black/25 px-2 py-1 text-[10px] font-black uppercase tracking-wider text-neutral-300">
                {paid && (
                  <>
                    <CheckCircle2 className="h-3 w-3 text-green-300" /> Pagado
                  </>
                )}
                {reviewing && (
                  <>
                    <Clock className="h-3 w-3 text-amber-300" /> En revision
                  </>
                )}
                {row.status === "pending" && "Pendiente"}
              </p>

              {!paid && (
                <div className="mt-3 space-y-2">
                  <div className="grid grid-cols-[1fr_auto] items-center gap-2">
                    <Input
                      type="number"
                      inputMode="decimal"
                      min="1"
                      max={row.balance}
                      value={uploadAmount}
                      onChange={(e) =>
                        setAmountByFee((prev) => ({ ...prev, [row.fee.id]: e.target.value }))
                      }
                      className="h-9 border-neutral-800 bg-neutral-950 text-xs font-bold"
                    />
                    <span className="text-[10px] font-black uppercase tracking-widest text-neutral-500">
                      Abono Bs
                    </span>
                  </div>
                  <div className="grid grid-cols-3 gap-2">
                    {qrUrl && (
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => setQrOpen(true)}
                        className="chutu-outline h-9 rounded-xl px-2 text-[10px] font-black"
                      >
                        <QrCode className="h-3.5 w-3.5" /> QR
                      </Button>
                    )}
                    <Button
                      size="sm"
                      onClick={() => openUpload(row.fee.id, "camera")}
                      disabled={uploadingFeeId === row.fee.id}
                      className="chutu-primary h-9 rounded-xl px-2 text-[10px] font-black"
                    >
                      <Camera className="h-3.5 w-3.5" /> Camara
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => openUpload(row.fee.id, "gallery")}
                      disabled={uploadingFeeId === row.fee.id}
                      className="chutu-outline h-9 rounded-xl px-2 text-[10px] font-black"
                    >
                      <Upload className="h-3.5 w-3.5" />
                      {uploadingFeeId === row.fee.id ? "..." : reviewing ? "Reenviar" : "Galeria"}
                    </Button>
                  </div>
                </div>
              )}
            </li>
          );
        })}
      </ul>

      <Dialog open={qrOpen} onOpenChange={setQrOpen}>
        <DialogContent className="border-yellow-400/40 bg-neutral-950">
          <DialogHeader>
            <DialogTitle className="text-yellow-400">QR de pago</DialogTitle>
          </DialogHeader>
          {qrUrl && (
            <img
              src={qrUrl}
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
