import { useMemo, useState } from "react";
import { Cake, CalendarDays, ChevronLeft, ChevronRight, MapPin, PartyPopper, Users } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import type { EventItem, Profile } from "@/lib/supabase";
import { formatBoliviaDateTime } from "@/lib/bolivia-time";
import { formatTurnDate } from "@/lib/turn-roles";
import { findTheme } from "@/lib/turn-themes";
import type { GroupView } from "./TurnTable";

type CalendarKind = "birthday" | "turn" | "event" | "carnival";

type CalendarItem = {
  id: string;
  date: string;
  kind: CalendarKind;
  title: string;
  subtitle?: string;
  detail?: string;
  tone: string;
};

const WEEKDAYS = ["LUN", "MAR", "MIE", "JUE", "VIE", "SAB", "DOM"];
const MONTHS = [
  "Enero",
  "Febrero",
  "Marzo",
  "Abril",
  "Mayo",
  "Junio",
  "Julio",
  "Agosto",
  "Septiembre",
  "Octubre",
  "Noviembre",
  "Diciembre",
];

const CARNIVAL_2027: CalendarItem[] = [
  {
    id: "carnival-2027-02-06",
    date: "2027-02-06",
    kind: "carnival",
    title: "Sabado Carnavalero",
    subtitle: "Arranque del carnaval cruceno 2027",
    detail: "Previa grande para el enjambre: comparsa, pintura, tamborita y alegria camba.",
    tone: "bg-[#FF2E93]",
  },
  {
    id: "carnival-2027-02-07",
    date: "2027-02-07",
    kind: "carnival",
    title: "Domingo de Carnaval",
    subtitle: "Domingo carnavalero",
    detail: "Dia fuerte de comparsa y calle. Ideal para marcar junte oficial de la fraternidad.",
    tone: "bg-[#00E0FF]",
  },
  {
    id: "carnival-2027-02-08",
    date: "2027-02-08",
    kind: "carnival",
    title: "Lunes de Carnaval",
    subtitle: "Feriado nacional Bolivia",
    detail: "Feriado oficial de Carnaval 2027 en Bolivia.",
    tone: "bg-[#FFD60A]",
  },
  {
    id: "carnival-2027-02-09",
    date: "2027-02-09",
    kind: "carnival",
    title: "Martes de Carnaval",
    subtitle: "Feriado nacional Bolivia",
    detail: "Feriado oficial de Carnaval 2027 en Bolivia y cierre grande de la fiesta.",
    tone: "bg-[#A7FF3D]",
  },
];

function isoDate(year: number, monthIndex: number, day: number) {
  return `${year}-${String(monthIndex + 1).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
}

function parseDateKey(value: string) {
  const [year, month, day] = value.slice(0, 10).split("-").map(Number);
  return { year, monthIndex: (month ?? 1) - 1, day: day ?? 1 };
}

function eventDateKey(value: string) {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: "America/La_Paz",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(new Date(value));
  const get = (type: string) => parts.find((part) => part.type === type)?.value ?? "00";
  return `${get("year")}-${get("month")}-${get("day")}`;
}

function birthdayForYear(profile: Profile, year: number): CalendarItem | null {
  if (!profile.birth_date) return null;
  const [, month, day] = profile.birth_date.slice(0, 10).split("-");
  if (!month || !day) return null;
  const date = `${year}-${month}-${day}`;
  const birthYear = Number(profile.birth_date.slice(0, 4));
  const age = Number.isFinite(birthYear) && birthYear > 1900 ? year - birthYear : null;
  return {
    id: `birthday-${profile.id}-${date}`,
    date,
    kind: "birthday",
    title: `Cumple de @${profile.nickname}`,
    subtitle: profile.full_name,
    detail: age ? `Cumple ${age} anos. Hay que saludar al cumpa como corresponde.` : "Cumpleanos de fraterno.",
    tone: "bg-[#FFD60A]",
  };
}

function eventToItem(event: EventItem): CalendarItem {
  return {
    id: `event-${event.id}`,
    date: eventDateKey(event.date),
    kind: "event",
    title: event.title,
    subtitle: formatBoliviaDateTime(event.date),
    detail: [event.location ? `Lugar: ${event.location}` : null, event.description].filter(Boolean).join("\n"),
    tone: "bg-[#00E0FF]",
  };
}

function turnToItem(group: GroupView): CalendarItem {
  const theme = findTheme(group.theme);
  const crew = group.members
    .map((m) => `@${m.profile?.nickname ?? "?"}`)
    .join(", ");
  return {
    id: `turn-${group.id}`,
    date: group.turn_date,
    kind: "turn",
    title: theme?.label ?? "Turno Chuturubi",
    subtitle: `${formatTurnDate(group.turn_date)} - Ciclo #${group.cycle}`,
    detail: crew ? `Encargados: ${crew}` : "Turno sorteado sin fraternos cargados.",
    tone: "bg-[#14A538]",
  };
}

