import { Tombola3D } from "@/components/Tombola3D";
import type { Profile } from "@/lib/supabase";

export function SorteoTombola({
  members,
  spinning,
}: {
  members: Profile[];
  spinning: boolean;
}) {
  return (
    <div className="relative h-80 overflow-hidden rounded-[28px] border-2 border-[#FFD60A] bg-[radial-gradient(circle_at_center,rgba(255,46,147,0.25),#0B0B1F_65%)] shadow-[0_0_45px_rgba(255,46,147,0.5),inset_0_0_30px_rgba(0,224,255,0.1)]">
      <div className="pointer-events-none absolute -left-8 -top-8 h-32 w-32 rounded-full bg-[#FF2E93]/40 blur-2xl" />
      <div className="pointer-events-none absolute -right-8 -bottom-8 h-32 w-32 rounded-full bg-[#00E0FF]/40 blur-2xl" />
      <Tombola3D
        tokens={members.map((p) => ({
          id: p.id,
          name: p.nickname ?? p.full_name ?? "🐝",
        }))}
        spinning={spinning}
        className="h-full w-full"
      />
      <div className="pointer-events-none absolute inset-x-0 bottom-0 flex flex-col items-center gap-1 bg-gradient-to-t from-[#0B0B1F] via-[#0B0B1F]/70 to-transparent px-3 pb-3 pt-8 text-center">
        <p className="text-2xl text-[#FFD60A] [font-family:'Bangers',system-ui] [letter-spacing:0.1em] [text-shadow:0_2px_0_#FF2E93,0_0_18px_rgba(255,214,10,0.6)]">
          Tómbola del Enjambre
        </p>
        <p className="text-[10px] font-bold uppercase tracking-[0.3em] text-[#00E0FF]">
          Grupos de 4 · Sobrantes al último grupo · Roles automáticos
        </p>
      </div>
    </div>
  );
}
