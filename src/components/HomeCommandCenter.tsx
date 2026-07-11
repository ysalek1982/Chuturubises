import { Link } from "@tanstack/react-router";
import {
  Cake,
  CalendarDays,
  Camera,
  ChevronRight,
  Clock3,
  Flame,
  MapPin,
  WalletCards,
} from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { todayBoliviaISO } from "@/lib/bolivia-time";
import { ROLE_META, formatTurnDate } from "@/lib/turn-roles";
import {
  supabase,
  type EventItem,
  type Profile,
  type TurnGroup,
  type TurnGroupMember,
} from "@/lib/supabase";
import { findTheme } from "@/lib/turn-themes";

type Member = TurnGroupMember & { profile: Profile | null };
type GroupWithMembers = TurnGroup & { members: Member[] };

type BirthdaySignal = {
  profile: Profile;
  date: string;
  daysAway: number;
};

type HomePulse = {
  nextTurn: GroupWithMembers | null;
  nextEvent: EventItem | null;
  birthday: BirthdaySignal | null;
  activeFees: number;
  photoCount: number;
  memberCount: number;
};

const EMPTY_PULSE: HomePulse = {
  nextTurn: null,
  nextEvent: null,
  birthday: null,
  activeFees: 0,
  photoCount: 0,
  memberCount: 0,
};

function addDaysISO(value: string, days: number) {
  const [year, month, day] = value.split("-").map(Number);
  const date = new Date(Date.UTC(year ?? 2000, (month ?? 1) - 1, day ?? 1, 12));
  date.setUTCDate(date.getUTCDate() + days);
  return date.toISOString().slice(0, 10);
}

function daysLabel(days: number) {
  if (days === 0) return "Hoy";
  if (days === 1) return "Mañana";
  return `En ${days} días`;
}

function turnDistanceLabel(turnDate: string) {
  const today = todayBoliviaISO();
  const start = new Date(`${today}T12:00:00-04:00`);
  const end = new Date(`${turnDate}T12:00:00-04:00`);
  const days = Math.max(0, Math.round((end.getTime() - start.getTime()) / 86400000));
  return daysLabel(days);
}

function shortEventDate(value: string) {
  return new Intl.DateTimeFormat("es-BO", {
    timeZone: "America/La_Paz",
    weekday: "short",
    day: "2-digit",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  })
    .format(new Date(value))
    .replace(".", "");
}

function initials(profile: Profile | null) {
  const value = profile?.nickname || profile?.full_name || "CJ";
  return value
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase())
    .join("");
}

function nextBirthday(profiles: Profile[], today: string) {
  const targets = Array.from({ length: 15 }, (_, daysAway) => ({
    daysAway,
    date: addDaysISO(today, daysAway),
  }));

  return (
    profiles
      .filter((profile) => profile.approval_status !== "rejected" && profile.birth_date)
      .flatMap((profile) => {
        const monthDay = profile.birth_date!.slice(5, 10);
        return targets
          .filter((target) => target.date.slice(5, 10) === monthDay)
          .map((target) => ({ profile, date: target.date, daysAway: target.daysAway }));
      })
      .sort(
        (a, b) => a.daysAway - b.daysAway || a.profile.nickname.localeCompare(b.profile.nickname),
      )[0] ?? null
  );
}

