import { useEffect, useState } from "react";
import { Bell, BellRing, Smartphone } from "lucide-react";
import { toast } from "sonner";
import { supabase, type AppNotification } from "@/lib/supabase";
import { useAuth } from "@/lib/auth";
import {
  getNotificationPermission,
  registerPushDevice,
  showNativeNotification,
} from "@/lib/push-notifications";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";

function notificationUrl(kind: string) {
  if (kind === "birthday") return "/calendario";
  if (kind === "finance_receipt_submitted") return "/admin";
  if (kind.startsWith("finance_")) return "/finanzas";
  return "/";
}

export function NotificationsBell() {
  const { user } = useAuth();
  const [items, setItems] = useState<AppNotification[]>([]);
  const [open, setOpen] = useState(false);
  const [pushState, setPushState] = useState(() => getNotificationPermission());
  const [pushBusy, setPushBusy] = useState(false);

  const load = async () => {
    if (!user) return;
    const { data } = await supabase
      .from("notifications")
      .select("*")
      .eq("profile_id", user.id)
      .order("created_at", { ascending: false })
      .limit(30);
    setItems((data as AppNotification[]) ?? []);
  };

  useEffect(() => {
    load();
    if (!user) return;
    const ch = supabase
      .channel(`notif_${user.id}`)
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "notifications", filter: `profile_id=eq.${user.id}` },
        (payload) => {
          const next = payload.new as AppNotification;
          load();
          toast.message(next.title, { description: next.body ?? undefined });
          showNativeNotification(next.title, {
            body: next.body ?? undefined,
            tag: next.id,
            data: { url: notificationUrl(next.kind) },
          });
        },
      )
      .subscribe();
    return () => {
      supabase.removeChannel(ch);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user]);

  const unread = items.filter((n) => !n.read).length;

  const markAllRead = async () => {
    if (!user || unread === 0) return;
    await supabase.from("notifications").update({ read: true }).eq("profile_id", user.id).eq("read", false);
    load();
  };

  const enablePush = async () => {
    if (!user) return;
    setPushBusy(true);
    const result = await registerPushDevice(user.id);
    setPushState(getNotificationPermission());
    setPushBusy(false);

    if (result === "denied") {
      toast.error("El navegador tiene bloqueadas las notificaciones.");
      return;
    }
    if (result === "unsupported") {
      toast.error("Este navegador no permite notificaciones.");
      return;
    }
    if (result === "missing-key") {
      toast.success("Avisos nativos activos. Falta clave VAPID para push de fondo.");
      return;
    }
    if (result === "save-failed") {
      toast.success("Avisos nativos activos. Falta aplicar la tabla push en Supabase.");
      return;
    }
    if (result === "local-only") {
      toast.success("Avisos nativos activos mientras uses la app.");
      return;
    }
    toast.success("Push activado en este dispositivo.");
  };

  if (!user) return null;

  return (
    <Sheet
      open={open}
      onOpenChange={(o) => {
        setOpen(o);
        if (o) markAllRead();
      }}
    >
      <SheetTrigger asChild>
        <button
          aria-label="Notificaciones"
          className="fixed right-[max(0.75rem,calc((100vw-28rem)/2+0.75rem))] top-[calc(0.85rem+env(safe-area-inset-top))] z-40 flex h-10 w-10 items-center justify-center rounded-xl border border-yellow-300/35 bg-black/65 text-yellow-300 shadow-[0_12px_30px_rgba(0,0,0,0.35)] backdrop-blur-xl transition hover:bg-yellow-300/10"
        >
          <Bell className="h-5 w-5" />
          {unread > 0 && (
            <span className="absolute -right-1 -top-1 flex h-5 min-w-5 items-center justify-center rounded-full bg-[#FFC400] px-1 text-[10px] font-black text-black shadow-[0_0_10px_rgba(255,196,0,0.7)]">
              {unread > 9 ? "9+" : unread}
            </span>
          )}
        </button>
      </SheetTrigger>
      <SheetContent side="right" className="border-yellow-400/30 bg-neutral-950 text-neutral-100">
        <SheetHeader>
          <SheetTitle className="text-yellow-400">Notificaciones</SheetTitle>
        </SheetHeader>
        <div className="mt-4 rounded-2xl border border-[#FFD60A]/25 bg-[#FFD60A]/8 p-3">
          <div className="flex items-start gap-3">
            <div className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-[#FFD60A] text-black">
              <Smartphone className="h-5 w-5" />
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-sm font-black text-white">Avisos del telefono</p>
              <p className="mt-1 text-xs text-neutral-400">
                {pushState === "granted"
                  ? "Activos para este navegador."
                  : "Activalos para cumples, pagos y turnos."}
              </p>
              {pushState !== "granted" && (
                <button
                  type="button"
                  onClick={enablePush}
                  disabled={pushBusy}
                  className="mt-3 inline-flex h-9 items-center gap-2 rounded-xl bg-[#FFD60A] px-3 text-[11px] font-black uppercase tracking-widest text-black"
                >
                  <BellRing className="h-4 w-4" />
                  {pushBusy ? "Activando" : "Activar avisos"}
                </button>
              )}
            </div>
          </div>
        </div>
        <div className="mt-4 space-y-2">
          {items.length === 0 ? (
            <p className="text-sm text-neutral-500">Sin notificaciones todavía. 🐝</p>
          ) : (
            items.map((n) => (
              <div
                key={n.id}
                className={`rounded-lg border p-3 ${
                  n.read
                    ? "border-neutral-800 bg-neutral-900/60"
                    : "border-[#FFC400]/50 bg-[#FFC400]/10"
                }`}
              >
                <p className="text-sm font-bold text-yellow-300">{n.title}</p>
                {n.body && <p className="mt-0.5 text-xs text-neutral-300">{n.body}</p>}
                <p className="mt-1 text-[10px] uppercase tracking-widest text-neutral-500">
                  {new Date(n.created_at).toLocaleString("es-BO")}
                </p>
              </div>
            ))
          )}
        </div>
      </SheetContent>
    </Sheet>
  );
}
