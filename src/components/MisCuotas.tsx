import { useEffect, useRef, useState } from "react";
import { AlertCircle, Camera, CheckCircle2, Clock, QrCode, Upload } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { useAuth } from "@/lib/auth";
import { compressImage } from "@/lib/image-compress";
import { supabase, type Fee, type FeePayment } from "@/lib/supabase";
import { toast } from "sonner";

export function MisCuotas() {
  const { user } = useAuth();
  const [fees, setFees] = useState<Fee[]>([]);
  const [payments, setPayments] = useState<FeePayment[]>([]);
  const [loading, setLoading] = useState(true);
  const [qrUrl, setQrUrl] = useState<string | null>(null);
  const [qrOpen, setQrOpen] = useState(false);
  const [uploadingFeeId, setUploadingFeeId] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const cameraInputRef = useRef<HTMLInputElement | null>(null);
  const pendingFeeRef = useRef<string | null>(null);

  const reload = async () => {
    if (!user) return;
    const [{ data: f }, { data: p }, { data: qr }] = await Promise.all([
      supabase.from("fees").select("*").order("due_date", { ascending: false }),
      supabase.from("fee_payments").select("*").eq("profile_id", user.id),
      supabase.from("fraternity_settings").select("value").eq("key", "payment_qr_url").maybeSingle(),
    ]);
    setFees((f as Fee[]) ?? []);
    setPayments((p as FeePayment[]) ?? []);
    setQrUrl((qr?.value as string) || null);
    setLoading(false);
  };

  useEffect(() => {
    reload();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user]);

  if (loading) return null;
  if (!fees.length) return null;

  const payMap = new Map(payments.map((p) => [p.fee_id, p]));
  const pendingTotal = fees.reduce((sum, f) => {
    const pay = payMap.get(f.id);
    return pay?.status === "paid" ? sum : sum + Number(f.amount);
  }, 0);
  const allPaid = pendingTotal === 0;

  const openUpload = (feeId: string, source: "camera" | "gallery") => {
    pendingFeeRef.current = feeId;
    if (source === "camera") cameraInputRef.current?.click();
    else fileInputRef.current?.click();
  };

  const handleFile = async (file: File) => {
    if (!user || !pendingFeeRef.current) return;
    const feeId = pendingFeeRef.current;
    setUploadingFeeId(feeId);
    try {
      const { blob, type } = await compressImage(file, 1200, 0.85);
      const path = `${user.id}/${feeId}-${Date.now()}.jpg`;
      const { error: upErr } = await supabase.storage
        .from("receipts")
        .upload(path, blob, { contentType: type, upsert: true });
      if (upErr) throw upErr;
      const existing = payMap.get(feeId);
      if (existing) {
        const { error } = await supabase
          .from("fee_payments")
          .update({ status: "reviewing", receipt_url: path, paid_at: null })
          .eq("id", existing.id);
        if (error) throw error;
      } else {
        const { error } = await supabase.from("fee_payments").insert({
          fee_id: feeId,
          profile_id: user.id,
          status: "reviewing",
          receipt_url: path,
        });
        if (error) throw error;
      }
      toast.success("Comprobante enviado. En revisión 🐝");
      await reload();
    } catch (e) {
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
            {allPaid ? "Al día con la comparsa" : `Pendiente Bs ${pendingTotal.toFixed(2)}`}
          </h3>
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
        {fees.map((f) => {
          const pay = payMap.get(f.id);
          const status = pay?.status ?? "pending";
          const paid = status === "paid";
          const reviewing = status === "reviewing";
          const borderClass = paid
            ? "border-green-400/25 bg-green-400/7"
            : reviewing
              ? "border-amber-300/35 bg-amber-300/7"
              : "border-red-400/25 bg-red-400/7";
          return (
            <li key={f.id} className={`rounded-2xl border p-3 text-xs ${borderClass}`}>
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <p className="truncate text-sm font-black text-neutral-100">{f.title}</p>
                  <p className="mt-0.5 text-[10px] font-bold text-neutral-500">
                    {f.due_date
                      ? `Vence ${new Date(f.due_date).toLocaleDateString("es-BO")}`
                      : "Sin vencimiento"}
                  </p>
                  <p className="mt-2 inline-flex items-center gap-1 rounded-full bg-black/25 px-2 py-1 text-[10px] font-black uppercase tracking-wider text-neutral-300">
                    {paid && (
                      <>
                        <CheckCircle2 className="h-3 w-3 text-green-300" /> Pagado
                      </>
                    )}
                    {reviewing && (
                      <>
                        <Clock className="h-3 w-3 text-amber-300" /> En revisión
                      </>
                    )}
                    {status === "pending" && "Pendiente"}
                  </p>
                </div>
                <p
                  className={`shrink-0 text-right text-lg font-black ${paid ? "text-green-300" : reviewing ? "text-amber-300" : "text-red-300"}`}
                >
                  Bs {Number(f.amount).toFixed(2)}
                </p>
              </div>
              {!paid && (
                <div className="mt-3 grid grid-cols-3 gap-2">
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
                    onClick={() => openUpload(f.id, "camera")}
                    disabled={uploadingFeeId === f.id}
                    className="chutu-primary h-9 rounded-xl px-2 text-[10px] font-black"
                  >
                    <Camera className="h-3.5 w-3.5" /> Cámara
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => openUpload(f.id, "gallery")}
                    disabled={uploadingFeeId === f.id}
                    className="chutu-outline h-9 rounded-xl px-2 text-[10px] font-black"
                  >
                    <Upload className="h-3.5 w-3.5" />
                    {uploadingFeeId === f.id ? "..." : reviewing ? "Reenviar" : "Galería"}
                  </Button>
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
            Realiza la transferencia y sube tu comprobante para validar el pago.
          </p>
        </DialogContent>
      </Dialog>
    </section>
  );
}
