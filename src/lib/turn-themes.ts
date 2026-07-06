// Fraternity turn themes. Picked at random when sorteando.
export type TurnTheme = {
  id: string;
  label: string;
  emoji: string;
  /** Tailwind classes for the header gradient/accent. */
  accent: string;
};

export const TURN_THEMES: TurnTheme[] = [
  { id: "carne-argentina", label: "Turno Carne Argentina", emoji: "ASADO", accent: "from-sky-400/30 to-amber-300/30 text-sky-100" },
  { id: "clasico", label: "Turno Clasico", emoji: "BBQ", accent: "from-orange-500/30 to-red-500/30 text-orange-200" },
  { id: "rockero", label: "Turno Rockero", emoji: "ROCK", accent: "from-neutral-500/30 to-red-500/30 text-neutral-200" },
  { id: "futbolero", label: "Turno Futbolero", emoji: "FUTBOL", accent: "from-lime-500/30 to-cyan-400/30 text-lime-200" },
  { id: "picante", label: "Turno Picante", emoji: "PICANTE", accent: "from-red-600/30 to-orange-400/30 text-red-200" },
  { id: "tipico-camba", label: "Turno Tipico Camba", emoji: "SCZ", accent: "from-lime-500/30 to-yellow-400/30 text-lime-200" },
  { id: "mexicano", label: "Turno Mexicano", emoji: "MX", accent: "from-emerald-500/30 to-red-500/30 text-emerald-200" },
  { id: "chanchito-cruz", label: "Turno Chanchito a la Cruz", emoji: "CRUZ", accent: "from-amber-600/30 to-red-500/30 text-amber-200" },
  { id: "oktoberfest", label: "Turno Oktoberfest / Noche Cervecera", emoji: "CERVEZA", accent: "from-yellow-500/30 to-orange-500/30 text-yellow-200" },
  { id: "carnavalero", label: "Turno Carnavalero", emoji: "MASK", accent: "from-fuchsia-500/30 to-yellow-400/30 text-fuchsia-200" },
  { id: "pacu-parrilla", label: "Turno Pacu a la Parrilla", emoji: "PACU", accent: "from-cyan-500/30 to-lime-400/30 text-cyan-200" },
];

const LEGACY_THEME_IDS: Record<string, TurnTheme> = {
  parrillero: TURN_THEMES[1],
  "asado-estaca": TURN_THEMES[7],
  vaquero: TURN_THEMES[5],
  playero: TURN_THEMES[5],
  casino: TURN_THEMES[1],
  whisky: TURN_THEMES[1],
  cruceno: TURN_THEMES[5],
  rock: TURN_THEMES[2],
  retro: TURN_THEMES[1],
  neon: TURN_THEMES[1],
  bolichero: TURN_THEMES[1],
  superheroes: TURN_THEMES[1],
  "old-hollywood": TURN_THEMES[1],
  mafia: TURN_THEMES[1],
  "gala-negra": TURN_THEMES[1],
};

export function pickRandomTheme(): TurnTheme {
  return TURN_THEMES[Math.floor(Math.random() * TURN_THEMES.length)];
}

export function findTheme(id: string | null | undefined): TurnTheme | null {
  if (!id) return null;
  return TURN_THEMES.find((t) => t.id === id) ?? LEGACY_THEME_IDS[id] ?? null;
}
