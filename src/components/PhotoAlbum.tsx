import { Link } from "@tanstack/react-router";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  CalendarDays,
  Camera,
  Expand,
  ImagePlus,
  Images,
  Loader2,
  Plus,
  Trash2,
  Upload,
  X,
} from "lucide-react";
import { toast } from "sonner";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { useAuth } from "@/lib/auth";
import { compressImage } from "@/lib/image-compress";
import { supabase, type PhotoAlbumItem, type Profile } from "@/lib/supabase";

type PhotoWithProfile = PhotoAlbumItem & { profile: Profile | null };

type PhotoAlbumProps = {
  compact?: boolean;
  limit?: number;
};

type PhotoGroup = {
  key: string;
  label: string;
  eyebrow: string;
  photos: PhotoWithProfile[];
};

function authorLabel(photo: PhotoWithProfile) {
  return photo.profile?.nickname || photo.profile?.full_name || "Fraterno";
}

function initials(value: string | null | undefined) {
  const text = value?.trim();
  if (!text) return "CH";
  return text
    .split(/\s+/)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase())
    .join("");
}

function storagePathFromPublicUrl(publicUrl: string) {
  try {
    const url = new URL(publicUrl);
    const marker = "/album_photos/";
    const idx = url.pathname.indexOf(marker);
    if (idx === -1) return null;
    return decodeURIComponent(url.pathname.slice(idx + marker.length));
  } catch {
    return null;
  }
}

function boliviaDateKey(value: Date) {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: "America/La_Paz",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(value);
  const year = parts.find((part) => part.type === "year")?.value ?? "2000";
  const month = parts.find((part) => part.type === "month")?.value ?? "01";
  const day = parts.find((part) => part.type === "day")?.value ?? "01";
  return `${year}-${month}-${day}`;
}

function addDaysToKey(key: string, days: number) {
  const [year, month, day] = key.split("-").map(Number);
  const date = new Date(Date.UTC(year ?? 2000, (month ?? 1) - 1, day ?? 1));
  date.setUTCDate(date.getUTCDate() + days);
  return date.toISOString().slice(0, 10);
}

function albumDateLabel(key: string) {
  const today = boliviaDateKey(new Date());
  const yesterday = addDaysToKey(today, -1);
  if (key === today) return "Hoy";
  if (key === yesterday) return "Ayer";

  const [year, month, day] = key.split("-").map(Number);
  const date = new Date(Date.UTC(year ?? 2000, (month ?? 1) - 1, day ?? 1, 12));
  return new Intl.DateTimeFormat("es-BO", {
    timeZone: "America/La_Paz",
    weekday: "long",
    day: "2-digit",
    month: "long",
    year: "numeric",
  }).format(date);
}

function albumDateEyebrow(key: string) {
  const [year, month, day] = key.split("-").map(Number);
  const date = new Date(Date.UTC(year ?? 2000, (month ?? 1) - 1, day ?? 1, 12));
  return new Intl.DateTimeFormat("es-BO", {
    timeZone: "America/La_Paz",
    day: "2-digit",
    month: "short",
  })
    .format(date)
    .replace(".", "");
}

