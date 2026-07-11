import { useEffect, useMemo, useState } from "react";
import { BellRing, Cake, CalendarDays, X } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { useAuth } from "@/lib/auth";
import { registerPushDevice, showNativeNotification } from "@/lib/push-notifications";
import { supabase, type Profile } from "@/lib/supabase";
import { todayBoliviaISO } from "@/lib/bolivia-time";

type BirthdayHit = {
  profile: Profile;
  date: string;
  daysAway: number;
  age: number | null;
};

function addDaysISO(value: string, days: number) {
  const [year, month, day] = value.split("-").map(Number);
  const date = new Date(year ?? 2000, (month ?? 1) - 1, day ?? 1);
  date.setDate(date.getDate() + days);
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
}

function birthdayAge(profile: Profile, year: number) {
  if (!profile.birth_date) return null;
  const birthYear = Number(profile.birth_date.slice(0, 4));
  if (!Number.isFinite(birthYear) || birthYear < 1900) return null;
  return year - birthYear;
}

function birthdayHits(profiles: Profile[], today: string) {
  const targetDates = Array.from({ length: 8 }, (_, daysAway) => ({
    daysAway,
    date: addDaysISO(today, daysAway),
  }));

  return profiles
    .filter((profile) => profile.approval_status === "approved" && profile.birth_date)
    .flatMap((profile) => {
      const monthDay = profile.birth_date!.slice(5, 10);
      return targetDates
        .filter((target) => target.date.slice(5, 10) === monthDay)
        .map((target) => ({
          profile,
          date: target.date,
          daysAway: target.daysAway,
          age: birthdayAge(profile, Number(target.date.slice(0, 4))),
        }));
    })
    .sort(
      (a, b) => a.daysAway - b.daysAway || a.profile.nickname.localeCompare(b.profile.nickname),
    );
}

function birthdayLabel(daysAway: number) {
  if (daysAway === 0) return "Hoy";
  if (daysAway === 1) return "Mañana";
  return `En ${daysAway} días`;
}

function birthdaySummary(hits: BirthdayHit[]) {
  const todayHits = hits.filter((hit) => hit.daysAway === 0);
  if (todayHits.length) {
    return {
      title: todayHits.length === 1 ? "Cumpleaños Chuturubí" : "Cumpleaños Chuturubis",
      body:
        todayHits.length === 1
          ? `Hoy cumple @${todayHits[0].profile.nickname}.`
          : `Hoy cumplen ${todayHits.map((hit) => `@${hit.profile.nickname}`).join(", ")}.`,
    };
  }
  const tomorrowHits = hits.filter((hit) => hit.daysAway === 1);
  if (tomorrowHits.length) {
    return {
      title: "Cumpleaños mañana",
      body:
        tomorrowHits.length === 1
          ? `Mañana cumple @${tomorrowHits[0].profile.nickname}.`
          : `Mañana cumplen ${tomorrowHits.map((hit) => `@${hit.profile.nickname}`).join(", ")}.`,
    };
  }
  return null;
}

