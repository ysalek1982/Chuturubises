import { Link, useRouterState } from "@tanstack/react-router";
import { Camera, CalendarDays, Dices, Home, Shield, User, WalletCards } from "lucide-react";
import { cn } from "@/lib/utils";
import { useAuth } from "@/lib/auth";

const baseItems = [
  { to: "/", label: "Muro", icon: Home },
  { to: "/finanzas", label: "Finanzas", icon: WalletCards },
  { to: "/calendario", label: "Turnos", icon: CalendarDays },
  { to: "/sorteo", label: "Sorteo", icon: Dices },
  { to: "/galeria", label: "Album", icon: Camera },
  { to: "/perfil", label: "Perfil", icon: User },
] as const;

const adminItem = { to: "/admin", label: "Admin", icon: Shield } as const;
const panelItem = { to: "/admin", label: "Panel", icon: Shield } as const;

export function BottomNav() {
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const { isAdmin, canManageFinance } = useAuth();
  const managerItems = [
    { to: "/", label: "Muro", icon: Home },
    { to: "/finanzas", label: "Finanzas", icon: WalletCards },
    { to: "/calendario", label: "Turnos", icon: CalendarDays },
    { to: "/sorteo", label: "Sorteo", icon: Dices },
    { to: "/perfil", label: "Perfil", icon: User },
    isAdmin ? adminItem : panelItem,
  ] as const;
  const items = canManageFinance ? managerItems : baseItems;

  return (
    <nav
      aria-label="Navegacion principal"
      className="fixed inset-x-0 bottom-0 z-50 px-3 pb-[calc(0.75rem+env(safe-area-inset-bottom))]"
    >
      <ul className="chutu-panel chutu-nav mx-auto grid max-w-md grid-flow-col rounded-[1.45rem] p-1.5">
        {items.map(({ to, label, icon: Icon }) => {
          const active = pathname === to;
          return (
            <li key={to} className="min-w-0">
              <Link
                to={to}
                aria-label={label}
                aria-current={active ? "page" : undefined}
                className={cn(
                  "group relative flex min-h-14 min-w-0 flex-col items-center justify-center gap-1 rounded-[1.05rem] px-1 py-2 text-[10px] font-extrabold outline-none transition",
                  "focus-visible:ring-2 focus-visible:ring-yellow-300",
                  active
                    ? "bg-gradient-to-br from-[#A7FF3D] via-[#FFD60A] to-[#FF9F1C] text-black shadow-[0_12px_28px_rgba(255,196,0,0.24),0_0_0_1px_rgba(255,255,255,0.28)_inset]"
                    : "text-neutral-400 hover:bg-white/5 hover:text-yellow-200",
                )}
              >
                <Icon
                  aria-hidden="true"
                  className={cn(
                    "h-5 w-5 transition-transform",
                    active ? "scale-110" : "group-hover:-translate-y-0.5",
                  )}
                />
                <span className="max-w-full truncate tracking-wide">{label}</span>
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
