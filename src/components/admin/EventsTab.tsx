import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { CalendarPlus, MapPin, Trash2 } from "lucide-react";
import { supabase, type EventItem } from "@/lib/supabase";
import { toast } from "sonner";

export function EventsTab() {
  const [events, setEvents] = useState<EventItem[]>([]);
  const [title, setTitle] = useState("");
  const [date, setDate] = useState("");
  const [location, setLocation] = useState("");
  const [description, setDescription] = useState("");
  const [busy, setBusy] = useState(false);

  const load = async () => {
    const { data } = await supabase.from("events").select("*").order("date", { ascending: true });
    setEvents((data as EventItem[]) ?? []);
  };
  useEffect(() => {
    load();
  }, []);

  const create = async () => {
    if (!title || !date) return toast.error("Título y fecha son obligatorios");
    setBusy(true);
    const { error } = await supabase.from("events").insert({
      title,
      date: new Date(date).toISOString(),
      location: location || null,
      description: description || null,
    });
    setBusy(false);
    if (error) return toast.error(error.message);
    toast.success("Evento creado 🐝");
    setTitle("");
    setDate("");
    setLocation("");
    setDescription("");
    load();
  };

  const del = async (id: string) => {
    if (!confirm("¿Eliminar evento?")) return;
    const { error } = await supabase.from("events").delete().eq("id", id);
    if (error) toast.error(error.message);
    else load();
  };

  return (
    <div className="space-y-4">
      <div className="space-y-3 rounded-xl border border-yellow-400/30 bg-neutral-950 p-3">
        <p className="flex items-center gap-2 text-xs font-black uppercase tracking-widest text-yellow-400">
          <CalendarPlus className="h-4 w-4" /> Nuevo junte
        </p>
        <div className="space-y-1.5">
          <Label className="text-yellow-300">Título</Label>
          <Input value={title} onChange={(e) => setTitle(e.target.value)} className="border-neutral-800 bg-neutral-900" />
        </div>
        <div className="grid grid-cols-2 gap-2">
          <div className="space-y-1.5">
            <Label className="text-yellow-300">Fecha y hora</Label>
            <Input
              type="datetime-local"
              value={date}
              onChange={(e) => setDate(e.target.value)}
              className="border-neutral-800 bg-neutral-900"
            />
          </div>
          <div className="space-y-1.5">
            <Label className="text-yellow-300">Lugar</Label>
            <Input value={location} onChange={(e) => setLocation(e.target.value)} className="border-neutral-800 bg-neutral-900" />
          </div>
        </div>
        <div className="space-y-1.5">
          <Label className="text-yellow-300">Descripción</Label>
          <Textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            className="min-h-20 border-neutral-800 bg-neutral-900"
          />
        </div>
        <Button onClick={create} disabled={busy} className="w-full bg-yellow-400 font-bold text-black hover:bg-yellow-300">
          Crear evento
        </Button>
      </div>

      <ul className="space-y-2">
        {events.map((e) => {
          const d = new Date(e.date);
          return (
            <li key={e.id} className="rounded-xl border border-neutral-800 bg-neutral-950 p-3">
              <div className="flex items-start gap-3">
                <div className="flex h-14 w-12 shrink-0 flex-col overflow-hidden rounded-lg border border-yellow-400 bg-black text-center">
                  <div className="bg-yellow-400 py-0.5 text-[10px] font-black tracking-widest text-black">
                    {d.toLocaleDateString("es-BO", { month: "short" }).toUpperCase()}
                  </div>
                  <div className="flex flex-1 items-center justify-center text-lg font-black text-yellow-300">
                    {d.getDate()}
                  </div>
                </div>
                <div className="min-w-0 flex-1">
                  <p className="truncate font-bold text-yellow-300">{e.title}</p>
                  <p className="text-[11px] text-neutral-400">
                    {d.toLocaleString("es-BO", { dateStyle: "medium", timeStyle: "short" })}
                  </p>
                  {e.location && (
                    <p className="mt-0.5 flex items-center gap-1 text-[11px] text-neutral-300">
                      <MapPin className="h-3 w-3 text-yellow-400" /> {e.location}
                    </p>
                  )}
                </div>
                <Button
                  onClick={() => del(e.id)}
                  size="icon"
                  variant="outline"
                  aria-label={`Eliminar evento ${e.title}`}
                  className="border-red-500/40 bg-transparent text-red-300 hover:bg-red-500/10"
                >
                  <Trash2 className="h-4 w-4" aria-hidden="true" />
                </Button>
              </div>
            </li>
          );
        })}
        {!events.length && <p className="text-center text-xs text-neutral-500">Sin eventos aún.</p>}
      </ul>
    </div>
  );
}