export function BirthdayAlerts() {
  const { user } = useAuth();
  const [profiles, setProfiles] = useState<Profile[]>([]);
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const today = useMemo(() => todayBoliviaISO(), []);
  const hits = useMemo(() => birthdayHits(profiles, today), [profiles, today]);
  const spotlight = hits.filter((hit) => hit.daysAway <= 1);

  useEffect(() => {
    if (!user) return;
    supabase
      .from("profiles")
      .select("*")
      .neq("approval_status", "rejected")
      .then(({ data }) => {
        setProfiles((data as Profile[]) ?? []);
      });
  }, [user]);

  useEffect(() => {
    if (!user || !spotlight.length) return;
    const summary = birthdaySummary(spotlight);
    if (!summary) return;

    const popupKey = `chutu-birthday-popup:${user.id}:${today}`;
    if (!localStorage.getItem(popupKey)) {
      const timer = window.setTimeout(() => setOpen(true), 1200);
      localStorage.setItem(popupKey, "1");
      return () => window.clearTimeout(timer);
    }
  }, [spotlight, today, user]);

  useEffect(() => {
    if (!user || !spotlight.length) return;
    const summary = birthdaySummary(spotlight);
    if (!summary) return;

    const key = `chutu-birthday-notified:${user.id}:${today}`;
    if (localStorage.getItem(key)) return;
    localStorage.setItem(key, "1");

    supabase
      .from("notifications")
      .insert({
        profile_id: user.id,
        title: summary.title,
        body: summary.body,
        kind: "birthday",
        read: false,
      })
      .then(() => undefined);

    showNativeNotification(summary.title, {
      body: summary.body,
      tag: `birthday-${today}`,
      data: { url: "/calendario" },
    });
  }, [spotlight, today, user]);

  if (!user || !spotlight.length) return null;

  const enablePush = async () => {
    setBusy(true);
    const result = await registerPushDevice(user.id);
    setBusy(false);

    if (result === "denied") {
      toast.error("El navegador tiene bloqueadas las notificaciones.");
      return;
    }
    if (result === "unsupported") {
      toast.error("Este navegador no permite notificaciones.");
      return;
    }
    if (result === "missing-key" || result === "save-failed" || result === "local-only") {
      toast.success("Avisos nativos activados en este dispositivo.");
      return;
    }
    toast.success("Push activado para este dispositivo.");
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogContent className="overflow-hidden border-[#FFD60A]/50 bg-[#070708] p-0 text-white shadow-[0_0_70px_rgba(255,214,10,0.22)]">
        <div className="absolute inset-x-0 top-0 h-1 bg-gradient-to-r from-[#FF2E93] via-[#FFD60A] to-[#00E0FF]" />
        <DialogHeader className="px-5 pb-1 pt-6 text-left">
          <div className="mb-3 grid h-14 w-14 place-items-center rounded-2xl bg-[#FFD60A] text-black shadow-[0_0_30px_rgba(255,214,10,0.35)]">
            <Cake className="h-7 w-7" />
          </div>
          <DialogTitle className="chutu-display text-4xl leading-none text-[#FFD60A]">
            Alerta de cumple
          </DialogTitle>
          <DialogDescription className="text-sm font-bold text-white/65">
            El enjambre tiene cumpleaños cerca. Que no se pase el saludo.
          </DialogDescription>
        </DialogHeader>

        <div className="px-5 pb-5 pt-2">
          <div className="space-y-2">
            {spotlight.map((hit) => (
              <article
                key={`${hit.profile.id}-${hit.date}`}
                className="rounded-2xl border border-white/10 bg-white/[0.045] p-3"
              >
                <div className="flex items-center gap-3">
                  <img
                    src={hit.profile.avatar_url ?? "/logo.png"}
                    alt=""
                    className="h-12 w-12 rounded-xl border border-[#FFD60A]/40 object-cover"
                  />
                  <div className="min-w-0 flex-1">
                    <p className="text-[10px] font-black uppercase tracking-[0.22em] text-[#00E0FF]">
                      {birthdayLabel(hit.daysAway)}
                    </p>
                    <p className="truncate text-sm font-black text-white">
                      @{hit.profile.nickname}
                    </p>
                    <p className="truncate text-xs text-white/55">
                      {hit.profile.full_name}
                      {hit.age ? ` - ${hit.age} anos` : ""}
                    </p>
                  </div>
                </div>
              </article>
            ))}
          </div>

          <div className="mt-4 grid grid-cols-2 gap-2">
            <Button
              type="button"
              onClick={enablePush}
              disabled={busy}
              className="chutu-primary h-11 rounded-xl text-[11px] font-black uppercase tracking-widest"
            >
              <BellRing className="h-4 w-4" />
              {busy ? "Activando" : "Avisos"}
            </Button>
            <Button
              type="button"
              asChild
              variant="outline"
              className="chutu-outline h-11 rounded-xl text-[11px] font-black uppercase tracking-widest"
            >
              <a href="/calendario">
                <CalendarDays className="h-4 w-4" />
                Calendario
              </a>
            </Button>
          </div>

          <button
            type="button"
            onClick={() => setOpen(false)}
            className="mx-auto mt-3 flex items-center gap-1.5 text-xs font-bold text-white/45"
          >
            <X className="h-3.5 w-3.5" />
            Cerrar por ahora
          </button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
