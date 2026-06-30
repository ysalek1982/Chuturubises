import { Star } from "lucide-react";

export function StarsRow({ value, count }: { value: number; count: number }) {
  return (
    <div className="flex items-center gap-1.5 rounded-full border border-[#FFD60A]/50 bg-[#FFD60A]/10 px-2.5 py-1">
      <Star className="h-3.5 w-3.5 fill-[#FFD60A] text-[#FFD60A] drop-shadow-[0_0_6px_rgba(255,214,10,0.8)]" />
      <span className="text-xs font-black text-[#FFD60A]">{value.toFixed(1)}</span>
      <span className="text-[10px] text-white/60">({count})</span>
    </div>
  );
}