function albumTime(value: string) {
  return new Intl.DateTimeFormat("es-BO", {
    timeZone: "America/La_Paz",
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(value));
}

export function PhotoAlbum({ compact = false, limit = compact ? 8 : undefined }: PhotoAlbumProps) {
  const { user, profile, isAdmin } = useAuth();
  const [photos, setPhotos] = useState<PhotoWithProfile[]>([]);
  const [loading, setLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [active, setActive] = useState<PhotoWithProfile | null>(null);
  const [uploading, setUploading] = useState(false);
  const [caption, setCaption] = useState("");
  const [pending, setPending] = useState<File | null>(null);
  const cameraRef = useRef<HTMLInputElement>(null);
  const galleryRef = useRef<HTMLInputElement>(null);
  const approved = Boolean(user) && profile?.approval_status !== "rejected";
  const pendingPreview = useMemo(() => (pending ? URL.createObjectURL(pending) : null), [pending]);
  const groups = useMemo<PhotoGroup[]>(() => {
    const map = new Map<string, PhotoWithProfile[]>();
    photos.forEach((photo) => {
      const key = boliviaDateKey(new Date(photo.created_at));
      const items = map.get(key) ?? [];
      items.push(photo);
      map.set(key, items);
    });

    return Array.from(map.entries())
      .sort(([left], [right]) => right.localeCompare(left))
      .map(([key, groupPhotos]) => ({
        key,
        label: albumDateLabel(key),
        eyebrow: albumDateEyebrow(key),
        photos: groupPhotos,
      }));
  }, [photos]);

  useEffect(() => {
    return () => {
      if (pendingPreview) URL.revokeObjectURL(pendingPreview);
    };
  }, [pendingPreview]);

  const load = useCallback(async () => {
    setErrorMsg(null);
    try {
      let query = supabase
        .from("photo_album")
        .select("*")
        .order("created_at", { ascending: false });

      if (limit) query = query.limit(limit);

      const { data, error } = await query;
      if (error) throw error;

      const items = (data as PhotoAlbumItem[]) ?? [];
      const ids = Array.from(new Set(items.map((photo) => photo.profile_id).filter(Boolean)));
      let profiles: Profile[] = [];

      if (ids.length) {
        const { data: profs, error: profilesError } = await supabase
          .from("profiles")
          .select("*")
          .in("id", ids);
        if (profilesError) console.warn("No se pudieron cargar autores del album", profilesError);
        profiles = (profs as Profile[]) ?? [];
      }

      setPhotos(
        items.map((item) => ({
          ...item,
          profile: profiles.find((itemProfile) => itemProfile.id === item.profile_id) ?? null,
        })),
      );
    } catch (e) {
      const message = e instanceof Error ? e.message : "No se pudo cargar el album";
      setErrorMsg(message);
    } finally {
      setLoading(false);
    }
  }, [limit]);

  useEffect(() => {
    load();
    const channel = supabase
      .channel(compact ? "photo_album_home_changes" : "photo_album_page_changes")
      .on("postgres_changes", { event: "*", schema: "public", table: "photo_album" }, () => load())
      .subscribe();
    return () => {
      supabase.removeChannel(channel);
    };
  }, [compact, load]);

  const pickPhoto = (file: File | null) => {
    setPending(file);
    if (cameraRef.current) cameraRef.current.value = "";
    if (galleryRef.current) galleryRef.current.value = "";
  };

  const clearPending = () => {
    setPending(null);
    setCaption("");
  };

  const uploadPhoto = async (file: File) => {
    if (!user) return toast.error("Debes iniciar sesion para subir fotos");
    if (!approved) return toast.error("Tu perfil debe estar aprobado para publicar fotos");

    setUploading(true);
    let uploadedPath: string | null = null;
    try {
      const { blob, ext, type } = await compressImage(file, 1400, 0.85);
      const safeExt = ext === "bin" ? "jpg" : ext;
      const path = `${user.id}/${Date.now()}.${safeExt}`;
      const { error: uploadError } = await supabase.storage
        .from("album_photos")
        .upload(path, blob, { contentType: type || "image/jpeg", upsert: false });
      if (uploadError) throw uploadError;
      uploadedPath = path;

      const { data: publicFile } = supabase.storage.from("album_photos").getPublicUrl(path);
      const { error: insertError } = await supabase.from("photo_album").insert({
        profile_id: user.id,
        image_url: publicFile.publicUrl,
        caption: caption.trim() || null,
      });
      if (insertError) throw insertError;

      toast.success("Foto anadida al album");
      clearPending();
      await load();
    } catch (e) {
      if (uploadedPath) await supabase.storage.from("album_photos").remove([uploadedPath]);
      toast.error(e instanceof Error ? e.message : "Error subiendo foto");
    } finally {
      setUploading(false);
    }
  };

  const removePhoto = async (photo: PhotoWithProfile) => {
    if (!confirm("Eliminar esta foto del album?")) return;

    const storagePath = storagePathFromPublicUrl(photo.image_url);
    if (storagePath) await supabase.storage.from("album_photos").remove([storagePath]);

    const { error } = await supabase.from("photo_album").delete().eq("id", photo.id);
    if (error) return toast.error(error.message);

    toast.success("Foto eliminada");
    setActive(null);
    await load();
  };

  const canDeleteActive = Boolean(active && (isAdmin || active.profile_id === user?.id));

  return (
    <section className={compact ? "px-4 pb-8 pt-2" : "px-4 pb-28"}>
      <div className={compact ? "chutu-panel overflow-hidden rounded-[1.55rem]" : ""}>
        <div
          className={
            compact
              ? "border-b border-[#FFD60A]/15 bg-gradient-to-r from-[#FFD60A]/12 via-[#FF2E93]/8 to-[#00E0FF]/10 p-4"
              : "pb-4"
          }
        >
          <div className="flex items-start justify-between gap-3">
            <div>
              <p className="chutu-eyebrow text-[#00E0FF]">Album Chuturubi</p>
              <h3 className="mt-1 text-xl font-black text-white">Fotos de los juntes</h3>
              <p className="mt-1 text-xs font-semibold text-neutral-400">
                Subi recuerdos de turnos, cumpleanos y carnavales.
              </p>
            </div>
            <div className="grid h-11 w-11 shrink-0 place-items-center rounded-2xl bg-[#FFD60A] text-black shadow-[0_0_22px_rgba(255,214,10,0.24)]">
              <Images className="h-5 w-5" />
            </div>
          </div>

          {approved && (
            <div className="mt-3">
              {pending ? (
                <div className="rounded-2xl border border-[#FFD60A]/35 bg-black/35 p-3">
                  <div className="grid grid-cols-[5.25rem_1fr] gap-3">
                    <img
                      src={pendingPreview ?? ""}
                      alt="Vista previa"
                      className="h-24 w-full rounded-xl object-cover"
                    />
                    <div className="min-w-0">
                      <Input
                        value={caption}
                        onChange={(e) => setCaption(e.target.value)}
                        placeholder="Comentario opcional"
                        className="chutu-input h-10 text-xs"
                      />
                      <div className="mt-2 grid grid-cols-[1fr_auto] gap-2">
                        <Button
                          size="sm"
                          onClick={() => uploadPhoto(pending)}
                          disabled={uploading}
                          className="chutu-primary h-9 rounded-xl text-[10px] font-black uppercase tracking-widest"
                        >
                          {uploading ? (
                            <Loader2 className="h-3.5 w-3.5 animate-spin" />
                          ) : (
                            <Upload className="h-3.5 w-3.5" />
                          )}
                          {uploading ? "Subiendo" : "Publicar"}
                        </Button>
                        <Button
                          size="icon"
                          variant="outline"
                          aria-label="Cancelar foto"
                          onClick={clearPending}
                          className="chutu-outline h-9 w-9 rounded-xl"
                        >
                          <X className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="grid grid-cols-2 gap-2">
                  <Button
                    type="button"
                    onClick={() => cameraRef.current?.click()}
                    className="chutu-primary h-10 rounded-xl text-[10px] font-black uppercase tracking-widest"
                  >
                    <Camera className="h-4 w-4" /> Camara
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => galleryRef.current?.click()}
                    className="chutu-outline h-10 rounded-xl text-[10px] font-black uppercase tracking-widest"
                  >
                    <ImagePlus className="h-4 w-4" /> Galeria
                  </Button>
                </div>
              )}
            </div>
          )}
        </div>

        <input
          ref={cameraRef}
          type="file"
          accept="image/*"
          capture="environment"
          className="hidden"
          onChange={(e) => pickPhoto(e.target.files?.[0] ?? null)}
        />
        <input
          ref={galleryRef}
          type="file"
          accept="image/*"
          className="hidden"
          onChange={(e) => pickPhoto(e.target.files?.[0] ?? null)}
        />

        <div className={compact ? "p-3" : ""}>
          {loading ? (
            <div className="grid min-h-28 place-items-center rounded-2xl border border-white/10 bg-black/25">
              <Loader2 className="h-5 w-5 animate-spin text-[#FFD60A]" />
            </div>
          ) : errorMsg ? (
            <div className="rounded-2xl border border-red-500/30 bg-red-500/10 p-5 text-center">
              <p className="text-sm font-bold text-red-200">No se pudo abrir el album</p>
              <p className="mt-1 text-xs text-red-100/80">{errorMsg}</p>
              <Button
                onClick={() => {
                  setLoading(true);
                  load();
                }}
                size="sm"
                className="chutu-primary mt-4 rounded-xl"
              >
                Reintentar
              </Button>
            </div>
          ) : photos.length === 0 ? (
            <div className="rounded-2xl border border-yellow-400/20 bg-neutral-950 p-6 text-center text-sm text-neutral-400">
              Aun no hay fotos. Subi el primer recuerdo del junte.
            </div>
          ) : compact ? (
            <div className="space-y-4">
              {groups.map((group, groupIndex) => (
                <div key={group.key} className="relative">
                  <div className="mb-2 flex items-center justify-between gap-2">
                    <div className="flex min-w-0 items-center gap-2">
                      <span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl border border-[#FFD60A]/35 bg-[#FFD60A]/12 text-[10px] font-black uppercase text-[#FFD60A]">
                        {group.eyebrow}
                      </span>
                      <div className="min-w-0">
                        <p className="truncate text-sm font-black capitalize text-white">
                          {group.label}
                        </p>
                        <p className="text-[10px] font-bold uppercase tracking-widest text-neutral-500">
                          {group.photos.length} foto{group.photos.length === 1 ? "" : "s"}
                        </p>
                      </div>
                    </div>
                    <CalendarDays className="h-4 w-4 shrink-0 text-[#00E0FF]" />
                  </div>
                  <div className="grid grid-cols-4 gap-2">
                    {group.photos.map((photo, index) => {
                      const featured = groupIndex === 0 && index === 0;
                      return (
                        <button
                          key={photo.id}
                          type="button"
                          onClick={() => setActive(photo)}
                          className={`group relative overflow-hidden rounded-xl border border-[#FFD60A]/20 bg-neutral-900 ${
                            featured ? "col-span-2 row-span-2 aspect-square" : "aspect-square"
                          }`}
                        >
                          <img
                            src={photo.image_url}
                            alt={photo.caption ?? "Foto del album"}
                            className="h-full w-full object-cover transition duration-500 group-hover:scale-105"
                            loading="lazy"
                          />
                          <span className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/75 to-transparent px-2 pb-1.5 pt-5 text-left text-[9px] font-black uppercase tracking-wider text-white opacity-0 transition group-hover:opacity-100">
                            @{authorLabel(photo)}
                          </span>
                        </button>
                      );
                    })}
                  </div>
                </div>
              ))}
              <Button
                asChild
                variant="outline"
                className="chutu-outline mt-3 h-10 w-full rounded-xl text-[10px] font-black uppercase tracking-widest"
              >
                <Link to="/galeria">
                  <Expand className="h-4 w-4" /> Ver album completo
                </Link>
              </Button>
            </div>
          ) : (
            <div className="space-y-7">
              {groups.map((group) => (
                <section key={group.key} className="relative">
                  <div className="sticky top-3 z-10 mb-3 rounded-2xl border border-[#FFD60A]/25 bg-neutral-950/90 p-3 shadow-[0_14px_34px_rgba(0,0,0,0.35)] backdrop-blur-xl">
                    <div className="flex items-center justify-between gap-3">
                      <div className="flex min-w-0 items-center gap-3">
                        <div className="grid h-12 w-12 shrink-0 place-items-center rounded-2xl bg-[#FFD60A] text-black">
                          <CalendarDays className="h-5 w-5" />
                        </div>
                        <div className="min-w-0">
                          <p className="chutu-eyebrow text-[#00E0FF]">Subidas el {group.eyebrow}</p>
                          <h4 className="truncate text-lg font-black capitalize text-white">
                            {group.label}
                          </h4>
                        </div>
                      </div>
                      <span className="rounded-full border border-white/10 bg-white/[0.035] px-3 py-1 text-[10px] font-black uppercase tracking-widest text-yellow-200">
                        {group.photos.length} foto{group.photos.length === 1 ? "" : "s"}
                      </span>
                    </div>
                  </div>

                  <div className="columns-2 gap-2 sm:columns-3 [column-fill:_balance]">
                    {group.photos.map((photo) => (
                      <button
                        key={photo.id}
                        type="button"
                        onClick={() => setActive(photo)}
                        className="group relative mb-2 block w-full break-inside-avoid overflow-hidden rounded-xl border border-yellow-400/20 bg-neutral-900 transition-transform hover:scale-[1.02] hover:border-yellow-400/60 hover:shadow-[0_0_20px_rgba(255,196,0,0.25)]"
                      >
                        <img
                          src={photo.image_url}
                          alt={photo.caption ?? "Foto del album"}
                          className="w-full object-cover"
                          loading="lazy"
                        />
                        <span className="absolute bottom-2 left-2 rounded-full bg-black/65 px-2 py-1 text-[10px] font-black text-white opacity-0 backdrop-blur transition group-hover:opacity-100">
                          {albumTime(photo.created_at)}
                        </span>
                      </button>
                    ))}
                  </div>
                </section>
              ))}
            </div>
          )}
        </div>
      </div>

      {!compact && approved && (
        <Button
          type="button"
          onClick={() => galleryRef.current?.click()}
          className="chutu-primary fixed bottom-24 right-5 z-40 h-14 w-14 rounded-full p-0 shadow-[0_0_25px_rgba(255,196,0,0.55)]"
          aria-label="Subir foto al album"
        >
          <Plus className="h-6 w-6" />
        </Button>
      )}

      <Dialog open={!!active} onOpenChange={(open) => !open && setActive(null)}>
        <DialogContent className="max-h-[92dvh] max-w-[min(94vw,42rem)] overflow-hidden border-yellow-400/30 bg-neutral-950 p-0 text-white">
          {active && (
            <div>
              <img
                src={active.image_url}
                alt={active.caption ?? "Foto del album"}
                className="max-h-[68dvh] w-full object-contain bg-black"
              />
              <div className="flex items-center justify-between gap-2 p-3">
                <div className="flex min-w-0 items-center gap-2">
                  <Avatar className="h-10 w-10 border border-yellow-400/50">
                    <AvatarImage
                      src={active.profile?.avatar_url ?? undefined}
                      className="object-cover"
                    />
                    <AvatarFallback className="bg-neutral-800 text-xs font-black text-yellow-400">
                      {initials(authorLabel(active))}
                    </AvatarFallback>
                  </Avatar>
                  <div className="min-w-0">
                    <p className="truncate text-xs font-black text-yellow-300">
                      @{authorLabel(active)}
                    </p>
                    {active.caption && (
                      <p className="mt-0.5 text-xs text-neutral-300">{active.caption}</p>
                    )}
                    <p className="mt-0.5 text-[10px] font-bold uppercase tracking-widest text-neutral-500">
                      {albumDateLabel(boliviaDateKey(new Date(active.created_at)))} -{" "}
                      {albumTime(active.created_at)}
                    </p>
                  </div>
                </div>
                {canDeleteActive && (
                  <Button
                    size="icon"
                    variant="outline"
                    onClick={() => removePhoto(active)}
                    className="h-10 w-10 shrink-0 border-red-500/40 bg-red-500/10 text-red-300 hover:bg-red-500/20 hover:text-red-200"
                    aria-label="Eliminar foto"
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                )}
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </section>
  );
}
