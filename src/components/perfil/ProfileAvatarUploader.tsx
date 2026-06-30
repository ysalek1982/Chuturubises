import { BadgeCheck, Cake, Camera, Image as ImageIcon, Shirt, Star } from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";

type Props = {
  avatarUrl: string | null | undefined;
  nickname?: string | null;
  fullName?: string | null;
  approvalStatus?: string;
  role?: string | null;
  tshirtSize?: string | null;
  birthDate?: string | null;
  onPick: (file: File) => void;
};

export function ProfileAvatarUploader({
  avatarUrl,
  nickname,
  fullName,
  approvalStatus,
  role,
  tshirtSize,
  birthDate,
  onPick,
}: Props) {
  const statusLabel = approvalStatus === "rejected" ? "Observado" : "Activo";
  const roleLabel = role === "admin" ? "Admin" : role === "treasurer" ? "Tesorero" : "Miembro";
  const roleEyebrow = role === "admin" ? "Comando" : role === "treasurer" ? "Finanzas" : "Fraterno activo";
  const birthLabel = birthDate
    ? new Date(`${birthDate}T12:00:00`).toLocaleDateString("es-BO", { day: "2-digit", month: "short" })
    : "Sin cumple";

  return (
    <section className="chutu-panel relative overflow-hidden rounded-[1.65rem] p-4">
      <div
        aria-hidden
        className="absolute inset-x-0 top-0 h-1 bg-gradient-to-r from-[#FF2E93] via-[#FFD60A] to-[#00E0FF]"
      />
      <div className="flex items-center gap-4">
        <div className="relative shrink-0">
          <div className="absolute inset-0 -m-2 rounded-[2rem] bg-gradient-to-tr from-[#FF2E93] via-[#FFD60A] to-[#00E0FF] opacity-60 blur-md" />
          <Avatar className="relative h-28 w-28 rounded-[1.8rem] border-2 border-[#FFD60A] shadow-[0_0_40px_rgba(255,214,10,0.25)]">
            <AvatarImage src={avatarUrl ?? undefined} className="object-cover" />
            <AvatarFallback className="bg-[#0B0B1F] text-3xl">🐝</AvatarFallback>
          </Avatar>
        </div>

        <div className="min-w-0 flex-1">
          <p className="chutu-eyebrow">{roleEyebrow}</p>
          <h2 className="chutu-display mt-1 truncate text-4xl leading-none text-[#FFD60A]">
            {nickname || fullName || "Fraterno"}
          </h2>
          {nickname && fullName && <p className="truncate text-xs font-bold text-white/55">{fullName}</p>}

          <div className="mt-3 flex flex-wrap gap-2 text-[10px] font-black uppercase tracking-wider">
            <span className="inline-flex items-center gap-1 rounded-full border border-[#FF2E93]/50 bg-[#FF2E93]/12 px-2.5 py-1 text-[#FF7CBC]">
              <Star className="h-3 w-3" /> {roleLabel}
            </span>
            <span className="inline-flex items-center gap-1 rounded-full border border-[#00E0FF]/50 bg-[#00E0FF]/10 px-2.5 py-1 text-[#00E0FF]">
              <BadgeCheck className="h-3 w-3" /> {statusLabel}
            </span>
          </div>
        </div>
      </div>

      <div className="mt-4 grid grid-cols-2 gap-2">
        <div className="rounded-2xl border border-white/10 bg-white/[0.035] p-3">
          <p className="flex items-center gap-1.5 text-[10px] font-black uppercase tracking-widest text-white/45">
            <Cake className="h-3.5 w-3.5 text-[#FFD60A]" /> Cumple
          </p>
          <p className="mt-1 text-sm font-black text-white">{birthLabel}</p>
        </div>
        <div className="rounded-2xl border border-white/10 bg-white/[0.035] p-3">
          <p className="flex items-center gap-1.5 text-[10px] font-black uppercase tracking-widest text-white/45">
            <Shirt className="h-3.5 w-3.5 text-[#00E0FF]" /> Casaca
          </p>
          <p className="mt-1 text-sm font-black text-white">{tshirtSize || "Sin talla"}</p>
        </div>
      </div>

      <div className="mt-3 grid grid-cols-2 gap-2">
        <label className="chutu-primary flex h-11 cursor-pointer items-center justify-center gap-2 rounded-xl text-xs font-black uppercase tracking-widest transition">
          <Camera className="h-4 w-4" /> Cámara
          <input
            type="file"
            accept="image/*"
            capture="environment"
            className="hidden"
            onChange={(e) => e.target.files?.[0] && onPick(e.target.files[0])}
          />
        </label>
        <label className="chutu-outline flex h-11 cursor-pointer items-center justify-center gap-2 rounded-xl text-xs font-black uppercase tracking-widest transition">
          <ImageIcon className="h-4 w-4" /> Galería
          <input
            type="file"
            accept="image/*"
            className="hidden"
            onChange={(e) => e.target.files?.[0] && onPick(e.target.files[0])}
          />
        </label>
      </div>
    </section>
  );
}
