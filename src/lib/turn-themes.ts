// Fraternity turn themes. Picked at random when sorteando.
export type TurnTheme = {
  id: string;
  label: string;
  emoji: string;
  /** Tailwind classes for the header gradient/accent. */
  accent: string;
};

export const TURN_THEMES: TurnTheme[] = [
  { id: "parrillero", label: "Turno Parrillero Clasico", emoji: "BBQ", accent: "from-orange-500/30 to-red-500/30 text-orange-200" },
  { id: "asado-estaca", label: "Turno Asado a la Estaca", emoji: "FUEGO", accent: "from-red-600/30 to-amber-400/30 text-amber-200" },
  { id: "vaquero", label: "Turno Vaquero Cruceno", emoji: "RANCHO", accent: "from-yellow-700/30 to-lime-400/30 text-yellow-200" },
  { id: "playero", label: "Turno Vaquero de Rancho", emoji: "RANCHO", accent: "from-yellow-700/30 to-lime-400/30 text-yellow-200" },
  { id: "casino", label: "Turno Casino Royale", emoji: "POKER", accent: "from-red-500/30 to-zinc-300/20 text-red-200" },
  { id: "whisky", label: "Turno Whisky y Brasas", emoji: "OLD", accent: "from-amber-700/30 to-orange-400/30 text-amber-200" },
  { id: "mundialista", label: "Turno Mundialista", emoji: "GOL", accent: "from-green-500/30 to-yellow-400/30 text-green-200" },
  { id: "carnavalero", label: "Turno Carnavalero", emoji: "MASK", accent: "from-fuchsia-500/30 to-yellow-400/30 text-fuchsia-200" },
  { id: "cruceno", label: "Turno Tipico Cruceno", emoji: "SCZ", accent: "from-lime-500/30 to-yellow-400/30 text-lime-200" },
  { id: "rock", label: "Turno Rock y Costillas", emoji: "ROCK", accent: "from-neutral-500/30 to-red-500/30 text-neutral-200" },
  { id: "retro", label: "Turno Retro 80s", emoji: "80s", accent: "from-indigo-500/30 to-pink-500/30 text-indigo-200" },
  { id: "neon", label: "Turno Neon Night", emoji: "NEON", accent: "from-cyan-400/30 to-fuchsia-500/30 text-cyan-200" },
  { id: "mexicano", label: "Turno Tacos y Tequila", emoji: "MX", accent: "from-emerald-500/30 to-red-500/30 text-emerald-200" },
  { id: "bolichero", label: "Turno Bolichero", emoji: "VIP", accent: "from-purple-500/30 to-pink-500/30 text-purple-200" },
  { id: "superheroes", label: "Turno Superheroes", emoji: "HERO", accent: "from-blue-500/30 to-red-500/30 text-blue-200" },
  { id: "old-hollywood", label: "Turno Old Hollywood", emoji: "CINE", accent: "from-yellow-400/30 to-neutral-300/20 text-yellow-200" },
  { id: "mafia", label: "Turno Mafia Italiana", emoji: "SUIT", accent: "from-zinc-600/30 to-red-500/30 text-zinc-200" },
  { id: "gala-negra", label: "Turno Gala Negra", emoji: "BLACK", accent: "from-neutral-600/40 to-yellow-400/20 text-neutral-100" },
];

export function pickRandomTheme(): TurnTheme {
  return TURN_THEMES[Math.floor(Math.random() * TURN_THEMES.length)];
}

export function findTheme(id: string | null | undefined): TurnTheme | null {
  if (!id) return null;
  return TURN_THEMES.find((t) => t.id === id) ?? null;
}