function iconForKind(kind: CalendarKind) {
  if (kind === "birthday") return Cake;
  if (kind === "turn") return Users;
  if (kind === "carnival") return PartyPopper;
  return MapPin;
}

function labelForKind(kind: CalendarKind) {
  if (kind === "birthday") return "Cumpleanos";
  if (kind === "turn") return "Turno";
  if (kind === "carnival") return "Carnaval";
  return "Evento";
}

export function ChuturubiCalendar({
  profiles,
  groups,
  events,
  today,
}: {
  profiles: Profile[];
  groups: GroupView[];
  events: EventItem[];
  today: string;
}) {
  const initial = useMemo(() => {
    const nextTurn = groups.find((group) => !group.archived && group.turn_date >= today);
    return parseDateKey(nextTurn?.turn_date ?? today);
  }, [groups, today]);

  const [visible, setVisible] = useState(() => ({ year: initial.year, monthIndex: initial.monthIndex }));
  const [selected, setSelected] = useState<{ date: string; items: CalendarItem[] } | null>(null);

  const allItems = useMemo(() => {
    const birthdays = profiles
      .filter((profile) => profile.approval_status === "approved")
      .map((profile) => birthdayForYear(profile, visible.year))
      .filter((item): item is CalendarItem => !!item);

    return [
      ...birthdays,
      ...groups.filter((group) => !group.archived).map(turnToItem),
      ...events.map(eventToItem),
      ...CARNIVAL_2027,
    ];
  }, [events, groups, profiles, visible.year]);

  const itemsByDate = useMemo(() => {
    const map = new Map<string, CalendarItem[]>();
    allItems.forEach((item) => {
      const list = map.get(item.date) ?? [];
      list.push(item);
      map.set(item.date, list);
    });
    return map;
  }, [allItems]);

  const daysInMonth = new Date(visible.year, visible.monthIndex + 1, 0).getDate();
  const firstWeekday = (new Date(visible.year, visible.monthIndex, 1).getDay() + 6) % 7;
  const cells = Array.from({ length: 42 }, (_, index) => {
    const day = index - firstWeekday + 1;
    const inMonth = day >= 1 && day <= daysInMonth;
    const date = inMonth ? isoDate(visible.year, visible.monthIndex, day) : null;
    return { day, date, items: date ? itemsByDate.get(date) ?? [] : [] };
  });

  const moveMonth = (delta: number) => {
    setVisible((current) => {
      const next = new Date(current.year, current.monthIndex + delta, 1);
      return { year: next.getFullYear(), monthIndex: next.getMonth() };
    });
  };

  const jumpTo = (date: string) => {
    const parts = parseDateKey(date);
    setVisible({ year: parts.year, monthIndex: parts.monthIndex });
  };

  const monthLabel = `${MONTHS[visible.monthIndex]} ${visible.year}`;
  const currentMonthItems = allItems.filter((item) => {
    const parsed = parseDateKey(item.date);
    return parsed.year === visible.year && parsed.monthIndex === visible.monthIndex;
  });
  const nextTurn = groups.find((group) => !group.archived && group.turn_date >= today);

  return (
    <section className="mb-7">
      <div className="chutu-carnival-card rounded-[1.6rem] p-4">
        <div className="mb-4 flex items-start justify-between gap-3">
          <div className="min-w-0">
            <p className="chutu-eyebrow text-[#00E0FF]">Calendario Chuturubi</p>
            <h2 className="chutu-display mt-1 text-4xl leading-none text-[#FFD60A]">
              {monthLabel}
            </h2>
          </div>
          <div className="flex shrink-0 gap-2">
            <Button
              type="button"
              size="icon"
              className="h-10 w-10 rounded-xl border border-white/10 bg-white/5 text-white hover:bg-white/10"
              onClick={() => moveMonth(-1)}
              aria-label="Mes anterior"
            >
              <ChevronLeft className="h-5 w-5" />
            </Button>
            <Button
              type="button"
              size="icon"
              className="h-10 w-10 rounded-xl border border-white/10 bg-white/5 text-white hover:bg-white/10"
              onClick={() => moveMonth(1)}
              aria-label="Mes siguiente"
            >
              <ChevronRight className="h-5 w-5" />
            </Button>
          </div>
        </div>

        <div className="mb-4 grid grid-cols-3 gap-2">
          <button type="button" onClick={() => jumpTo(today)} className="chutu-outline rounded-xl px-2 py-2 text-[10px] font-black uppercase tracking-wider">
            Hoy
          </button>
          <button type="button" onClick={() => jumpTo(nextTurn?.turn_date ?? today)} className="chutu-outline rounded-xl px-2 py-2 text-[10px] font-black uppercase tracking-wider">
            Prox. turno
          </button>
          <button type="button" onClick={() => jumpTo("2027-02-08")} className="rounded-xl bg-[#FFD60A] px-2 py-2 text-[10px] font-black uppercase tracking-wider text-black">
            Carnaval 2027
          </button>
        </div>

        <div className="mb-3 grid grid-cols-4 gap-2 text-[9px] font-black uppercase tracking-wider text-white/70">
          <LegendDot color="bg-[#FFD60A]" label="Cumples" />
          <LegendDot color="bg-[#14A538]" label="Turnos" />
          <LegendDot color="bg-[#00E0FF]" label="Eventos" />
          <LegendDot color="bg-[#FF2E93]" label="Carnaval" />
        </div>

        <div className="grid grid-cols-7 gap-1.5">
          {WEEKDAYS.map((day) => (
            <div key={day} className="pb-1 text-center text-[9px] font-black tracking-widest text-[#00E0FF]">
              {day}
            </div>
          ))}

          {cells.map((cell, index) => {
            const active = !!cell.date && cell.items.length > 0;
            const isToday = cell.date === today;
            return (
              <button
                key={`${cell.date ?? "blank"}-${index}`}
                type="button"
                disabled={!cell.date}
                onClick={() => cell.date && active && setSelected({ date: cell.date, items: cell.items })}
                className={[
                  "relative min-h-16 rounded-xl border p-1.5 text-left transition",
                  cell.date ? "border-white/10 bg-black/28 text-white" : "border-transparent bg-transparent",
                  active ? "hover:-translate-y-0.5 hover:border-[#FFD60A]/70 hover:bg-white/8" : "",
                  isToday ? "ring-1 ring-[#FFD60A]" : "",
                ].join(" ")}
              >
                {cell.date && (
                  <>
                    <span className="text-xs font-black">{cell.day}</span>
                    <div className="mt-1 flex flex-wrap gap-1">
                      {cell.items.slice(0, 4).map((item) => (
                        <span key={item.id} className={`h-1.5 w-1.5 rounded-full ${item.tone}`} />
                      ))}
                    </div>
                    {cell.items[0] && (
                      <span className="mt-1 block truncate text-[8px] font-bold leading-tight text-white/70">
                        {cell.items[0].kind === "birthday" ? "Cumple" : labelForKind(cell.items[0].kind)}
                      </span>
                    )}
                  </>
                )}
              </button>
            );
          })}
        </div>

        <p className="mt-3 text-xs font-bold text-white/55">
          {currentMonthItems.length
            ? `${currentMonthItems.length} marca${currentMonthItems.length === 1 ? "" : "s"} este mes. Toca una fecha para ver el detalle.`
            : "Este mes no tiene marcas todavia."}
        </p>
      </div>

      <Dialog open={!!selected} onOpenChange={(open) => !open && setSelected(null)}>
        <DialogContent className="max-h-[85vh] overflow-y-auto border-[#FFD60A]/40 bg-[#08080A] text-white">
          <DialogHeader>
            <DialogTitle className="chutu-display text-3xl text-[#FFD60A]">
              {selected ? formatTurnDate(selected.date) : "Detalle"}
            </DialogTitle>
            <DialogDescription className="text-white/60">
              Marcas del calendario Chuturubi
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-3">
            {selected?.items.map((item) => {
              const Icon = iconForKind(item.kind);
              return (
                <article key={item.id} className="rounded-2xl border border-white/10 bg-white/[0.045] p-4">
                  <div className="flex items-start gap-3">
                    <span className={`grid h-11 w-11 shrink-0 place-items-center rounded-xl text-black ${item.tone}`}>
                      <Icon className="h-5 w-5" />
                    </span>
                    <div className="min-w-0">
                      <p className="text-[10px] font-black uppercase tracking-[0.24em] text-[#00E0FF]">
                        {labelForKind(item.kind)}
                      </p>
                      <h3 className="mt-1 text-lg font-black leading-tight text-white">{item.title}</h3>
                      {item.subtitle && <p className="mt-1 text-sm font-bold text-[#FFD60A]">{item.subtitle}</p>}
                      {item.detail && <p className="mt-2 whitespace-pre-line text-sm leading-relaxed text-white/70">{item.detail}</p>}
                    </div>
                  </div>
                </article>
              );
            })}
          </div>
        </DialogContent>
      </Dialog>
    </section>
  );
}

function LegendDot({ color, label }: { color: string; label: string }) {
  return (
    <div className="flex items-center gap-1.5 rounded-full border border-white/10 bg-white/5 px-2 py-1">
      <span className={`h-2 w-2 rounded-full ${color}`} />
      <span className="truncate">{label}</span>
    </div>
  );
}
