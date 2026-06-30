// Carnival-themed turnos. Picked at random when sorteando.
export type TurnTheme = {
  id: string;
  label: string;
  emoji: string;
  /** Tailwind classes for the header gradient/accent. */
  accent: string;
};

export const TURN_THEMES: TurnTheme[] = [
  { id: "mexicano", label: "Turno Mexicano", emoji: "🌮", accent: "from-emerald-500/30 to-red-500/30 text-emerald-200" },
  { id: "carnavalero", label: "Turno Carnavalero", emoji: "🎭", accent: "from-fuchsia-500/30 to-yellow-400/30 text-fuchsia-200" },
  { id: "bolichero", label: "Turno Bolichero", emoji: "🪩", accent: "from-purple-500/30 to-pink-500/30 text-purple-200" },
  { id: "mundialista", label: "Turno Mundialista", emoji: "⚽", accent: "from-green-500/30 to-yellow-400/30 text-green-200" },
  { id: "cruceno", label: "Turno Típico Cruceño", emoji: "🌴", accent: "from-lime-500/30 to-yellow-400/30 text-lime-200" },
  { id: "neon", label: "Turno Neón", emoji: "🌟", accent: "from-cyan-400/30 to-fuchsia-500/30 text-cyan-200" },
  { id: "parrillero", label: "Turno Parrillero Clásico", emoji: "🥩", accent: "from-orange-500/30 to-red-500/30 text-orange-200" },
  { id: "playero", label: "Turno Playero", emoji: "🏖️", accent: "from-sky-400/30 to-yellow-400/30 text-sky-200" },
  { id: "disfraces", label: "Turno Disfraces Cómicos", emoji: "🤡", accent: "from-rose-500/30 to-amber-400/30 text-rose-200" },
  { id: "tropical", label: "Turno Tropical", emoji: "🍹", accent: "from-teal-400/30 to-pink-400/30 text-teal-200" },
  { id: "retro", label: "Turno Retro 80s", emoji: "📼", accent: "from-indigo-500/30 to-pink-500/30 text-indigo-200" },
];

export function pickRandomTheme(): TurnTheme {
  return TURN_THEMES[Math.floor(Math.random() * TURN_THEMES.length)];
}

export function findTheme(id: string | null | undefined): TurnTheme | null {
  if (!id) return null;
  return TURN_THEMES.find((t) => t.id === id) ?? null;
}
