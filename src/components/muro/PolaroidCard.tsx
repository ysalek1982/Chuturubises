import { Heart } from "lucide-react";
import type { Profile } from "@/lib/supabase";

const TAG_COLORS = [
  { bg: "#FF2E93", fg: "#FFFFFF" },
  { bg: "#00E0FF", fg: "#0B0B1F" },
  { bg: "#FFD60A", fg: "#0B0B1F" },
];
const ROTATIONS = ["-rotate-2", "rotate-2", "rotate-1", "-rotate-3", "rotate-3", "-rotate-1"];

type Props = {
  profile: Profile;
  index: number;
  liked: boolean;
  isBirthMonth: boolean;
  onToggleLike: () => void;
};

export function PolaroidCard({ profile, index, liked, isBirthMonth, onToggleLike }: Props) {
  const rot = ROTATIONS[index % ROTATIONS.length];
  const tag = TAG_COLORS[index % TAG_COLORS.length];
  const tagOnRight = index % 2 === 0;
  return (
    <div className={`group relative transform ${rot} transition-transform hover:rotate-0 hover:scale-[1.025]`}>
      <div className="relative border border-black/10 bg-[#fffaf0] p-2 pb-9 shadow-[0_18px_34px_rgba(0,0,0,0.52)]">
        <div
          aria-hidden
          className="absolute -top-3 left-1/2 h-5 w-16 -translate-x-1/2 rotate-[-3deg] border border-black/10 bg-[#FFD60A]/70 shadow-sm"
        />
        <div className="relative aspect-square overflow-hidden bg-neutral-200">
          {profile.avatar_url ? (
            <img
              src={profile.avatar_url}
              alt={profile.nickname}
              loading="lazy"
              className="h-full w-full object-cover transition duration-500 group-hover:scale-105"
            />
          ) : (
            <div className="flex h-full w-full items-center justify-center bg-neutral-300 text-4xl">
              🐝
            </div>
          )}
          <button
            onClick={(e) => {
              e.stopPropagation();
              onToggleLike();
            }}
            className={`absolute bottom-2 right-2 rounded-full p-2 shadow-lg backdrop-blur transition-all ${
              liked
                ? "scale-110 bg-[#FFD60A] text-black"
                : "bg-black/65 text-white/85 hover:bg-black/85"
            }`}
            aria-label="Me gusta"
          >
            <Heart className={`h-4 w-4 ${liked ? "fill-current" : ""}`} />
          </button>
        </div>
        <p className="mt-3 truncate text-center text-[10px] font-black uppercase tracking-[0.12em] text-neutral-700">
          {profile.full_name}
        </p>
      </div>
      <div
        className={`absolute -bottom-3 ${tagOnRight ? "-right-2" : "-left-2"} border-2 border-[#050506] px-3 py-1 text-[9px] font-black italic shadow-lg`}
        style={{ background: tag.bg, color: tag.fg }}
      >
        #{profile.nickname.toUpperCase()}
      </div>
      {isBirthMonth && (
        <div
          className={`absolute -top-4 ${tagOnRight ? "-left-4" : "-right-4"} flex h-10 w-10 animate-bounce items-center justify-center rounded-full border-2 border-[#050506] text-base shadow-lg`}
          style={{ background: tagOnRight ? "#FFD60A" : "#00E0FF", color: "#0B0B1F" }}
          title="¡Cumple este mes!"
        >
          🎂
        </div>
      )}
    </div>
  );
}
