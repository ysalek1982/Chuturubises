import { useEffect, useState } from "react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Check, Eye, X } from "lucide-react";
import {
  supabase,
  type Fee,
  type FeePaymentEntry,
  type Profile,
} from "@/lib/supabase";
import { sendFinancePush } from "@/lib/push-notifications";
import { toast } from "sonner";

type ReviewItem = FeePaymentEntry & {
  profile: Pick<Profile, "id" | "full_name" | "nickname" | "avatar_url"> | null;
  fee: Pick<Fee, "id" | "title" | "amount"> | null;
};

type ReceiptsReviewCardProps = {
  onChanged?: () => void;
};

export function ReceiptsReviewCard({ onChanged }: ReceiptsReviewCardProps) {
  const [items, setItems] = useState<ReviewItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [viewItem, setViewItem] = useState<ReviewItem | null>(null);
  const [signedUrl, setSignedUrl] = useState<string | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);

  const load = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from("fee_payment_entries")
      .select(
        "*, profile:profiles(id, full_name, nickname, avatar_url), fee:fees(id, title, amount)",
      )
      .eq("status", "reviewing")
      .order("created_at", { ascending: true });
    setLoading(false);
    if (error) return toast.error(error.message);
    setItems((data as ReviewItem[]) ?? []);
  };

  useEffect(() => {
    load();
  }, []);

  const openView = async (it: ReviewItem) => {
    setViewItem(it);
    setSignedUrl(null);
    if (!it.receipt_url) return;
    const { data, error } = await supabase.storage
      .from("receipts")
      .createSignedUrl(it.receipt_url, 60 * 10);
    if (error) toast.error(error.message);
    else setSignedUrl(data.signedUrl);
  };

  const approve = async (it: ReviewItem) => {
    setBusyId(it.id);
    const { error } = await supabase.rpc("approve_fee_payment_entry", {
      p_entry_id: it.id,
    });
    setBusyId(null);
    if (error) return toast.error(error.message);
    toast.success("Pago aprobado");
    void sendFinancePush();
    setViewItem(null);
    await load();
    onChanged?.();
  };

  const reject = async (it: ReviewItem) => {
    if (!confirm("Rechazar este comprobante? Se borrara la imagen.")) return;
    setBusyId(it.id);
    const receiptUrl = it.receipt_url;
    const { error } = await supabase.rpc("reject_fee_payment_entry", {
      p_entry_id: it.id,
    });
    setBusyId(null);
    if (error) return toast.error(error.message);
    if (receiptUrl) {
      await supabase.storage.from("receipts").remove([receiptUrl]);
    }
    toast.success("Comprobante rechazado");
    void sendFinancePush();
    setViewItem(null);
    await load();
    onChanged?.();
  };

  return (
    <div className="rounded-xl border border-amber-400/40 bg-neutral-950 p-3">
      <p className="mb-2 flex items-center justify-between text-xs font-black uppercase tracking-widest text-amber-300">
        <span>Comprobantes por revisar</span>
        <span className="rounded-full bg-amber-400/20 px-2 py-0.5 text-[10px] text-amber-200">
          {items.length}
        </span>
      </p>
      {loading ? (
        <p className="text-xs text-neutral-500">Cargando...</p>
      ) : items.length === 0 ? (
        <p className="text-xs text-neutral-500">Sin comprobantes pendientes.</p>
      ) : (
        <ul className="space-y-2">
          {items.map((it) => (
            <li
              key={it.id}
              className="flex items-center gap-3 rounded-lg border border-neutral-800 bg-neutral-900 p-2"
            >
              <Avatar className="h-10 w-10 border border-yellow-400/40">
                <AvatarImage src={it.profile?.avatar_url ?? undefined} className="object-cover" />
                <AvatarFallback className="bg-neutral-800 text-yellow-400">CH</AvatarFallback>
              </Avatar>
              <div className="min-w-0 flex-1">
                <p className="truncate text-xs font-bold text-yellow-300">
                  @{it.profile?.nickname ?? "?"}
                </p>
                <p className="truncate text-[10px] text-neutral-400">
                  {it.fee?.title} - Bs {Number(it.amount ?? 0).toFixed(2)}
                </p>
              </div>
              <Button
                size="sm"
                onClick={() => openView(it)}
                className="h-8 bg-yellow-400 px-3 text-[11px] font-bold text-black hover:bg-yellow-300"
              >
                <Eye className="h-3.5 w-3.5" /> Revisar
              </Button>
            </li>
          ))}
        </ul>
      )}

      <Dialog open={!!viewItem} onOpenChange={(open) => !open && setViewItem(null)}>
        <DialogContent className="border-yellow-400/40 bg-neutral-950">
          <DialogHeader>
            <DialogTitle className="text-yellow-400">
              Comprobante - @{viewItem?.profile?.nickname}
            </DialogTitle>
          </DialogHeader>
          {viewItem && (
            <>
              <p className="text-xs text-neutral-400">
                {viewItem.fee?.title} - Abono Bs {Number(viewItem.amount ?? 0).toFixed(2)}
              </p>
              <div className="max-h-[55vh] overflow-auto rounded-lg border border-yellow-400/30 bg-white">
                {signedUrl ? (
                  <img src={signedUrl} alt="Comprobante" className="w-full object-contain" />
                ) : (
                  <div className="flex h-40 items-center justify-center text-neutral-400">
                    Cargando imagen...
                  </div>
                )}
              </div>
              <div className="grid grid-cols-2 gap-2">
                <Button
                  onClick={() => approve(viewItem)}
                  disabled={busyId === viewItem.id}
                  className="bg-green-500 font-bold text-black hover:bg-green-400"
                >
                  <Check className="h-4 w-4" /> Aprobar
                </Button>
                <Button
                  onClick={() => reject(viewItem)}
                  disabled={busyId === viewItem.id}
                  variant="outline"
                  className="border-red-500/40 bg-transparent text-red-300 hover:bg-red-500/10"
                >
                  <X className="h-4 w-4" /> Rechazar
                </Button>
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
