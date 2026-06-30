import { useEffect, useState } from "react";
import { MapPin } from "lucide-react";
import { supabase, type EventItem } from "@/lib/supabase";

const DAYS = ["DOM", "LUN", "MAR", "MIÉ", "JUE", "VIE", "SÁB"];
const MONTHS = ["ENE", "FEB", "MAR", "ABR", "MAY", "JUN", "JUL", "AGO", "SEP", "OCT", "NOV", "DIC"];
const COLORS = ["#FF2E93", "#00E0FF", "#FFD60A"];

export function UpcomingEvents() {
  const [events, setEvents] = useState<EventItem[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    supabase
      .from("events")
      .select("*")
      .gte("date", new Date(Date.now() - 12 * 3600 * 1000).toISOString())
      .order("date", { ascending: true })
      .limit(5)
      .then(({ data }) => {
        setEvents((data as EventItem[]) ?? []);
        setLoading(false);
      });
  }, []);

  if (loading || !events.length) return null;

  return (
    <section className="pt-6">
      <div className="mb-4 px-5">
        <h3 className="chutu-section-title text-[#00E0FF]">Agenda carnavalera</h3>
      </div>
      <div className="no-scrollbar flex gap-3 overflow-x-auto px-5 pb-2">
        {events.map((e, i) => {
          const d = new Date(e.date);
          const accent = COLORS[i % COLORS.length];
          return (
            <article
              key={e.id}
              className="chutu-panel relative w-64 shrink-0 overflow-hidden rounded-2xl p-4"
            >
              <div
                aria-hidden
                className="absolute inset-y-0 left-0 w-1"
                style={{ background: accent }}
              />
              <div className="mb-3 flex items-start justify-between gap-3">
                <div>
                  <div className="text-[10px] font-black tracking-[0.2em] text-[#FFD60A]">
                    {DAYS[d.getDay()]}
                  </div>
                  <div className="text-2xl font-black leading-none text-white">
                    {d.getDate()} <span className="text-sm text-white/55">{MONTHS[d.getMonth()]}</span>
                  </div>
                </div>
                <div className="rounded-full border border-white/10 bg-white/5 px-2 py-1 text-[10px] font-bold text-white/55">
                  {d.toLocaleTimeString("es-BO", { hour: "2-digit", minute: "2-digit" })}
                </div>
              </div>
              <div className="mb-3 line-clamp-2 text-sm font-black tracking-tight text-white">{e.title}</div>
              {e.location && (
                <div className="flex items-center text-[10px] font-black uppercase tracking-wider text-[#00E0FF]">
                  <MapPin className="mr-1 h-3 w-3" />
                  <span className="truncate">{e.location}</span>
                </div>
              )}
            </article>
          );
        })}
      </div>
    </section>
  );
}
