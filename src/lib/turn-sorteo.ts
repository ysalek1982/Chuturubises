import type { Profile, TurnRole } from "./supabase";
import { TURN_THEMES, type TurnTheme } from "./turn-themes";

/** Fisher-Yates shuffle (non-mutating). */
export function shuffle<T>(arr: T[]): T[] {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

/**
 * Chunk a list into groups of `size` aplicando la regla de la comparsa:
 *   - residuo 0  → grupos perfectos              (ej. 12 → [4,4,4])
 *   - residuo 1  → se suma al último grupo       (ej. 13 → [4,4,5])
 *   - residuo 2  → se suma al último grupo       (ej. 14 → [4,4,6])
 *   - residuo 3  → forma SU PROPIO grupo aparte  (ej. 15 → [4,4,4,3])
 * Si pool.length < size y no es exactamente 3, devuelve [].
 */
export function chunkWithRemainder<T>(pool: T[], size = 4): T[][] {
  if (pool.length === 0) return [];
  // Caso especial: sólo 3 fraternos en todo el ciclo → un único grupo de 3.
  if (pool.length < size) {
    return pool.length === 3 ? [pool.slice()] : [];
  }
  const groups: T[][] = [];
  for (let i = 0; i + size <= pool.length; i += size) {
    groups.push(pool.slice(i, i + size));
  }
  const remainder = pool.length % size;
  if (remainder === 0) return groups;
  const tail = pool.slice(pool.length - remainder);
  if (remainder === 3) {
    // Los 3 sobrantes forman su propio turno.
    groups.push(tail);
  } else {
    // 1 ó 2 sobrantes se suman al último grupo completo.
    groups[groups.length - 1] = [...groups[groups.length - 1], ...tail];
  }
  return groups;
}

/** Asigna roles dentro del grupo: 1 churrasquero, 1 compras, resto ayudantes. */
export function assignGroupRoles(
  members: Profile[],
): Array<{ profile: Profile; role: TurnRole }> {
  // Shuffle inside the group so the role assignment is also random.
  const shuffled = shuffle(members);
  return shuffled.map((profile, i) => {
    const role: TurnRole =
      i === 0 ? "churrasquero" : i === 1 ? "compras" : "ayudante";
    return { profile, role };
  });
}

/** Devuelve N temáticas distintas (con repetición sólo si N > THEMES disponibles). */
export function pickDistinctThemes(n: number): TurnTheme[] {
  const pool = shuffle(TURN_THEMES);
  if (n <= pool.length) return pool.slice(0, n);
  // Si pidieron más temas que los disponibles, completamos repitiendo en otro orden.
  const out: TurnTheme[] = [...pool];
  while (out.length < n) {
    out.push(...shuffle(TURN_THEMES));
  }
  return out.slice(0, n);
}

export function addDaysISO(yyyymmdd: string, days: number): string {
  const [y, m, d] = yyyymmdd.split("-").map(Number);
  const date = new Date(y, (m ?? 1) - 1, d ?? 1);
  date.setDate(date.getDate() + days);
  const yy = date.getFullYear();
  const mm = String(date.getMonth() + 1).padStart(2, "0");
  const dd = String(date.getDate()).padStart(2, "0");
  return `${yy}-${mm}-${dd}`;
}
