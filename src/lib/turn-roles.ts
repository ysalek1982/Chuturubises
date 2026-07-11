import { Flame, HandHelping, ShoppingCart, type LucideIcon } from "lucide-react";
import type { TurnRole } from "./supabase";

export const ROLE_META: Record<
  TurnRole,
  { label: string; emoji: string; icon: LucideIcon; color: string }
> = {
  churrasquero: {
    label: "Churrasquero",
    emoji: "🔥",
    icon: Flame,
    color: "text-orange-400 border-orange-400/50 bg-orange-400/10",
  },
  compras: {
    label: "Compras",
    emoji: "🛒",
    icon: ShoppingCart,
    color: "text-yellow-300 border-yellow-400/50 bg-yellow-400/10",
  },
  ayudante: {
    label: "Ayudante",
    emoji: "🤝",
    icon: HandHelping,
    color: "text-cyan-300 border-cyan-400/40 bg-cyan-400/10",
  },
};

export function pickRandomFour<T>(pool: T[]): T[] {
  const arr = [...pool];
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr.slice(0, 4);
}

export function assignRoles<T>(four: T[]): Array<{ member: T; role: TurnRole }> {
  // Caller already picks 4 at random; assign roles in fixed order:
  // 1 churrasquero, 1 compras, 2 ayudantes.
  const roles: TurnRole[] = ["churrasquero", "compras", "ayudante", "ayudante"];
  return four.slice(0, 4).map((m, i) => ({ member: m, role: roles[i] }));
}

export function formatTurnDate(iso: string): string {
  // turn_date is YYYY-MM-DD; render in es-BO without timezone shift.
  const [y, m, d] = iso.split("-").map(Number);
  const date = new Date(y, (m ?? 1) - 1, d ?? 1);
  return date.toLocaleDateString("es-BO", {
    weekday: "long",
    day: "numeric",
    month: "long",
  });
}
