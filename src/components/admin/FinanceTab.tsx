import { useEffect, useState } from "react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Plus, Trash2 } from "lucide-react";
import { supabase, type Fee, type FeePayment, type Profile } from "@/lib/supabase";
import { toast } from "sonner";
import { QrSettingsCard } from "./QrSettingsCard";
import { ReceiptsReviewCard } from "./ReceiptsReviewCard";

export function FinanceTab() {
  const [fees, setFees] = useState<Fee[]>([]);
  const [selectedFee, setSelectedFee] = useState<string | null>(null);
  const [members, setMembers] = useState<Profile[]>([]);
  const [payments, setPayments] = useState<FeePayment[]>([]);
  const [title, setTitle] = useState("");
  const [amount, setAmount] = useState("");
  const [dueDate, setDueDate] = useState("");
  const [busy, setBusy] = useState(false);

  const loadFees = async () => {
    const { data } = await supabase.from("fees").select("*").order("created_at", { ascending: false });
    const list = (data as Fee[]) ?? [];
    setFees(list);
    if (!selectedFee && list[0]) setSelectedFee(list[0].id);
  };
  const loadMembers = async () => {
    const { data } = await supabase
      .from("profiles")
      .select("*")
      .eq("approval_status", "approved")
      .order("full_name");
    setMembers((data as Profile[]) ?? []);
  };
  const loadPayments = async (feeId: string) => {
    const { data } = await supabase.from("fee_payments").select("*").eq("fee_id", feeId);
    setPayments((data as FeePayment[]) ?? []);
  };

  useEffect(() => {
    loadFees();
    loadMembers();
  }, []);
  useEffect(() => {
    if (selectedFee) loadPayments(selectedFee);
  }, [selectedFee]);

  const createFee = async () => {
    if (!title || !amount) return toast.error("Título y monto son obligatorios");
    setBusy(true);
    const { data, error } = await supabase
      .from("fees")
      .insert({ title, amount: Number(amount), due_date: dueDate || null })
      .select()
      .maybeSingle();
    setBusy(false);
    if (error) return toast.error(error.message);
    toast.success("Cuota creada");
    setTitle("");
    setAmount("");
    setDueDate("");
    await loadFees();
    if (data) setSelectedFee((data as Fee).id);
  };

  const deleteFee = async (id: string) => {
    if (!confirm("¿Eliminar esta cuota y todos sus pagos?")) return;
    const { error } = await supabase.from("fees").delete().eq("id", id);
    if (error) return toast.error(error.message);
    setSelectedFee(null);
    loadFees();
  };

  const togglePayment = async (profileId: string, currentlyPaid: boolean) => {
    if (!selectedFee) return;
    const existing = payments.find((p) => p.profile_id === profileId);
    const nextStatus = currentlyPaid ? "pending" : "paid";
    const paid_at = nextStatus === "paid" ? new Date().toISOString() : null;
    if (existing) {
      const { error } = await supabase
        .from("fee_payments")
        .update({ status: nextStatus, paid_at })
        .eq("id", existing.id);
      if (error) return toast.error(error.message);
    } else {
      const { error } = await supabase.from("fee_payments").insert({
        fee_id: selectedFee,
        profile_id: profileId,
        status: nextStatus,
        paid_at,
      });
      if (error) return toast.error(error.message);
    }
    loadPayments(selectedFee);
  };

  const fee = fees.find((f) => f.id === selectedFee);
  const paidCount = payments.filter((p) => p.status === "paid").length;

  return (
    <div className="space-y-4">
      <QrSettingsCard />
      <ReceiptsReviewCard />
      <div className="space-y-3 rounded-xl border border-yellow-400/30 bg-neutral-950 p-3">
        <p className="flex items-center gap-2 text-xs font-black uppercase tracking-widest text-yellow-400">
          <Plus className="h-4 w-4" /> Nueva cuota
        </p>
        <div className="space-y-1.5">
          <Label className="text-yellow-300">Título</Label>
          <Input
            placeholder="Cuota Carnaval 2027"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            className="border-neutral-800 bg-neutral-900"
          />
        </div>
        <div className="grid grid-cols-2 gap-2">
          <div className="space-y-1.5">
            <Label className="text-yellow-300">Monto (Bs)</Label>
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
        <Button onClick={createFee} disabled={busy} className="w-full bg-yellow-400 font-bold text-black hover:bg-yellow-300">
          Crear cuota
        </Button>
      </div>

      {fees.length > 0 && (
        <div className="space-y-3">
          <div className="flex flex-wrap gap-2">
            {fees.map((f) => (
              <button
                key={f.id}
                onClick={() => setSelectedFee(f.id)}
                className={`rounded-full border px-3 py-1 text-xs font-bold ${
                  selectedFee === f.id
                    ? "border-yellow-400 bg-yellow-400 text-black"
                    : "border-neutral-700 bg-neutral-900 text-neutral-300"
                }`}
              >
                {f.title} · Bs {Number(f.amount).toFixed(0)}
              </button>
            ))}
          </div>

          {fee && (
            <div className="rounded-xl border border-yellow-400/30 bg-neutral-950 p-3">
              <div className="mb-2 flex items-center justify-between">
                <div>
                  <p className="text-sm font-black text-yellow-300">{fee.title}</p>
                  <p className="text-[11px] text-neutral-400">
                    {paidCount}/{members.length} pagaron · Bs {Number(fee.amount).toFixed(2)}
                  </p>
                </div>
                <Button
                  onClick={() => deleteFee(fee.id)}
                  size="icon"
                  variant="outline"
                  aria-label={`Eliminar cuota ${fee.title}`}
                  className="border-red-500/40 bg-transparent text-red-300 hover:bg-red-500/10"
                >
                  <Trash2 className="h-4 w-4" aria-hidden="true" />
                </Button>
              </div>
              <ul className="space-y-1.5">
                {members.map((m) => {
                  const pay = payments.find((p) => p.profile_id === m.id);
                  const paid = pay?.status === "paid";
                  return (
                    <li
                      key={m.id}
                      className={`flex items-center gap-3 rounded-lg border p-2 ${
                        paid ? "border-green-500/30 bg-green-500/5" : "border-neutral-800 bg-neutral-900"
                      }`}
                    >
                      <Avatar className="h-9 w-9 border border-yellow-400/40">
                        <AvatarImage src={m.avatar_url ?? undefined} className="object-cover" />
                        <AvatarFallback className="bg-neutral-800 text-yellow-400">🐝</AvatarFallback>
                      </Avatar>
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-xs font-bold text-neutral-100">@{m.nickname}</p>
                        <p className="truncate text-[10px] text-neutral-500">{m.full_name}</p>
                      </div>
                      <Switch checked={paid} onCheckedChange={() => togglePayment(m.id, paid)} />
                    </li>
                  );
                })}
              </ul>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