export function HomeCommandCenter() {
  const [pulse, setPulse] = useState<HomePulse>(EMPTY_PULSE);
  const [loading, setLoading] = useState(true);
  const today = useMemo(() => todayBoliviaISO(), []);
  const theme = findTheme(pulse.nextTurn?.theme);
  const nextTurnMembers = useMemo(() => {
    const order = { churrasquero: 0, compras: 1, ayudante: 2 } as const;
    return [...(pulse.nextTurn?.members ?? [])].sort(
      (left, right) => order[left.role] - order[right.role],
    );
  }, [pulse.nextTurn]);

  useEffect(() => {
    let ignore = false;

    async function loadPulse() {
      setLoading(true);

      const [turnGroups, events, fees, photos, profiles] = await Promise.all([
        supabase
          .from("turn_groups")
          .select("*")
          .eq("archived", false)
          .gte("turn_date", today)
          .order("turn_date", { ascending: true })
          .limit(1),
        supabase
          .from("events")
          .select("*")
          .gte("date", new Date(Date.now() - 12 * 3600 * 1000).toISOString())
          .order("date", { ascending: true })
          .limit(1),
        supabase.from("fees").select("id", { count: "exact", head: true }).eq("is_active", true),
        supabase.from("photo_album").select("id", { count: "exact", head: true }),
        supabase
          .from("profiles")
          .select("*")
          .neq("approval_status", "rejected")
          .order("created_at", { ascending: false }),
      ]);

      const nextGroup = ((turnGroups.data as TurnGroup[] | null) ?? [])[0] ?? null;
      let nextTurn: GroupWithMembers | null = null;

      if (nextGroup) {
        const { data: memberRows } = await supabase
          .from("turn_group_members")
          .select("*")
          .eq("group_id", nextGroup.id);

        const members = (memberRows as TurnGroupMember[]) ?? [];
        const memberIds = members.map((member) => member.profile_id);
        let memberProfiles: Profile[] = [];

        if (memberIds.length) {
          const { data } = await supabase.from("profiles").select("*").in("id", memberIds);
          memberProfiles = (data as Profile[]) ?? [];
        }

        nextTurn = {
          ...nextGroup,
          members: members.map((member) => ({
            ...member,
            profile: memberProfiles.find((profile) => profile.id === member.profile_id) ?? null,
          })),
        };
      }

      if (ignore) return;

      const profileRows = (profiles.data as Profile[]) ?? [];
      setPulse({
        nextTurn,
        nextEvent: ((events.data as EventItem[] | null) ?? [])[0] ?? null,
        birthday: nextBirthday(profileRows, today),
        activeFees: fees.count ?? 0,
        photoCount: photos.count ?? 0,
        memberCount: profileRows.length,
      });
      setLoading(false);
    }

    loadPulse();

    return () => {
      ignore = true;
    };
  }, [today]);

  return (
    <section className="px-4 pt-4">
      <div className="chutu-carnival-card rounded-[1.65rem] p-0">
        <div
          aria-hidden
          className="absolute inset-x-0 top-0 h-1 bg-gradient-to-r from-[#14A538] via-[#FFD60A] to-[#00E0FF]"
        />

        <div className="relative overflow-hidden p-4">
          <div
            aria-hidden
            className="absolute inset-0 bg-[linear-gradient(105deg,transparent_0_16%,rgba(255,214,10,0.16)_16%_18%,transparent_18%_47%,rgba(0,224,255,0.12)_47%_49%,transparent_49%)]"
          />
          <div className="relative flex items-start justify-between gap-3">
            <div className="min-w-0">
              <p className="chutu-eyebrow text-[#00E0FF]">Comando del enjambre</p>
              <h2 className="chutu-display mt-2 text-5xl leading-none text-[#FFD60A]">
                {theme?.label ?? (pulse.nextTurn ? "Turno Chuturubí" : "Junte por sortear")}
              </h2>
            </div>
            <div className="grid h-16 w-16 shrink-0 place-items-center rounded-2xl border border-[#FFD60A]/35 bg-black/45 p-1 shadow-[0_0_28px_rgba(255,214,10,0.2)]">
              <img src="/logo.png" alt="" className="h-full w-full rounded-xl object-cover" />
            </div>
          </div>

          <div className="relative mt-4 grid grid-cols-[1fr_auto] gap-3 border-y border-white/10 py-3">
            <div className="min-w-0">
              <p className="flex items-center gap-1.5 text-[10px] font-black uppercase tracking-[0.2em] text-[#FFD60A]">
                <CalendarDays className="h-3.5 w-3.5" />
                Próximo turno
              </p>
              <p className="mt-1 truncate text-sm font-black capitalize text-white">
                {pulse.nextTurn ? formatTurnDate(pulse.nextTurn.turn_date) : "Sin fecha activa"}
              </p>
            </div>
            <div className="grid h-14 min-w-20 place-items-center rounded-2xl border border-[#FFD60A]/30 bg-[#FFD60A]/12 px-3 text-center">
              <p className="text-[10px] font-black uppercase tracking-widest text-[#FFD60A]">
                {pulse.nextTurn ? turnDistanceLabel(pulse.nextTurn.turn_date) : "Nuevo"}
              </p>
            </div>
          </div>

          {loading ? (
            <div className="relative mt-4 h-24 animate-pulse rounded-2xl border border-white/10 bg-white/[0.04]" />
          ) : nextTurnMembers.length ? (
            <div className="relative mt-4 grid grid-cols-4 gap-2">
              {nextTurnMembers.map((member) => {
                const meta = ROLE_META[member.role];
                const Icon = meta.icon;
                return (
                  <div key={member.id} className="min-w-0 text-center">
                    <Avatar className="mx-auto h-14 w-14 border-2 border-[#FFD60A] shadow-[0_0_18px_rgba(255,214,10,0.22)]">
                      <AvatarImage
                        src={member.profile?.avatar_url ?? undefined}
                        className="object-cover"
                      />
                      <AvatarFallback className="bg-neutral-950 text-xs font-black text-[#FFD60A]">
                        {initials(member.profile)}
                      </AvatarFallback>
                    </Avatar>
                    <p className="mt-2 truncate text-[10px] font-black text-white">
                      @{member.profile?.nickname ?? "Fraterno"}
                    </p>
                    <p className="mt-1 flex items-center justify-center gap-1 text-[9px] font-black uppercase tracking-wider text-[#00E0FF]">
                      <Icon className="h-3 w-3" />
                      {meta.label}
                    </p>
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="relative mt-4 flex items-center gap-3 rounded-2xl border border-dashed border-[#FFD60A]/30 px-3 py-4">
              <Flame className="h-5 w-5 shrink-0 text-[#FFD60A]" />
              <p className="text-sm font-bold text-white/75">
                Aún no hay turno futuro. Sortear uno nuevo activa esta portada.
              </p>
            </div>
          )}
        </div>

        <div className="relative grid grid-cols-2 border-t border-white/10">
          <PulseLine
            icon={Cake}
            label="Cumpleaños"
            value={
              pulse.birthday
                ? `${daysLabel(pulse.birthday.daysAway)} · @${pulse.birthday.profile.nickname}`
                : "Sin alertas"
            }
            to="/calendario"
          />
          <PulseLine
            icon={Clock3}
            label="Agenda"
            value={
              pulse.nextEvent
                ? `${shortEventDate(pulse.nextEvent.date)} · ${pulse.nextEvent.title}`
                : "Libre"
            }
            to="/calendario"
          />
          <PulseLine
            icon={WalletCards}
            label="Cuotas"
            value={pulse.activeFees ? `${pulse.activeFees} activas` : "Al día"}
            to="/finanzas"
          />
          <PulseLine
            icon={Camera}
            label="Álbum"
            value={`${pulse.photoCount} fotos · ${pulse.memberCount} socios`}
            to="/galeria"
          />
        </div>

        {pulse.nextEvent?.location && (
          <div className="relative border-t border-white/10 px-4 py-3">
            <p className="flex min-w-0 items-center gap-2 text-[10px] font-black uppercase tracking-widest text-[#00E0FF]">
              <MapPin className="h-3.5 w-3.5 shrink-0" />
              <span className="truncate">{pulse.nextEvent.location}</span>
            </p>
          </div>
        )}

        <div className="relative grid grid-cols-3 gap-px border-t border-white/10 bg-white/10">
          <CommandLink to="/calendario" label="Turnos" />
          <CommandLink to="/finanzas" label="Finanzas" />
          <CommandLink to="/galeria" label="Galería" />
        </div>
      </div>
    </section>
  );
}

function PulseLine({
  icon: Icon,
  label,
  value,
  to,
}: {
  icon: typeof Cake;
  label: string;
  value: string;
  to: "/calendario" | "/finanzas" | "/galeria";
}) {
  return (
    <Link
      to={to}
      className="group min-w-0 border-b border-r border-white/10 p-3 transition hover:bg-white/[0.04]"
    >
      <p className="flex items-center gap-1.5 text-[9px] font-black uppercase tracking-[0.2em] text-[#FFD60A]">
        <Icon className="h-3.5 w-3.5" />
        {label}
      </p>
      <p className="mt-1 truncate text-xs font-bold text-white/75">{value}</p>
    </Link>
  );
}

function CommandLink({
  to,
  label,
}: {
  to: "/calendario" | "/finanzas" | "/galeria";
  label: string;
}) {
  return (
    <Link
      to={to}
      className="group flex min-h-12 items-center justify-center gap-1.5 bg-black/35 px-2 text-[10px] font-black uppercase tracking-widest text-[#FFD60A] transition hover:bg-[#FFD60A] hover:text-black"
    >
      {label}
      <ChevronRight className="h-3.5 w-3.5 transition group-hover:translate-x-0.5" />
    </Link>
  );
}
